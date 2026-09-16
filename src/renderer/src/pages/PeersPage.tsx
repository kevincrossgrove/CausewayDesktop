import { useEffect, useState, type FormEvent } from 'react'
import type { AppSnapshot, ListeningPort } from '@shared/types'
import { mappingsError, peerIdError, peerNameError, sanitizePeerName } from '@shared/peerInput'
import CopyButton from '../components/CopyButton'
import { Button, CardLabel, controlClass, Field, Notice, PageHeader, PortChip, tdClass, thClass } from '../ui'

function toggleMapping(current: string, mapping: string): string {
  const parts = current
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (parts.includes(mapping)) {
    return parts.filter((item) => item !== mapping).join(',')
  }
  return [...parts, mapping].join(',')
}

export default function PeersPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [peerId, setPeerId] = useState('')
  const [mappings, setMappings] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState<ListeningPort[]>([])

  useEffect(() => {
    void window.causeway.listeningPorts().then(setListening).catch(() => setListening([]))
    const timer = window.setInterval(() => {
      void window.causeway.listeningPorts().then(setListening).catch(() => setListening([]))
    }, 4000)
    return () => window.clearInterval(timer)
  }, [])

  async function addPeer(event: FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const nameProblem = peerNameError(name)
    const idProblem = peerIdError(peerId)
    const mappingProblem = mappingsError(mappings)
    if (nameProblem || idProblem || mappingProblem) {
      setError(nameProblem ?? idProblem ?? mappingProblem)
      setBusy(false)
      return
    }
    const result = await window.causeway.addPeer(name, peerId, mappings)
    if (!result.ok) setError(result.error ?? result.stderr ?? 'Could not add peer.')
    else {
      setName('')
      setPeerId('')
      setMappings('')
    }
    onChange(await window.causeway.refresh())
    setBusy(false)
  }

  async function removePeer(idOrName: string): Promise<void> {
    if (!window.confirm(`Remove peer ${idOrName}?`)) return
    setBusy(true)
    const result = await window.causeway.removePeer(idOrName)
    if (!result.ok) setError(result.error ?? result.stderr ?? 'Could not remove peer.')
    onChange(await window.causeway.refresh())
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Peers"
        description="Exchange the ID from Status. Add the other machine here with a short name. Both sides must use the same connection mode."
      />

      {!snapshot.daemon.running && (
        <Notice tone="warn">Start Causeway on the Status page first.</Notice>
      )}

      <form className="flex flex-col gap-4" onSubmit={(event) => void addPeer(event)}>
        <div>
          <h3 className="m-0 text-[15px] font-semibold">Add a peer</h3>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Name">
              <input
                className={controlClass}
                value={name}
                onChange={(event) => setName(sanitizePeerName(event.target.value))}
                placeholder="home-server"
                required
                pattern="[A-Za-z0-9._-]+"
                title="Letters, numbers, periods, hyphens, and underscores. No spaces."
                spellCheck={false}
              />
            </Field>
            <Field label="Peer ID">
              <input
                className={controlClass}
                value={peerId}
                onChange={(event) => setPeerId(event.target.value.trim().toLowerCase())}
                placeholder="64-character hex ID"
                minLength={64}
                maxLength={64}
                pattern="[0-9a-f]{64}"
                title="64 lowercase hex characters"
                required
                spellCheck={false}
              />
            </Field>
            <Button variant="primary" className="px-5 py-2.5" disabled={busy || !snapshot.daemon.running}>
              Add peer
            </Button>
          </div>
          {error && <div className="mt-3"><Notice>{error}</Notice></div>}
        </div>
      </form>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="m-0 text-[15px] font-semibold">Port mappings</h3>
          <p className="mt-2 mb-0 max-w-[62ch] text-sm leading-relaxed">
            A mapping is <code>local-port:remote-port</code>. After the peer is connected, this computer
            listens on the local port and forwards that TCP traffic to the remote port on the other
            machine. Example: <code>8080:80</code> means you open <code>http://127.0.0.1:8080</code> and
            Causeway sends it to port 80 on the peer.
          </p>
        </div>
        <p className="m-0 max-w-[62ch] text-sm leading-relaxed">
          Local ports must be unique across every peer. You can add a peer first and open ports later.
          Click a listening app below to add <code>port:port</code> if that service is running on the
          other machine too, or type a mapping by hand.
        </p>
        <Field label="Mappings to include when you add the peer">
          <input
            className={controlClass}
            value={mappings}
            onChange={(event) => setMappings(event.target.value.replace(/\s/g, ''))}
            placeholder="8080:80,3000:3000"
            spellCheck={false}
          />
        </Field>
        <div>
          <CardLabel>Listening on this computer</CardLabel>
          {listening.length === 0 ? (
            <p className="m-0 text-sm">No localhost TCP listeners found right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {listening.map((item) => {
                const mapping = `${item.port}:${item.port}`
                const selected = mappings
                  .split(',')
                  .map((part) => part.trim())
                  .includes(mapping)
                return (
                  <PortChip
                    key={`${item.processName}-${item.port}`}
                    selected={selected}
                    onClick={() => setMappings((current) => toggleMapping(current, mapping))}
                    port={item.port}
                    detail={`${item.processName} · ${item.address}`}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section>
        {snapshot.peers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-7 py-10 text-center text-sm">
            No peers yet. Copy your ID on Status, send it to the other person, and add theirs here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>RTT</th>
                  <th className={thClass}>Mappings</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {snapshot.peers.map((peer) => (
                  <tr key={peer.id || peer.name}>
                    <td className={tdClass}>
                      <strong>{peer.name}</strong>
                      <div className="mt-1 font-mono text-xs break-all">{peer.id}</div>
                      {peer.needsReAdd && <div className="mt-1 text-warn">Needs to be added again</div>}
                    </td>
                    <td className={tdClass}>{peer.status ?? '—'}</td>
                    <td className={tdClass}>{peer.connectionType ?? '—'}</td>
                    <td className={tdClass}>{peer.rtt ?? '—'}</td>
                    <td className={tdClass}>
                      {peer.mappings.length === 0
                        ? '—'
                        : peer.mappings.map((mapping) => `${mapping.localPort}:${mapping.remotePort}`).join(', ')}
                    </td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-2">
                        {peer.id && <CopyButton value={peer.id} label="Copy ID" />}
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => void removePeer(peer.name || peer.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {snapshot.peersRaw && !/no such file or directory/i.test(snapshot.peersRaw) && (
        <section>
          <h3 className="mb-3 text-[15px] font-semibold">cwp2p peer list</h3>
          <pre className="whitespace-pre-wrap break-words font-mono text-xs">{snapshot.peersRaw}</pre>
        </section>
      )}
    </div>
  )
}
