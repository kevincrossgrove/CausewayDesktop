import { useEffect, useState } from 'react'
import type { Appearance, PageId } from '@shared/types'
import { applyAppearance } from '../theme'
import { BrandMark, Button, cx, FolderIcon, MoonIcon, shortPath, SunIcon } from '../ui'

const items: { id: PageId; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'peers', label: 'Peers' },
  { id: 'ports', label: 'Ports' },
  { id: 'connection', label: 'Connection' },
  { id: 'learn', label: 'Learn' }
]

type Props = {
  page: PageId
  onPage: (page: PageId) => void
  running: boolean
  folder: string | null
  appearance: Appearance
  onChangeFolder: () => void
  onAppearance: (appearance: Appearance) => void
}

export default function Sidebar({
  page,
  onPage,
  running,
  folder,
  appearance,
  onChangeFolder,
  onAppearance
}: Props): React.JSX.Element {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [appearance])

  function toggleAppearance(): void {
    const next: Appearance = dark ? 'light' : 'dark'
    applyAppearance(next)
    setDark(next === 'dark')
    onAppearance(next)
  }

  return (
    <aside className="flex min-w-0 flex-col gap-6 border-line bg-sidebar p-4 max-desk:flex-row max-desk:flex-wrap max-desk:items-center max-desk:gap-x-3 max-desk:border-b desk:h-full desk:min-h-0 desk:overflow-y-auto desk:border-r desk:px-4 desk:py-5">
      <div className="flex items-center gap-2.5 px-2">
        <BrandMark />
        <h1 className="m-0 text-[17px] font-bold tracking-tight">Causeway</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 max-desk:flex-row max-desk:flex-wrap">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className="desk:w-full"
            active={page === item.id}
            onClick={() => onPage(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5 max-desk:mt-0 max-desk:w-full max-desk:flex-row max-desk:flex-wrap max-desk:items-center">
        <div className="inline-flex items-center gap-2 px-2 text-[13px]">
          <span className={cx('size-2 rounded-full', running ? 'bg-ok' : 'bg-faint')} />
          {running ? 'Running' : 'Stopped'}
        </div>
        {folder && (
          <button
            type="button"
            title={folder}
            onClick={onChangeFolder}
            className="mx-1 inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-raised px-2.5 py-1.5 text-[12px] hover:bg-hover"
          >
            <FolderIcon />
            <span className="truncate">{shortPath(folder)}</span>
          </button>
        )}
        <div className="flex items-center justify-between gap-1">
          <Button variant="ghost" active={page === 'settings'} onClick={() => onPage('settings')}>
            Settings
          </Button>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-hover"
            aria-label={dark ? 'Switch to light appearance' : 'Switch to dark appearance'}
            title={appearance === 'system' ? 'Appearance follows system' : appearance}
            onClick={toggleAppearance}
          >
            {dark ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </div>
    </aside>
  )
}
