import { useEffect, useState, type FormEvent } from 'react'
import type { AppSnapshot, ListeningPort } from '@shared/types'
import CopyButton from '../components/CopyButton'
import { Button, CardLabel, controlClass, Field, Notice, PageHeader, PortChip, tdClass, thClass } from '../ui'

export default function PortsPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [peer, setPeer] = useState(snapshot.peers[0]?.name ?? '')
  const [mapping, setMapping] = useState('')
  const [allowPort, setAllowPort] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState<ListeningPort[]>([])
  const dataChannels = snapshot.settings.connectionMode === 'data-channels'

  useEffect(() => {
    if (!peer && snapshot.peers[0]) {
      setPeer(snapshot.peers[0].name || snapshot.peers[0].id)
    }
  }, [peer, snapshot.peers])

  useEffect(() => {
    void window.causeway.listeningPorts().then(setListening).catch(() => setListening([]))
    const timer = window.setInterval(() => {
      void window.causeway.listeningPorts().then(setListening).catch(() => setListening([]))
    }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  async function addMapping(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    const result = await window.causeway.addPeerPort(peer, mapping)
    if (!result.ok) setError(result.error ?? result.stderr ?? 'Could not add mapping.')
    else setMapping('')
    onChange(await window.causeway.refresh())
  }

  async function removeMapping(idOrName: string, value: string): Promise<void> {
    const result = await window.causeway.removePeerPort(idOrName, value)
    if (!result.ok) setError(result.error ?? result.stderr ?? 'Could not remove mapping.')
    onChange(await window.causeway.refresh())
  }

  async function addAllowList(event: FormEvent): Promise<void> {
    event.preventDefault()
    const result = await window.causeway.addAllowedPort(allowPort)
    if (!result.ok) setError(result.error ?? result.stderr ?? 'Could not allow that port.')
    else setAllowPort('')
    onChange(await window.causeway.refresh())
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Ports"
        description="Map a local TCP port to a port on the other machine. After it is open, the remote service is available at 127.0.0.1 on your local port."
      />

      <form className="flex flex-col gap-4" onSubmit={(event) => void addMapping(event)}>
        <div>
          <h3 className="m-0 text-[15px] font-semibold">Open a mapping</h3>
          <p className="mt-2 mb-0 max-w-[62ch] text-sm leading-relaxed text-muted">
            A mapping is <code>local-port:remote-port</code>. This computer listens on the local port
            and forwards that TCP traffic to the remote port on the peer. Example: <code>8080:80</code>{' '}
            means you open <code>http://127.0.0.1:8080</code> and Causeway sends it to port 80 on the
            other machine. Click a listening app to fill <code>port:port</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Peer">
            <select className={controlClass} value={peer} onChange={(event) => setPeer(event.target.value)} required>
              <option value="">Select a peer</option>
              {snapshot.peers.map((item) => (
                <option key={item.id || item.name} value={item.name || item.id}>
                  {item.name || item.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="local-port:remote-port">
            <input
              className={controlClass}
              value={mapping}
              onChange={(event) => setMapping(event.target.value)}
              placeholder="8080:80"
              required
            />
          </Field>
          <Button variant="primary" className="px-5 py-2.5" disabled={!snapshot.daemon.running}>
            Add mapping
          </Button>
        </div>
        <p className="m-0 text-sm text-muted">
          Local ports must be unique across every peer. You can add a peer first and open ports later.
        </p>
        {error && <Notice>{error}</Notice>}
        {listening.length > 0 && (
          <div>
            <CardLabel>Listening on this computer</CardLabel>
            <div className="flex flex-wrap gap-2">
              {listening.map((item) => {
                const value = `${item.port}:${item.port}`
                return (
                  <PortChip
                    key={`${item.processName}-${item.port}`}
                    selected={mapping === value}
                    onClick={() => setMapping(value)}
                    port={item.port}
                    detail={`${item.processName} · ${item.address}`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </form>

      <section>
        {snapshot.peers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-7 py-10 text-center text-sm text-muted">
            Add a peer before opening ports.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Peer</th>
                  <th className={thClass}>Mapping</th>
                  <th className={thClass}>Open locally</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {snapshot.peers.flatMap((item) =>
                  item.mappings.length === 0
                    ? [
                        <tr key={`${item.name}-none`}>
                          <td className={tdClass}>{item.name}</td>
                          <td colSpan={3} className={`${tdClass} text-muted`}>
                            No mappings yet
                          </td>
                        </tr>
                      ]
                    : item.mappings.map((port) => {
                        const value = `${port.localPort}:${port.remotePort}`
                        const url = `http://127.0.0.1:${port.localPort}`
                        return (
                          <tr key={`${item.name}-${value}`}>
                            <td className={tdClass}>{item.name}</td>
                            <td className={`${tdClass} font-mono text-xs`}>{value}</td>
                            <td className={`${tdClass} font-mono text-xs`}>{url}</td>
                            <td className={tdClass}>
                              <div className="flex flex-wrap gap-2">
                                <CopyButton value={url} label="Copy URL" />
                                <Button
                                  variant="danger"
                                  onClick={() => void removeMapping(item.name || item.id, value)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form onSubmit={(event) => void addAllowList(event)}>
        <h3 className="m-0 text-[15px] font-semibold">Allow a local port</h3>
        <p className="mt-2 mb-4 max-w-[52ch] text-sm leading-relaxed text-muted">
          WireGuard mode uses <code>cwp2p port add</code> as an allow-list. DataChannel mappings do not
          need this.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Port" className="max-w-48">
            <input
              className={controlClass}
              value={allowPort}
              onChange={(event) => setAllowPort(event.target.value)}
              placeholder="8080"
              disabled={dataChannels}
            />
          </Field>
          <Button disabled={dataChannels || !snapshot.daemon.running}>Allow port</Button>
        </div>
        {dataChannels && (
          <p className="mt-3 mb-0 text-sm text-muted">You are in DataChannel mode, so this allow-list is skipped.</p>
        )}
      </form>
    </div>
  )
}
