import { execFile } from 'child_process'
import { promisify } from 'util'
import type { ListeningPort } from '@shared/types'

const execFileAsync = promisify(execFile)
const SKIP_PROCESS = new Set([
  'cwp2p',
  'cwp2p.exe',
  'kernel_task',
  'launchd',
  'ControlCenter',
  'ControlCe',
  'rapportd'
])

function parseHostPort(value: string): { address: string; port: number } | null {
  const trimmed = value.trim()
  const v6 = trimmed.match(/^\[([^\]]+)\]:(\d+)$/)
  if (v6) {
    const port = Number(v6[2])
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null
    return { address: v6[1], port }
  }
  const match = trimmed.match(/^(.*):(\d+)$/)
  if (!match) return null
  const port = Number(match[2])
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  return { address: match[1] || '*', port }
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

function decodeProcessName(name: string): string {
  return name.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  )
}

function skipProcess(name: string): boolean {
  const decoded = decodeProcessName(name)
  if (SKIP_PROCESS.has(decoded) || SKIP_PROCESS.has(decoded.split(/\s/)[0] ?? '')) return true
  const lower = decoded.toLowerCase()
  return lower.includes('helper') || lower.startsWith('cursorsandbox') || lower.startsWith('cursorsan')
}

function addPort(found: Map<number, ListeningPort>, processName: string, name: string): void {
  if (skipProcess(processName)) return
  const parsed = parseHostPort(name)
  if (!parsed || !keepAddress(parsed.address) || found.has(parsed.port)) return
  found.set(parsed.port, {
    port: parsed.port,
    address: parsed.address === 'localhost' ? '127.0.0.1' : parsed.address,
    processName: decodeProcessName(processName)
  })
}

function parseLsofFields(stdout: string): ListeningPort[] {
  const found = new Map<number, ListeningPort>()
  let processName = ''
  for (const line of stdout.split(/\r?\n/)) {
    if (!line) continue
    const code = line[0]
    const value = line.slice(1)
    if (code === 'p') processName = ''
    else if (code === 'c') processName = value
    else if (code === 'n' && processName) addPort(found, processName, value)
  }
  return [...found.values()].sort((a, b) => a.port - b.port)
}

function parseLsofHuman(stdout: string): ListeningPort[] {
  const found = new Map<number, ListeningPort>()
  for (const line of stdout.split(/\r?\n/).slice(1)) {
    const listen = line.match(/\sTCP\s+(\S+)\s+\(LISTEN\)\s*$/)
    const head = line.match(/^(\S+)\s+(\d+)\s/)
    if (!listen || !head) continue
    addPort(found, head[1], listen[1])
  }
  return [...found.values()].sort((a, b) => a.port - b.port)
}

function stdoutFromExecError(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('stdout' in error)) return null
  const stdout = error.stdout
  return typeof stdout === 'string' && stdout.trim() ? stdout : null
}

async function runLsof(args: string[]): Promise<string> {
  const bins = process.platform === 'darwin' ? ['/usr/sbin/lsof', 'lsof'] : ['lsof']
  let lastError: unknown
  for (const bin of bins) {
    try {
      const { stdout } = await execFileAsync(bin, args, { timeout: 4000 })
      return stdout
    } catch (error) {
      const stdout = stdoutFromExecError(error)
      if (stdout) return stdout
      lastError = error
    }
  }
  throw lastError
}

async function listUnix(): Promise<ListeningPort[]> {
  const fieldOut = await runLsof(['-nP', '-iTCP', '-sTCP:LISTEN', '-Fpcn'])
  const fromFields = parseLsofFields(fieldOut)
  if (fromFields.length > 0) return fromFields
  const humanOut = await runLsof(['-nP', '-iTCP', '-sTCP:LISTEN'])
  return parseLsofHuman(humanOut)
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
    addPort(found, `pid ${pid}`, local)
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
