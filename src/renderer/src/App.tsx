import { useEffect, useState } from 'react'
import type { AppSnapshot, PageId } from '@shared/types'
import Sidebar from './components/Sidebar'
import SetupWizard from './components/SetupWizard'
import SettingsPanel from './components/SettingsPanel'
import StatusPage from './pages/StatusPage'
import PeersPage from './pages/PeersPage'
import PortsPage from './pages/PortsPage'
import ConnectionPage from './pages/ConnectionPage'
import LearnPage from './pages/LearnPage'
import { applyAppearance, watchSystemAppearance } from './theme'
import { ChevronIcon, LogBlock } from './ui'

export default function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [page, setPage] = useState<PageId>('status')
  const [showSettings, setShowSettings] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.causeway) {
      setLoadError('Open Causeway Desktop from the app window.')
      return
    }
    let cancelled = false
    void window.causeway
      .getSnapshot()
      .then((next) => {
        if (!cancelled) setSnapshot(next)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error))
      })
    const unsubscribe = window.causeway.onSnapshot((next) => setSnapshot(next))
    const timer = window.setInterval(() => {
      void window.causeway.refresh().then(setSnapshot)
    }, 2500)
    return () => {
      cancelled = true
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!snapshot) return
    applyAppearance(snapshot.settings.appearance)
    return watchSystemAppearance(() => snapshot.settings.appearance)
  }, [snapshot?.settings.appearance])

  if (loadError) {
    return (
      <div className="p-8">
        <h2 className="m-0 text-[2rem] font-bold tracking-tight">Causeway Desktop failed to load</h2>
        <p className="mt-3 text-danger">{loadError}</p>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="p-8">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (!snapshot.settings.causewayFolder || !snapshot.binaryPath) {
    return <SetupWizard snapshot={snapshot} onConnected={setSnapshot} />
  }

  return (
    <div className="grid h-full min-h-0 overflow-hidden grid-cols-1 grid-rows-[auto_minmax(0,1fr)] desk:grid-cols-[14.5rem_minmax(0,1fr)] desk:grid-rows-[minmax(0,1fr)]">
      <Sidebar
        page={page}
        onPage={setPage}
        running={snapshot.daemon.running}
        folder={snapshot.settings.causewayFolder}
        appearance={snapshot.settings.appearance}
        onChangeFolder={() =>
          void window.causeway.pickFolder().then(() => window.causeway.getSnapshot().then(setSnapshot))
        }
        onAppearance={(appearance) => void window.causeway.setAppearance(appearance).then(setSnapshot)}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((value) => !value)}
      />
      <div className="flex min-h-0 min-w-0 flex-col">
        <main className="@container min-w-0 flex-1 overflow-auto px-6 py-7 desk:px-10 desk:py-8">
          {showSettings && <SettingsPanel snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'status' && <StatusPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'peers' && <PeersPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'ports' && <PortsPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'connection' && <ConnectionPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'learn' && <LearnPage snapshot={snapshot} />}
        </main>
        <DaemonFooter snapshot={snapshot} />
      </div>
    </div>
  )
}

function DaemonFooter({ snapshot }: { snapshot: AppSnapshot }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const lastLog = snapshot.daemon.logs.at(-1) || 'No output yet.'
  const socketReady = Boolean(snapshot.statusRaw) && !/no such file or directory/i.test(snapshot.statusRaw)
  const socketLabel = snapshot.daemon.running
    ? socketReady
      ? 'CWP2P: connected'
      : 'CWP2P: waiting for command socket'
    : 'CWP2P: waiting for command socket'

  return (
    <footer className="shrink-0 border-t border-line bg-bg">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-3 text-left desk:px-10"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <strong className="text-[13px] font-semibold">Daemon log</strong>
          <span className="truncate text-[13px] text-muted">{lastLog}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3 text-[13px] text-muted">
          {socketLabel}
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-6 py-4 desk:px-10">
          <LogBlock>{snapshot.daemon.logs.join('\n') || 'No log output yet.'}</LogBlock>
          {socketReady ? (
            <LogBlock>{snapshot.statusRaw}</LogBlock>
          ) : (
            <p className="m-0 text-[13px] text-muted">Status will show here once the command socket is ready.</p>
          )}
        </div>
      )}
    </footer>
  )
}
