import type { AppSnapshot, ConnectionMode } from '@shared/types'
import { CardLabel, cx, Notice, PageHeader } from '../ui'

export default function ConnectionPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  async function choose(mode: ConnectionMode): Promise<void> {
    onChange(await window.causeway.setMode(mode))
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Connection"
        description="Causeway can move traffic over WireGuard (the default) or over WebRTC DataChannels. Both machines must use the same mode. Changing this restarts Causeway."
      />

      <div className="grid grid-cols-1 gap-4 @min-[640px]:grid-cols-2">
        <ModeChoice
          selected={snapshot.settings.connectionMode === 'wireguard'}
          title="WireGuard"
          onClick={() => void choose('wireguard')}
        >
          Default mode. Builds an encrypted tunnel and maps TCP ports onto localhost. On Windows,
          WinTUN must sit next to <code>{snapshot.binaryName}</code>. Local ports may need the
          allow-list on the Ports page.
        </ModeChoice>
        <ModeChoice
          selected={snapshot.settings.connectionMode === 'data-channels'}
          title="DataChannels"
          onClick={() => void choose('data-channels')}
        >
          Starts Causeway with <code>--data-channels</code>. Uses WebRTC DataChannels instead of
          WireGuard. Port mappings still work, and they do not need the WireGuard allow-list.
        </ModeChoice>
      </div>

      <Notice tone="warn">
        If one peer is on WireGuard and the other is on DataChannels, they will not connect.
      </Notice>

      <section>
        <h3 className="mb-4 text-[15px] font-semibold">Causeway CLI WebRTC vs WireGuard</h3>
        <iframe
          className="aspect-video w-full rounded-2xl border-0 bg-navy"
          src="https://www.youtube-nocookie.com/embed/0XN3rwVqwb4"
          title="Causeway CLI WebRTC vs WireGuard"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </section>
    </div>
  )
}

function ModeChoice({
  selected,
  title,
  onClick,
  children
}: {
  selected: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      className={cx(
        'rounded-2xl border p-5 text-left transition-colors',
        selected ? 'border-navy bg-navy/5 dark:border-cream dark:bg-cream/8' : 'border-line bg-bg hover:bg-hover'
      )}
      onClick={onClick}
    >
      <CardLabel>{title}</CardLabel>
      <p className="m-0 text-sm leading-relaxed text-muted">{children}</p>
    </button>
  )
}
