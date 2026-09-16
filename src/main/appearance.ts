import { nativeTheme, type BrowserWindow } from 'electron'
import type { Appearance } from '@shared/types'

export const CREAM = '#fffff6'
export const DARK_BG = '#1a1916'

export function windowBackground(): string {
  return nativeTheme.shouldUseDarkColors ? DARK_BG : CREAM
}

export function applyNativeAppearance(
  appearance: Appearance,
  window?: BrowserWindow | null
): void {
  nativeTheme.themeSource = appearance
  window?.setBackgroundColor(windowBackground())
}
