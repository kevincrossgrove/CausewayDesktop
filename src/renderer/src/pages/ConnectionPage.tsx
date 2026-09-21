import { useState } from 'react'
import type { AppSnapshot, ConnectionMode } from '@shared/types'
import { CheckIcon, TriangleAlertIcon } from 'lucide-react'
import { cn, Notice, PageHeader } from '../ui'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

const modeLabel: Record<ConnectionMode, string> = {
  wireguard: 'WireGuard',
  'data-channels': 'DataChannels'
}

export default function ConnectionPage({
  snapshot,
  onChange
}: {
  snapshot: AppSnapshot
  onChange: (snapshot: AppSnapshot) => void
}): React.JSX.Element {
  const current = snapshot.settings.connectionMode
  const running = snapshot.daemon.running || snapshot.daemon.starting
  const [pending, setPending] = useState<ConnectionMode | null>(null)
  const [busy, setBusy] = useState(false)

  function requestSwitch(mode: ConnectionMode): void {
    if (mode === current || busy) return
    setPending(mode)
  }

  async function confirmSwitch(): Promise<void> {
    if (!pending) return
    setBusy(true)
    try {
      onChange(await window.causeway.setMode(pending))
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Connection"
        description="Pick how the two machines talk. Both must use the same mode. Changing this restarts Causeway."
      />

      <div className="grid grid-cols-1 gap-4 @min-[640px]:grid-cols-2">
        <ModeChoice
          selected={current === 'wireguard'}
          title="WireGuard"
          kicker="The default. Better when the path is clear."
          benefits={[
            'Faster for files, video, and long-running services',
            'A dedicated encrypted tunnel between the two machines',
            'The usual choice for a stable home-to-home link'
          ]}
          note={
            snapshot.platform === 'win32'
              ? `On Windows, keep WinTUN next to ${snapshot.binaryName}. The computer running the app may need to open that port for peers on Ports.`
              : 'The computer running the app may need to open that port for peers on the Ports page.'
          }
          scene={<WireGuardScene />}
          disabled={busy}
          onClick={() => requestSwitch('wireguard')}
        />
        <ModeChoice
          selected={current === 'data-channels'}
          title="DataChannels"
          kicker="Better when networks get in the way."
          benefits={[
            'Gets through more home routers and strict firewalls',
            'No extra driver to install on Windows',
            'Port mappings work without opening the app’s port for peers first'
          ]}
          note="Can be a bit slower. Use this if WireGuard will not connect."
          scene={<DataChannelsScene />}
          disabled={busy}
          onClick={() => requestSwitch('data-channels')}
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

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null)
        }}
      >
        <AlertDialogContent className="max-w-md sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-warn/15 text-warn">
              <TriangleAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {pending ? `Switch to ${modeLabel[pending]}?` : 'Switch connection mode?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {running
                ? 'Causeway will restart, so any current tunnel drops until it comes back. Both machines must use this mode, or they will not connect.'
                : 'Both machines must use this mode, or they will not connect. Causeway will use it the next time you start.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void confirmSwitch()}>
              {busy
                ? 'Switching…'
                : pending
                  ? running
                    ? `Switch to ${modeLabel[pending]}`
                    : `Use ${modeLabel[pending]}`
                  : 'Switch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ModeChoice({
  selected,
  title,
  kicker,
  benefits,
  note,
  scene,
  disabled,
  onClick
}: {
  selected: boolean
  title: string
  kicker: string
  benefits: string[]
  note?: string
  scene: React.ReactNode
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border text-left transition-[border-color,box-shadow,transform] disabled:opacity-100',
        selected
          ? 'cursor-default border-navy shadow-[0_10px_28px_-18px_var(--navy)] dark:border-cream dark:shadow-[0_10px_28px_-18px_var(--cream)]'
          : 'border-border hover:-translate-y-0.5 hover:border-navy/45 hover:shadow-[0_12px_28px_-20px_var(--navy)] dark:hover:border-cream/45'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'relative h-29 overflow-hidden',
          selected
            ? 'bg-navy text-cream dark:bg-cream dark:text-navy'
            : 'bg-muted text-foreground'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '14px 14px'
          }}
        />
        {scene}
        {selected ? (
          <Badge className="absolute top-3 right-3 bg-burgundy text-cream dark:bg-navy dark:text-cream">
            In use
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="m-0 text-[1.35rem] font-bold tracking-tight">{title}</h3>
        <p className="mt-1.5 mb-4 text-sm leading-relaxed">{kicker}</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm leading-relaxed">
          {benefits.map((item) => (
            <li key={item} className="flex gap-2.5">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-burgundy" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-5">
          {note ? <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{note}</p> : null}
          <span
            className={cn(
              'text-[13px] font-semibold',
              selected ? 'text-burgundy' : 'text-foreground group-hover:text-burgundy'
            )}
          >
            {selected ? 'This machine is using this mode' : 'Use this mode'}
          </span>
        </div>
      </div>
    </button>
  )
}

function Node({ cx, cy }: { cx: number; cy: number }): React.JSX.Element {
  return (
    <g>
      <circle cx={cx} cy={cy} r="18" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="5" fill="currentColor" />
    </g>
  )
}

function WireGuardScene(): React.JSX.Element {
  return (
    <svg viewBox="0 0 320 116" className="relative h-full w-full" aria-hidden="true">
      <path
        d="M74 58h172"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.22"
      />
      <path
        d="M74 58h172"
        className="stroke-burgundy"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="5 7"
      />
      <g transform="translate(148 42)">
        <rect width="24" height="22" rx="6" className="fill-burgundy" />
        <path
          d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
          fill="none"
          className="stroke-cream"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <rect x="9.5" y="13" width="5" height="4" rx="1" className="fill-cream" />
      </g>
      <Node cx={56} cy={58} />
      <Node cx={264} cy={58} />
    </svg>
  )
}

function DataChannelsScene(): React.JSX.Element {
  return (
    <svg viewBox="0 0 320 116" className="relative h-full w-full" aria-hidden="true">
      <rect
        x="142"
        y="36"
        width="36"
        height="52"
        rx="4"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M148 49h24M148 62h24M148 75h24" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <path
        d="M74 70 C 110 70, 118 22, 160 22 C 202 22, 210 70, 246 70"
        fill="none"
        className="stroke-burgundy"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="5 6"
      />
      <circle cx="160" cy="22" r="3.5" className="fill-burgundy" />
      <Node cx={56} cy={70} />
      <Node cx={264} cy={70} />
    </svg>
  )
}
