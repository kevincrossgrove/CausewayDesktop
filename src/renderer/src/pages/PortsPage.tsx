import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { AppSnapshot, ListeningPort, ParsedPeer } from '@shared/types'
import { formatCliError, formatMapping, parseOneMapping } from '@shared/peerInput'
import CopyButton from '../components/CopyButton'
import { Notice, PageHeader } from '../ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

function suggestedGuestMapping(peers: ParsedPeer[]): string {
  const used = new Set(peers.flatMap((peer) => peer.mappings.map((mapping) => Number(mapping.localPort))))
  let local = 3000
  while (used.has(local)) local += 1
  return `${local}:3000`
}

function localhostUrl(port: string | number): string {
  return `http://127.0.0.1:${port}`
}

type SharedUrlRow = {
  key: string
  url: string
  port: number
  youShare: true
  sharedBy: 'You'
  detail: string
}

type PeerUrlRow = {
  key: string
  url: string
  port: number
  youShare: false
  sharedBy: string
  detail: string
  mapping: string
  peerIdOrName: string
}

type LocalUrlRow = SharedUrlRow | PeerUrlRow

function localUrlRows(
  listening: ListeningPort[],
  peers: ParsedPeer[],
  openPortsForPeers: number[]
): LocalUrlRow[] {
  const mappedLocal = new Set(
    peers.flatMap((peer) => peer.mappings.map((mapping) => Number(mapping.localPort)))
  )
  const rows: LocalUrlRow[] = []

  for (const peer of peers) {
    const idOrName = peer.name || peer.id
    for (const mapping of peer.mappings) {
      rows.push({
        key: `${idOrName}-${mapping.localPort}-${mapping.remotePort}`,
        url: localhostUrl(mapping.localPort),
        port: Number(mapping.localPort),
        youShare: false,
        sharedBy: peer.name || 'Peer',
        detail: `${mapping.localPort} → ${mapping.remotePort} on ${peer.name || 'peer'}`,
        mapping: formatMapping(mapping),
        peerIdOrName: idOrName
      })
    }
  }

  const listeningPorts = new Set<number>()
  for (const item of listening) {
    if (mappedLocal.has(item.port)) continue
    listeningPorts.add(item.port)
    const openForPeers = openPortsForPeers.includes(item.port)
    rows.push({
      key: `you-${item.port}-${item.processName}`,
      url: localhostUrl(item.port),
      port: item.port,
      youShare: true,
      sharedBy: 'You',
      detail: openForPeers
        ? `${item.processName} on this computer · open for peers`
        : `${item.processName} on this computer`
    })
  }

  for (const port of openPortsForPeers) {
    if (mappedLocal.has(port) || listeningPorts.has(port)) continue
    rows.push({
      key: `open-for-peers-${port}`,
      url: localhostUrl(port),
      port,
      youShare: true,
      sharedBy: 'You',
      detail: 'open for peers · nothing listening yet'
    })
  }

  return rows.sort((a, b) => a.port - b.port || Number(a.youShare) - Number(b.youShare))
}

export default function PortsPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [peer, setPeer] = useState(snapshot.peers[0]?.name ?? '')
  const [mapping, setMapping] = useState(() => suggestedGuestMapping(snapshot.peers))
  const [peerPort, setPeerPort] = useState('3000')
  const [error, setError] = useState<string | null>(null)
  const [okMessage, setOkMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState<ListeningPort[]>([])
  const dataChannels = snapshot.settings.connectionMode === 'data-channels'
  const selectedPeer = snapshot.peers.find((item) => (item.name || item.id) === peer)
  const peerLabel = selectedPeer?.name || 'the peer'
  const urls = useMemo(
    () => localUrlRows(listening, snapshot.peers, snapshot.allowedPorts ?? []),
    [listening, snapshot.peers, snapshot.allowedPorts]
  )
  const hasPeerMappings = snapshot.peers.some((item) => item.mappings.length > 0)

  async function refreshAfterChange(): Promise<AppSnapshot> {
    const next = await window.causeway.refresh()
    onChange(next)
    try {
      setListening(await window.causeway.listeningPorts())
    } catch {
      setListening([])
    }
    return next
  }

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
    setOkMessage(null)
    const parsed = parseOneMapping(mapping)
    if (!parsed) {
      setError('Use listen-here:port-on-peer, like 3000:3000.')
      return
    }
    setBusy(true)
    try {
      const result = await window.causeway.addPeerPort(peer, formatMapping(parsed))
      const next = await refreshAfterChange()
      if (!result.ok) setError(formatCliError(result, 'Could not add mapping.'))
      else {
        setMapping(suggestedGuestMapping(next.peers))
        setOkMessage(
          `Added ${localhostUrl(parsed.localPort)}, shared by ${peerLabel}. It should appear in the list above.`
        )
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add mapping.')
    }
    setBusy(false)
  }

  async function removeMapping(idOrName: string, value: string): Promise<void> {
    setError(null)
    setOkMessage(null)
    setBusy(true)
    try {
      const result = await window.causeway.removePeerPort(idOrName, value)
      if (!result.ok) setError(formatCliError(result, 'Could not remove mapping.'))
      else setOkMessage(`Removed ${localhostUrl(value.split(':')[0] ?? '')}.`)
      await refreshAfterChange()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove mapping.')
    }
    setBusy(false)
  }

  async function clearPeerMappings(): Promise<void> {
    setError(null)
    setOkMessage(null)
    setBusy(true)
    let lastError: string | null = null
    try {
      for (const item of snapshot.peers) {
        const idOrName = item.name || item.id
        for (const port of item.mappings) {
          const result = await window.causeway.removePeerPort(idOrName, formatMapping(port))
          if (!result.ok) lastError = formatCliError(result, 'Could not remove mapping.')
        }
      }
      if (lastError) setError(lastError)
      else setOkMessage('Cleared mappings on this computer.')
      await refreshAfterChange()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove mapping.')
    }
    setBusy(false)
  }

  async function openPortForPeers(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    setOkMessage(null)
    setBusy(true)
    try {
      const result = await window.causeway.addAllowedPort(peerPort)
      if (!result.ok) setError(formatCliError(result, 'Could not open that port for peers.'))
      else setOkMessage(`Port ${peerPort} is open for peers.`)
      await refreshAfterChange()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open that port for peers.')
    }
    setBusy(false)
  }

  async function openListedPortForPeers(port: number): Promise<void> {
    setPeerPort(String(port))
    setError(null)
    setOkMessage(null)
    setBusy(true)
    try {
      const result = await window.causeway.addAllowedPort(String(port))
      if (!result.ok) setError(formatCliError(result, 'Could not open that port for peers.'))
      else setOkMessage(`Port ${port} is open for peers.`)
      await refreshAfterChange()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open that port for peers.')
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Ports"
        description="Share an app that already runs on localhost. Do the host steps on the computer running the app, and the guest steps on the computer that wants to open it."
      />

      {error && <Notice>{error}</Notice>}
      {okMessage && <Notice tone="ok">{okMessage}</Notice>}
      {!snapshot.daemon.running && (
        <Notice tone="warn">
          Start Causeway on the Status page first. Opening a port for peers and adding a mapping stay
          idle until it is running.
        </Notice>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[15px] font-semibold">Localhost URLs on this computer</h3>
            <p className="mt-2 mb-0 max-w-[62ch] text-sm leading-relaxed">
              These are the addresses you can open here, from the running Causeway process. If a peer
            is sharing, the URL still looks local, and Causeway forwards it to them.
            </p>
          </div>
          {hasPeerMappings && (
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !snapshot.daemon.running}
              onClick={() => void clearPeerMappings()}
            >
              Clear mappings
            </Button>
          )}
        </div>
        {urls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-7 py-10 text-center text-sm">
            Nothing on localhost yet. Start an app to share it, or add a mapping below to reach a
            peer’s app.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Localhost URL</TableHead>
                <TableHead>Shared by</TableHead>
                <TableHead>What it is</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <a
                      href={row.url}
                      className="font-mono text-xs text-foreground underline decoration-burgundy underline-offset-2 hover:text-burgundy"
                      onClick={(event) => {
                        event.preventDefault()
                        void window.causeway.openExternal(row.url)
                      }}
                    >
                      {row.url}
                    </a>
                  </TableCell>
                  <TableCell>{row.youShare ? 'You' : `${row.sharedBy} · mapping`}</TableCell>
                  <TableCell>{row.detail}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <CopyButton value={row.url} label="Copy URL" />
                      {row.youShare && !dataChannels && !snapshot.allowedPorts.includes(row.port) && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!snapshot.daemon.running || busy}
                          onClick={() => void openListedPortForPeers(row.port)}
                        >
                          Open port for peers
                        </Button>
                      )}
                      {!row.youShare && (
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={busy || !snapshot.daemon.running}
                          onClick={() => void removeMapping(row.peerIdOrName, row.mapping)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Example: an app on port 3000</h3>
        <p className="mt-3 mb-5 max-w-[62ch] text-[15px] leading-relaxed">
          You have a site at <code>{localhostUrl(3000)}</code>. Someone else should be able to open
          that same URL on their computer. First add each other on Peers, with the same connection
          mode, and start Causeway on both machines.
        </p>
        <div className="grid grid-cols-1 gap-4 @min-[840px]:grid-cols-2">
          <RoleCard title="On the computer running the app">
            <ol className="mt-3 mb-0 flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed">
              <li>Leave the app running at <code>{localhostUrl(3000)}</code>.</li>
              <li>
                {dataChannels ? (
                  <>You are in DataChannels mode, so you can skip opening the port for peers.</>
                ) : (
                  <>
                    Open port <code>3000</code> for peers below. WireGuard will not share it until you
                    do. The URL list should show it as shared by you.
                  </>
                )}
              </li>
              <li>
                Do not add a mapping on this computer. Mapping is what the other person does.
              </li>
            </ol>
          </RoleCard>
          <RoleCard title="On the computer that wants the app">
            <ol className="mt-3 mb-0 flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed">
              <li>Choose the peer who is running the app.</li>
              <li>
                Add mapping <code>3000:3000</code>. This computer then listens on 3000 and forwards
                to 3000 on the peer.
              </li>
              <li>
                The URL list shows <code>{localhostUrl(3000)}</code> as shared by that peer. Open it.
              </li>
              <li>
                If 3000 is already used here, map <code>3001:3000</code> and open{' '}
                <code>{localhostUrl(3001)}</code> instead.
              </li>
            </ol>
          </RoleCard>
        </div>
      </section>

      <section>
        <h3 className="m-0 text-[15px] font-semibold">If this computer has the app</h3>
        <p className="mt-2 mb-4 max-w-[62ch] text-sm leading-relaxed">
          It should already appear above as shared by you. In WireGuard mode, open that port for
          peers so they can reach it. You do not add a mapping on this computer.
        </p>
        <form onSubmit={(event) => void openPortForPeers(event)}>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="max-w-48">
              <FieldLabel htmlFor="peer-port">Port the app uses</FieldLabel>
              <Input
                id="peer-port"
                value={peerPort}
                onChange={(event) => setPeerPort(event.target.value)}
                placeholder="3000"
                disabled={dataChannels}
              />
            </Field>
            <Button type="submit" disabled={dataChannels || !snapshot.daemon.running || busy}>
              {busy ? 'Working…' : 'Open port for peers'}
            </Button>
          </div>
          {dataChannels && (
            <p className="mt-3 mb-0 text-sm">DataChannels mode does not need you to open a port for peers.</p>
          )}
        </form>
      </section>

      <form className="flex flex-col gap-4" onSubmit={(event) => void addMapping(event)}>
        <div>
          <h3 className="m-0 text-[15px] font-semibold">If this computer wants the app</h3>
          <p className="mt-2 mb-0 max-w-[62ch] text-sm leading-relaxed">
            Add the mapping on this computer. <code>3000:3000</code> means listen here on 3000 and
            send that traffic to port 3000 on {peerLabel}. The URL list then shows{' '}
            <code>{localhostUrl(3000)}</code> as shared by {peerLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field>
            <FieldLabel htmlFor="mapping-peer">Peer who has the app</FieldLabel>
            <select
              id="mapping-peer"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              value={peer}
              onChange={(event) => setPeer(event.target.value)}
              required
            >
              <option value="">Select a peer</option>
              {snapshot.peers.map((item) => (
                <option key={item.id || item.name} value={item.name || item.id}>
                  {item.name || item.id}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="mapping-ports">listen here : port on peer</FieldLabel>
            <Input
              id="mapping-ports"
              value={mapping}
              onChange={(event) => setMapping(event.target.value)}
              placeholder="3000:3000"
              required
            />
          </Field>
          <Button type="submit" disabled={!snapshot.daemon.running || busy}>
            {busy ? 'Working…' : 'Add mapping'}
          </Button>
        </div>
        <p className="m-0 text-sm">
          Local listen ports must be unique across every peer. You can add a peer first and map ports
          later.
        </p>
      </form>
    </div>
  )
}

function RoleCard({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
