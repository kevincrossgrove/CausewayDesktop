import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type Appearance, type AppSettings } from '@shared/types'
import { isValidPeerName, sanitizePeerName } from '@shared/peerInput'

function parseAppearance(value: unknown): Appearance {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return DEFAULT_SETTINGS.appearance
}

function parseShareName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = sanitizePeerName(value)
  return isValidPeerName(name) ? name : null
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<AppSettings> {
  const path = settingsPath()
  if (!existsSync(path)) {
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      causewayFolder: raw.causewayFolder ?? null,
      appearance: parseAppearance(raw.appearance),
      shareName: parseShareName(raw.shareName)
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const dir = app.getPath('userData')
  await mkdir(dir, { recursive: true })
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}
