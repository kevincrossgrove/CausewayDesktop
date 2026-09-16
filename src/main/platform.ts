import { existsSync, realpathSync } from 'fs'
import { homedir, hostname } from 'os'
import { join } from 'path'
import type { ConnectionMode } from '@shared/types'
import { sanitizePeerName } from '@shared/peerInput'

export const DOWNLOAD_URL = 'https://www.netcore.network/causeway'

export function binaryName(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'cwp2p.exe' : 'cwp2p'
}

export function platformLabel(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return 'macOS'
  if (platform === 'win32') return 'Windows'
  return platform
}

export function downloadName(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return 'macOS arm64'
  if (platform === 'win32') return 'Windows amd64'
  return `${platform} build`
}

export function commandSocketName(): string {
  return 'cwp2p.sock'
}

export function stateFileName(): string {
  return 'cwp2p.json'
}

export function runtimeDir(): string {
  return join(homedir(), '.causeway-desktop')
}

export function candidateFolders(): string[] {
  const home = homedir()
  return [
    join(home, 'Desktop', 'causeway'),
    join(home, 'Desktop', 'Causeway'),
    join(home, 'Downloads', 'causeway'),
    join(home, 'Downloads', 'Causeway')
  ]
}

export function foundCandidateFolders(): string[] {
  const seen = new Set<string>()
  const found: string[] = []
  for (const folder of candidateFolders()) {
    if (!existsSync(join(folder, binaryName()))) continue
    let resolved = folder
    try {
      resolved = realpathSync(folder)
    } catch {
      // Keep the path we checked.
    }
    const key = process.platform === 'linux' ? resolved : resolved.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    found.push(resolved)
  }
  return found
}

export function suggestedPeerName(): string {
  return sanitizePeerName(hostname().split('.')[0] || '') || 'my-computer'
}

export function daemonArgs(options: {
  connectionMode: ConnectionMode
  bindAddress: string
  logLevel: string
}): string[] {
  const args = ['--log-level', options.logLevel, '--bind-address', options.bindAddress]
  if (options.connectionMode === 'data-channels') {
    args.push('--data-channels')
  }
  return args
}
