import type { Appearance } from '@shared/types'

const STORAGE_KEY = 'causeway-appearance'

export function readStoredAppearance(): Appearance {
  const value = localStorage.getItem(STORAGE_KEY)
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'light'
}

export function applyAppearance(appearance: Appearance): void {
  localStorage.setItem(STORAGE_KEY, appearance)
  const dark =
    appearance === 'dark' ||
    (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function watchSystemAppearance(getAppearance: () => Appearance): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = (): void => {
    if (getAppearance() === 'system') applyAppearance('system')
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
