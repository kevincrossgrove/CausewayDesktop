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
        description="Pick how the two machines talk. Both must use the same mode. Changing this restarts Causeway."
      />

      <div className="grid grid-cols-1 gap-4 @min-[640px]:grid-cols-2">
        <ModeChoice
          selected={snapshot.settings.connectionMode === 'wireguard'}
          title="WireGuard"
          kicker="The default. Better when the path is clear."
          benefits={[
            'Faster for files, video, and long-running services',
            'A dedicated encrypted tunnel between the two machines',
            'The usual choice for a stable home-to-home link'
          ]}
          note={
            snapshot.platform === 'win32'
              ? `On Windows, keep WinTUN next to ${snapshot.binaryName}. Some ports need an extra allow step on Ports.`
              : 'Some ports need an extra allow step on the Ports page.'
          }
          onClick={() => void choose('wireguard')}
        />
        <ModeChoice
          selected={snapshot.settings.connectionMode === 'data-channels'}
          title="DataChannels"
          kicker="Better when networks get in the way."
          benefits={[
            'Gets through more home routers and strict firewalls',
            'No extra driver to install on Windows',
            'Port mappings work without the allow-list'
          ]}
          note="Can be a bit slower. Use this if WireGuard will not connect."
          onClick={() => void choose('data-channels')}
        />
      </div>

      <Notice tone="warn">Both machines must use the same mode, or they will not connect.</Notice>

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
  kicker,
  benefits,
  note,
  onClick
}: {
  selected: boolean
  title: string
  kicker: string
  benefits: string[]
  note?: string
  onClick: () => void
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
      <p className="mt-1 mb-4 text-sm leading-relaxed">{kicker}</p>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed">
        {benefits.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {note ? <p className="mt-4 mb-0 text-[13px] leading-relaxed">{note}</p> : null}
    </button>
  )
}
