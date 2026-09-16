import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Appearance } from '@shared/types'
import { applyAppearance } from './theme'
import netcoreIcon from './assets/netcore-network-icon.png'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'

export function Button({
  variant = 'default',
  active = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  active?: boolean
}): React.JSX.Element {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={cx(
        'shrink-0 disabled:cursor-default disabled:opacity-45',
        variant !== 'ghost' &&
          'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
        variant === 'default' && 'border border-line bg-raised hover:bg-hover',
        variant === 'primary' && 'border border-transparent bg-primary font-semibold text-on-primary',
        variant === 'danger' && 'border border-burgundy/25 bg-raised text-danger hover:bg-burgundy/5',
        variant === 'ghost' &&
          'rounded-none border-0 px-3 py-2.5 text-left text-[15px]',
        variant === 'ghost' && !active && 'bg-transparent text-ink hover:bg-hover',
        variant === 'ghost' &&
          active &&
          'bg-transparent font-semibold text-ink underline decoration-burgundy decoration-2 underline-offset-[10px]',
        className
      )}
      {...props}
    />
  )
}

export function Card({
  className,
  children
}: {
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return <div className={cx('rounded-2xl border border-line bg-raised/70 p-5', className)}>{children}</div>
}

export function CardLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return <h3 className="mb-1.5 text-[15px] font-semibold text-ink">{children}</h3>
}

export function Field({
  label,
  children,
  className
}: {
  label: string
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <label className={cx('flex min-w-[140px] flex-1 flex-col gap-1.5 text-[13px] text-ink', className)}>
      {label}
      {children}
    </label>
  )
}

export const controlClass =
  'w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-navy/35 dark:focus:border-cream/35'

export const thClass = 'border-b border-line px-3 py-3 text-left text-xs font-semibold text-ink'
export const tdClass = 'border-b border-line px-3 py-3.5 align-top'

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string
  description: string
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 @min-[560px]:flex-row">
      <div className="max-w-[46rem]">
        <h2 className="m-0 text-[2.15rem] font-bold leading-[1.1] tracking-tight">{title}</h2>
        <p className="mt-3 mb-0 max-w-[52ch] text-[15px] leading-relaxed text-ink">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  )
}

export function IdentityBar({ value }: { value: string }): React.JSX.Element {
  return (
    <code className="block min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-line bg-bg px-3 py-2.5 font-mono text-[13px] leading-snug">
      {value}
    </code>
  )
}

export function SplitControl({
  label,
  children
}: {
  label: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <label className="flex min-w-0 overflow-hidden rounded-xl border border-line bg-bg focus-within:border-navy/35 dark:focus-within:border-cream/35">
      <span className="flex shrink-0 items-center border-r border-line bg-hover px-3.5 text-[13px]">
        {label}
      </span>
      {children}
    </label>
  )
}

export function StatStrip({
  items
}: {
  items: { label: string; value: string }[]
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 border-y border-line @min-[720px]:grid-cols-6">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cx(
            'flex min-w-0 flex-col gap-1 py-4 pr-4',
            index > 0 && 'border-line @min-[720px]:border-l @min-[720px]:pl-5',
            index % 2 === 1 && 'max-[719px]:border-l max-[719px]:pl-5',
            index > 1 && 'max-[719px]:border-t'
          )}
        >
          <span className="text-[12px]">{item.label}</span>
          <span className="truncate text-[15px] font-semibold leading-snug" title={item.value}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PortChip({
  selected,
  onClick,
  port,
  detail
}: {
  selected: boolean
  onClick: () => void
  port: number
  detail: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors',
        selected ? 'border-navy bg-navy/5 dark:border-cream dark:bg-cream/8' : 'border-line bg-bg hover:bg-hover'
      )}
    >
      <strong className="font-mono text-[13px] font-semibold">{port}</strong>
      <span className="text-[11px] text-ink">{detail}</span>
    </button>
  )
}

export function BrandMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <img
      src={netcoreIcon}
      alt=""
      className={cx('size-8 shrink-0 rounded-lg', className)}
      width={32}
      height={32}
    />
  )
}

export function LogBlock({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-code p-3.5 font-mono text-xs">
      {children}
    </pre>
  )
}

export function Notice({
  tone = 'danger',
  children
}: {
  tone?: 'danger' | 'warn'
  children: ReactNode
}): React.JSX.Element {
  return (
    <p className={cx('m-0 text-sm', tone === 'danger' ? 'text-danger' : 'text-warn')}>{children}</p>
  )
}

export function shortPath(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, '~').replace(/^[A-Za-z]:\\Users\\[^\\]+/, '~')
}

export function SunIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cx('size-4', className)}>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3.25v1.7M12 19.05v1.7M4.22 4.22l1.2 1.2M18.58 18.58l1.2 1.2M3.25 12h1.7M19.05 12h1.7M4.22 19.78l1.2-1.2M18.58 5.42l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MoonIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cx('size-4', className)}>
      <path
        d="M16.5 13.2A6.4 6.4 0 0 1 10.8 7.5 6.5 6.5 0 1 0 16.5 13.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FolderIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cx('size-3.5', className)}>
      <path
        d="M3.75 7.5A1.75 1.75 0 0 1 5.5 5.75h4.1l1.4 1.75h7.5A1.75 1.75 0 0 1 20.25 9.25v7.5A1.75 1.75 0 0 1 18.5 18.5H5.5A1.75 1.75 0 0 1 3.75 16.75z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronIcon({ open, className }: { open?: boolean; className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cx('size-3.5 transition-transform', open && 'rotate-180', className)}
    >
      <path d="M6 9.5 12 15l6-5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const appearances: { id: Appearance; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
]

export function AppearancePicker({
  value,
  onChange
}: {
  value: Appearance
  onChange: (appearance: Appearance) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {appearances.map((item) => (
        <Button
          key={item.id}
          variant={value === item.id ? 'primary' : 'default'}
          onClick={() => {
            applyAppearance(item.id)
            onChange(item.id)
          }}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
