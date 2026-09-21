import { useCallback, useState, type FormEvent } from 'react'
import type { AppSnapshot, ParsedPeer } from '@shared/types'
import {
  formatCliError,
  formatMapping,
  mappingsError,
  peerIdError,
  peerNameError,
  sanitizePeerName
} from '@shared/peerInput'
import CopyButton from '../components/CopyButton'
import { cn, Notice, PageHeader } from '../ui'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { XIcon } from 'lucide-react'

type MappingDraft = { localPort: string; remotePort: string }

type PeerDrawer =
  | { kind: 'add' }
  | { kind: 'edit'; peer: ParsedPeer }

function emptyDraft(): MappingDraft {
  return { localPort: '', remotePort: '' }
}

function draftsFromPeer(peer: ParsedPeer): MappingDraft[] {
  if (peer.mappings.length === 0) return []
  return peer.mappings.map((mapping) => ({
    localPort: mapping.localPort,
    remotePort: mapping.remotePort
  }))
}

function filledDrafts(drafts: MappingDraft[]): MappingDraft[] {
  return drafts.filter((draft) => draft.localPort.trim() || draft.remotePort.trim())
}

function draftsToMappingText(drafts: MappingDraft[]): string {
  return filledDrafts(drafts)
    .map((draft) => `${draft.localPort.trim()}:${draft.remotePort.trim()}`)
    .join(',')
}

function portDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5)
}

function peerRef(peer: ParsedPeer): string {
  return peer.name || peer.id
}

function mappingPhrase(mapping: { localPort: string; remotePort: string }): string {
  if (mapping.localPort === mapping.remotePort) {
    return `${mapping.localPort} on this computer and on the peer`
  }
  return `${mapping.remotePort} on the peer → ${mapping.localPort} on this computer`
}

export default function PeersPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const [drawer, setDrawer] = useState<PeerDrawer | null>(null)
  const [name, setName] = useState('')
  const [peerId, setPeerId] = useState('')
  const [drafts, setDrafts] = useState<MappingDraft[]>([emptyDraft()])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const localId = snapshot.status?.localId ?? null
  const running = snapshot.daemon.running
  const kind = drawer?.kind ?? 'add'

  const closeDrawer = useCallback((): void => {
    if (busy) return
    setDrawer(null)
    setError(null)
  }, [busy])

  function openAdd(): void {
    setName('')
    setPeerId('')
    setDrafts([emptyDraft()])
    setError(null)
    setDrawer({ kind: 'add' })
  }

  function openEdit(peer: ParsedPeer): void {
    setName(peer.name)
    setPeerId(peer.id)
    setDrafts(draftsFromPeer(peer))
    setError(null)
    setDrawer({ kind: 'edit', peer })
  }

  function updateDraft(index: number, patch: Partial<MappingDraft>): void {
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)))
  }

  async function addPeer(event: FormEvent): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const nameProblem = peerNameError(name)
    const idProblem = peerIdError(peerId)
    const mappingProblem = mappingsError(draftsToMappingText(drafts))
    if (nameProblem || idProblem || mappingProblem) {
      setError(nameProblem ?? idProblem ?? mappingProblem)
      setBusy(false)
      return
    }
    const result = await window.causeway.addPeer(name, peerId, draftsToMappingText(drafts))
    onChange(await window.causeway.refresh())
    if (!result.ok) {
      setError(formatCliError(result, 'Could not add peer.'))
      setBusy(false)
      return
    }
    setDrawer(null)
    setBusy(false)
  }

  async function saveMappings(event: FormEvent, peer: ParsedPeer): Promise<void> {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const mappingText = draftsToMappingText(drafts)
    const mappingProblem = mappingsError(mappingText)
    if (mappingProblem) {
      setError(mappingProblem)
      setBusy(false)
      return
    }

    const nextKeys = new Set(
      mappingText
        ? mappingText.split(',').map((item) => item.trim()).filter(Boolean)
        : []
    )
    const originalKeys = new Set(peer.mappings.map(formatMapping))
    const idOrName = peerRef(peer)

    for (const mapping of originalKeys) {
      if (nextKeys.has(mapping)) continue
      const result = await window.causeway.removePeerPort(idOrName, mapping)
      if (!result.ok) {
        onChange(await window.causeway.refresh())
        setError(formatCliError(result, 'Could not remove that mapping.'))
        setBusy(false)
        return
      }
    }
    for (const mapping of nextKeys) {
      if (originalKeys.has(mapping)) continue
      const result = await window.causeway.addPeerPort(idOrName, mapping)
      if (!result.ok) {
        onChange(await window.causeway.refresh())
        setError(formatCliError(result, 'Could not add that mapping.'))
        setBusy(false)
        return
      }
    }

    onChange(await window.causeway.refresh())
    setDrawer(null)
    setBusy(false)
  }

  async function removePeer(peer: ParsedPeer): Promise<void> {
    const idOrName = peerRef(peer)
    if (!window.confirm(`Remove peer ${idOrName}?`)) return
    setBusy(true)
    setError(null)
    const result = await window.causeway.removePeer(idOrName)
    onChange(await window.causeway.refresh())
    if (!result.ok) setError(formatCliError(result, 'Could not remove peer.'))
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Peers"
        description="Copy your NetcoreNetwork ID, add the other computer, and manage port mappings."
        actions={
          <Button type="button" size="lg" className="h-11 px-5 text-[15px]" disabled={!running} onClick={openAdd}>
            Add Peer
          </Button>
        }
      />

      {!running && <Notice tone="warn">Start Causeway on the Status page first.</Notice>}
      {error && !drawer && <Notice>{error}</Notice>}

      <section>
        <h3 className="m-0 text-[15px] font-semibold">Your NetcoreNetwork ID</h3>
        <p className="mt-1.5 mb-0 text-sm leading-relaxed">
          Give this to anyone who should add you as a peer.
        </p>
        <div className="mt-4 flex min-w-0 items-center overflow-hidden rounded-xl border border-border bg-background">
          <code
            className={cn(
              'min-w-0 flex-1 truncate bg-transparent px-3.5 py-2.5 font-mono text-[13px] tracking-normal',
              localId ? 'text-foreground' : 'text-faint'
            )}
            title={localId ?? undefined}
          >
            {localId ?? 'XXXX-XXXX-XXXX-XXXX-XXXX'}
          </code>
          <div className="pr-1.5">
            <CopyButton value={localId ?? ''} label="Copy ID" disabled={!localId} />
          </div>
        </div>
        {!localId && <p className="mt-2 mb-0 text-sm">Appears once Causeway is running.</p>}
      </section>

      <section>
        {snapshot.peers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-7 py-10 text-center text-sm">
            No peers yet. Copy your ID above, send it to the other person, and add theirs with Add
            Peer.
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-border border-y border-border p-0">
            {snapshot.peers.map((peer) => (
              <li
                key={peer.id || peer.name}
                className="flex flex-col gap-4 py-5 @min-[640px]:flex-row @min-[640px]:items-start @min-[640px]:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <strong className="text-[15px]">{peer.name}</strong>
                    {peer.status && <span className="text-sm">{peer.status}</span>}
                  </div>
                  <div className="mt-1 font-mono text-xs break-all">{peer.id}</div>
                  <p className="mt-2 mb-0 text-sm">
                    {peer.mappings.length === 0
                      ? 'No port mappings'
                      : peer.mappings.map(mappingPhrase).join(', ')}
                  </p>
                  {peer.needsReAdd && (
                    <p className="mt-1 mb-0 text-sm text-warn">Needs to be added again</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {peer.id && <CopyButton value={peer.id} label="Copy ID" />}
                  <Button variant="outline" disabled={busy || !running} onClick={() => openEdit(peer)}>
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy || !running}
                    onClick={() => void removePeer(peer)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Drawer
        open={drawer !== null}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
        }}
        swipeDirection="right"
      >
        <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem]">
          <DrawerHeader className="flex-row items-center gap-2 border-b pb-4">
            <DrawerClose
              render={
                <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label="Close" />
              }
            >
              <XIcon />
            </DrawerClose>
            <DrawerTitle>{kind === 'add' ? 'Add Peer' : 'Edit Peer'}</DrawerTitle>
          </DrawerHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) =>
              void (kind === 'add' || !drawer || drawer.kind !== 'edit'
                ? addPeer(event)
                : saveMappings(event, drawer.peer))
            }
          >
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="peer-name">Name</FieldLabel>
                  <Input
                    id="peer-name"
                    value={name}
                    onChange={(event) => setName(sanitizePeerName(event.target.value))}
                    placeholder="home-server"
                    required={kind === 'add'}
                    pattern="[A-Za-z0-9._-]+"
                    title="Letters, numbers, periods, hyphens, and underscores. No spaces."
                    spellCheck={false}
                    disabled={kind === 'edit' || busy}
                  />
                  {kind === 'edit' && (
                    <FieldDescription>Name and ID cannot be changed.</FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="peer-id">Peer ID</FieldLabel>
                  <Input
                    id="peer-id"
                    value={peerId}
                    onChange={(event) => setPeerId(event.target.value.trim().toLowerCase())}
                    placeholder="64-character hex ID"
                    minLength={64}
                    maxLength={64}
                    pattern="[0-9a-f]{64}"
                    title="64 lowercase hex characters"
                    required={kind === 'add'}
                    spellCheck={false}
                    disabled={kind === 'edit' || busy}
                  />
                </Field>

                <Separator />

                <Field>
                  <FieldLabel>Port mappings</FieldLabel>
                  <FieldDescription>
                    {kind === 'add'
                      ? 'Each mapping is a port on the peer, and the port you will use for it here. You can add these now or edit them later.'
                      : 'Each mapping is a port on the peer, and the port you will use for it here.'}
                  </FieldDescription>
                </Field>

                {drafts.map((draft, index) => (
                  <Card key={index} size="sm">
                    <CardHeader>
                      <CardTitle>Mapping {index + 1}</CardTitle>
                      <CardAction>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <Field>
                        <FieldLabel htmlFor={`peer-port-${index}`}>On the peer</FieldLabel>
                        <FieldDescription>
                          The port they opened, or will open, for you to connect to.
                        </FieldDescription>
                        <Input
                          id={`peer-port-${index}`}
                          value={draft.remotePort}
                          onChange={(event) =>
                            updateDraft(index, { remotePort: portDigits(event.target.value) })
                          }
                          placeholder="3000"
                          inputMode="numeric"
                          spellCheck={false}
                          disabled={busy}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`local-port-${index}`}>On this computer</FieldLabel>
                        <FieldDescription>
                          Where that port will show up on your computer.
                        </FieldDescription>
                        <Input
                          id={`local-port-${index}`}
                          value={draft.localPort}
                          onChange={(event) =>
                            updateDraft(index, { localPort: portDigits(event.target.value) })
                          }
                          placeholder="3000"
                          inputMode="numeric"
                          spellCheck={false}
                          disabled={busy}
                        />
                      </Field>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDrafts((current) => [...current, emptyDraft()])}
                >
                  Add mapping
                </Button>
              </FieldGroup>

              {error && drawer && (
                <div className="mt-4">
                  <Notice>{error}</Notice>
                </div>
              )}
            </div>

            <DrawerFooter className="flex-row justify-end border-t px-5 pt-3 pb-5">
              <DrawerClose render={<Button type="button" variant="outline" disabled={busy} />}>
                Cancel
              </DrawerClose>
              <Button type="submit" disabled={busy || !running}>
                {busy ? 'Working…' : kind === 'add' ? 'Add Peer' : 'Save mappings'}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
