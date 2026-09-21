import { useEffect, useState } from 'react'
import type { AppSnapshot, PageId } from '@shared/types'
import Sidebar from './components/Sidebar'
import SetupWizard from './components/SetupWizard'
import StatusPage from './pages/StatusPage'
import PeersPage from './pages/PeersPage'
import PortsPage from './pages/PortsPage'
import ConnectionPage from './pages/ConnectionPage'
import TerminalPage from './pages/TerminalPage'
import LearnPage from './pages/LearnPage'
import SettingsPage from './pages/SettingsPage'
import { applyAppearance, watchSystemAppearance } from './theme'
import { BrandMark, ChevronIcon, LogBlock } from './ui'
import { Button } from '@/components/ui/button'

export default function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [page, setPage] = useState<PageId>('status')
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
        <p>Loading…</p>
      </div>
    )
  }

  if (blockedByOtherCwp2p(snapshot)) {
    return <OtherCwp2pBlock snapshot={snapshot} onChange={setSnapshot} />
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
      />
      <div className="flex min-h-0 min-w-0 flex-col">
        <main
          className={
            page === 'terminal'
              ? '@container flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-6 py-7 desk:px-10 desk:py-8'
              : '@container min-w-0 flex-1 overflow-auto px-6 py-7 desk:px-10 desk:py-8'
          }
        >
          {page === 'status' && <StatusPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'peers' && <PeersPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'ports' && <PortsPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'connection' && <ConnectionPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'terminal' && <TerminalPage snapshot={snapshot} onChange={setSnapshot} />}
          {page === 'learn' && <LearnPage snapshot={snapshot} />}
          {page === 'settings' && <SettingsPage snapshot={snapshot} onChange={setSnapshot} />}
        </main>
        <DaemonFooter snapshot={snapshot} />
      </div>
    </div>
  )
}

function blockedByOtherCwp2p(snapshot: AppSnapshot): boolean {
  return snapshot.daemon.otherCwp2pPids.length > 0 && !snapshot.daemon.running && !snapshot.daemon.starting
}

function howToStopOtherCwp2p(platform: AppSnapshot['platform']): string {
  if (platform === 'win32') {
    return 'Press Ctrl+C in that terminal, or end cwp2p.exe in Task Manager.'
  }
  if (platform === 'darwin') {
    return 'Press Control-C in that Terminal window, or quit cwp2p in Activity Monitor.'
  }
  return 'Press Control-C in that terminal, or stop the cwp2p process.'
}

function OtherCwp2pBlock({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const pids = snapshot.daemon.otherCwp2pPids
  const pidLabel =
    pids.length === 1 ? `Process ID ${pids[0]}.` : `Process IDs ${pids.join(', ')}.`

  async function recheck(): Promise<void> {
    onChange(await window.causeway.refresh())
  }

  return (
    <div className="flex min-h-full flex-col items-start gap-8 p-6 desk:p-10">
      <header className="flex items-start gap-3">
        <BrandMark className="mt-0.5 size-10 rounded-xl" />
        <div>
          <h1 className="m-0 text-[17px] font-bold tracking-tight">Causeway</h1>
          <p className="mt-1 text-sm leading-snug">A graphical wrapper around the official CLI</p>
        </div>
      </header>
      <div>
        <h2 className="m-0 text-[2.6rem] font-bold leading-none tracking-tight">
          Causeway is already running.
        </h2>
        <p className="mt-4 mb-0 max-w-[46ch] text-[15px] leading-relaxed">
          This app cannot start while {snapshot.binaryName} is running somewhere else on this computer,
          for example in Terminal. Stop that process first, then you can use Causeway Desktop.
        </p>
        <p className="mt-3 mb-0 max-w-[46ch] text-[15px] leading-relaxed">{howToStopOtherCwp2p(snapshot.platform)}</p>
        <p className="mt-3 mb-0 text-sm text-faint">{pidLabel}</p>
      </div>
      <Button className="px-5" onClick={() => void recheck()}>
        Check again
      </Button>
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
          <span className="truncate text-[13px]">{lastLog}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3 text-[13px]">
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
            <p className="m-0 text-[13px]">Status will show here once the command socket is ready.</p>
          )}
        </div>
      )}
    </footer>
  )
}
