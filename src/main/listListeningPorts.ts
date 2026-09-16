import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ListeningPort } from '@shared/types'

const execFileAsync = promisify(execFile)
const SKIP_PROCESS = new Set(['cwp2p', 'cwp2p.exe', 'kernel_task', 'launchd'])

function parseHostPort(value: string): { address: string; port: number } | null {
  const trimmed = value.replace(/^[*\[]+|[\]\s]+$/g, '')
  const match = trimmed.match(/^(.*):(\d+)$/)
  if (!match) return null
  const port = Number(match[2])
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  const address = match[1].replace(/^\[|\]$/g, '') || '*'
  return { address, port }
}

function keepAddress(address: string): boolean {
  return (
    address === '*' ||
    address === '::' ||
    address === '0.0.0.0' ||
    address === '127.0.0.1' ||
    address === '::1' ||
    address === 'localhost'
  )
}

async function listUnix(): Promise<ListeningPort[]> {
  const { stdout } = await execFileAsync('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN'], {
    timeout: 4000
  })
  const found = new Map<number, ListeningPort>()
  for (const line of stdout.split(/\r?\n/).slice(1)) {
    const match = line.match(/^(\S+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+TCP\s+(\S+)/)
    if (!match) continue
    const processName = match[1]
    if (SKIP_PROCESS.has(processName)) continue
    const parsed = parseHostPort(match[3])
    if (!parsed || !keepAddress(parsed.address)) continue
    if (found.has(parsed.port)) continue
    found.set(parsed.port, {
      port: parsed.port,
      address: parsed.address === 'localhost' ? '127.0.0.1' : parsed.address,
      processName
    })
  }
  return [...found.values()].sort((a, b) => a.port - b.port)
}

async function listWindows(): Promise<ListeningPort[]> {
  const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], { timeout: 4000 })
  const found = new Map<number, ListeningPort>()
  for (const line of stdout.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue
    const parts = line.trim().split(/\s+/)
    const local = parts[1]
    const pid = parts[4]
    if (!local || !pid) continue
    const parsed = parseHostPort(local)
    if (!parsed || !keepAddress(parsed.address)) continue
    if (found.has(parsed.port)) continue
    found.set(parsed.port, {
      port: parsed.port,
      address: parsed.address,
      processName: `pid ${pid}`
    })
  }
  return [...found.values()].sort((a, b) => a.port - b.port)
}

export async function listListeningTcpPorts(): Promise<ListeningPort[]> {
  try {
    const ports = process.platform === 'win32' ? await listWindows() : await listUnix()
    return ports.slice(0, 40)
  } catch {
    return []
  }
}
