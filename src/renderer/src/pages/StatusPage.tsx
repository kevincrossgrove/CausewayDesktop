import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppSnapshot } from '@shared/types'
import CopyButton from '../components/CopyButton'
import { isValidPeerName, sanitizePeerName } from '@shared/peerInput'
import { Button, controlClass, cx, Notice, SplitControl, StatStrip } from '../ui'

function initialShareName(snapshot: AppSnapshot): string {
  return (
    sanitizePeerName(snapshot.settings.shareName || '') ||
    sanitizePeerName(snapshot.suggestedPeerName || '') ||
    'my-computer'
  )
}

function displayMode(mode: string | null | undefined, fallback: string): string {
  const value = mode || fallback
  if (value === 'wireguard') return 'WireGuard'
  if (value === 'data-channels') return 'DataChannels'
  return value
}

export default function StatusPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const fallbackName = sanitizePeerName(snapshot.suggestedPeerName || '') || 'my-computer'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareName, setShareName] = useState(() => initialShareName(snapshot))
  const shareNameRef = useRef(shareName)
  const savedShareName = useRef(snapshot.settings.shareName)
  const saveTimer = useRef<number | null>(null)
  shareNameRef.current = shareName
  const running = snapshot.daemon.running
  const starting = busy || snapshot.daemon.starting
  const localId = snapshot.status?.localId ?? null
  const safeName = isValidPeerName(shareName) ? shareName : fallbackName
  const addPeerCommand = useMemo(() => {
    if (!localId) return ''
    return `cwp2p peer add ${safeName} ${localId}`
  }, [localId, safeName])

  function persistShareName(name: string): void {
    if (!isValidPeerName(name) || name === savedShareName.current) return
    savedShareName.current = name
    void window.causeway.setShareName(name)
  }

  function onShareNameChange(value: string): void {
    const next = sanitizePeerName(value)
    setShareName(next)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => persistShareName(next), 400)
  }

  useEffect(() => {
    persistShareName(shareNameRef.current)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      persistShareName(shareNameRef.current)
    }
  }, [])

  async function start(): Promise<void> {
    setBusy(true)
    setError(null)
    const result = await window.causeway.start()
    if (!result.ok) setError(result.error ?? 'Could not start Causeway.')
    onChange(await window.causeway.refresh())
    setBusy(false)
  }

  async function stop(): Promise<void> {
    setBusy(true)
    await window.causeway.stop()
    onChange(await window.causeway.getSnapshot())
    setBusy(false)
  }

  const statusLabel = starting && !running ? 'Starting' : running ? 'Running' : 'Stopped'
  const headline = running ? 'Causeway is on.' : 'Causeway is off.'

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-start justify-between gap-5 @min-[640px]:flex-row">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[13px] text-muted">
            <span
              className={cx(
                'size-2 rounded-full',
                running ? 'bg-ok' : starting ? 'bg-warn' : 'bg-faint'
              )}
            />
            {statusLabel}
          </div>
          <h2 className="m-0 text-[2.6rem] font-bold leading-none tracking-tight">{headline}</h2>
          <p className="mt-4 mb-0 max-w-[40ch] text-[15px] leading-relaxed text-muted">
            Start it to get an ID you can share. The other person adds you with it, and you add them
            the same way.
          </p>
        </div>
        {running ? (
          <Button variant="danger" className="px-5 py-2.5" disabled={busy} onClick={() => void stop()}>
            Stop Causeway
          </Button>
        ) : (
          <Button
            variant="primary"
            className="px-5 py-2.5"
            disabled={starting}
            onClick={() => void start()}
          >
            {starting ? 'Starting…' : 'Start Causeway'}
          </Button>
        )}
      </div>

      {(error || snapshot.daemon.lastError || snapshot.status?.recoveryWarning) && (
        <div className="flex flex-col gap-1.5">
          {error && <Notice>{error}</Notice>}
          {snapshot.daemon.lastError && <Notice>{snapshot.daemon.lastError}</Notice>}
          {snapshot.status?.recoveryWarning && (
            <Notice tone="warn">{snapshot.status.recoveryWarning}</Notice>
          )}
        </div>
      )}

      <StatStrip
        items={[
          {
            label: 'Peers',
            value: `${snapshot.status?.connectedPeers ?? '0'} of ${snapshot.status?.totalPeers ?? '0'} connected`
          },
          {
            label: 'Active nodes',
            value: running ? (snapshot.status?.nodeCount ?? '—') : 'Not running'
          },
          {
            label: 'NAT',
            value: running ? (snapshot.status?.nat ?? '—') : 'Not running'
          },
          {
            label: 'Public endpoint',
            value: running ? (snapshot.status?.publicEndpoint ?? '—') : 'Not running'
          },
          {
            label: 'Mode',
            value: displayMode(snapshot.status?.mode, snapshot.settings.connectionMode)
          },
          {
            label: 'CLI',
            value: snapshot.version ?? '—'
          }
        ]}
      />

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Your NetcoreNetwork ID</h3>
        <p className="mt-1.5 mb-0 text-sm leading-relaxed text-muted">
          Give this to anyone who should add you as a peer.
        </p>
        <div className="mt-4 flex min-w-0 items-center overflow-hidden rounded-xl border border-line bg-bg">
          <code
            className={cx(
              'min-w-0 flex-1 truncate bg-transparent px-3.5 py-2.5 font-mono text-[13px] tracking-normal',
              localId ? 'text-ink' : 'text-faint'
            )}
            title={localId ?? undefined}
          >
            {localId ?? 'XXXX-XXXX-XXXX-XXXX-XXXX'}
          </code>
          <div className="pr-1.5">
            <CopyButton value={localId ?? ''} label="Copy ID" disabled={!localId} />
          </div>
        </div>
        {!localId && (
          <p className="mt-2 mb-0 text-sm text-muted">Appears once Causeway is running.</p>
        )}
      </section>

      <section className="flex flex-col gap-4 @min-[760px]:flex-row @min-[760px]:items-start">
        <div className="w-[13.5rem] shrink-0">
          <h3 className="m-0 text-[15px] font-semibold">Add-me command</h3>
          <p className="mt-1.5 mb-0 text-sm leading-relaxed text-muted">
            They run this on their machine to add you.
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <SplitControl label="Name they will see">
            <input
              className={cx(controlClass, 'rounded-none border-0 bg-transparent py-2.5')}
              value={shareName}
              onChange={(event) => onShareNameChange(event.target.value)}
              onBlur={() => persistShareName(shareName)}
              placeholder="home-server"
              title="Letters, numbers, periods, hyphens, and underscores. No spaces."
              spellCheck={false}
            />
          </SplitControl>
          <div className="flex min-w-0 items-center overflow-hidden rounded-xl border border-line bg-bg">
            <code className="min-w-0 flex-1 truncate bg-transparent px-3.5 py-2.5 text-[13px] text-muted">
              {addPeerCommand || 'Start Causeway to build this command.'}
            </code>
            <div className="pr-1.5">
              <CopyButton value={addPeerCommand} disabled={!addPeerCommand} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
