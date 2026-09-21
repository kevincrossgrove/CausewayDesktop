import { execFile, spawn, type ChildProcess } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'
import { CWP2P_CLI_COMMANDS } from '@shared/cwp2pCommand'
import type { AppSettings, DaemonState } from '@shared/types'
import { commandSocketName, daemonArgs, runtimeDir, stateFileName } from './platform'

const execFileAsync = promisify(execFile)
const MAX_LOG_LINES = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pidIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function killProcessTree(pid: number): Promise<void> {
  if (!pidIsRunning(pid)) return
  if (process.platform === 'win32') {
    try {
      await execFileAsync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        timeout: 8000,
        windowsHide: true
      })
    } catch {
      // The process may already be gone.
    }
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    return
  }
  await sleep(400)
  if (pidIsRunning(pid)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Already gone.
    }
  }
}

function parsePidLines(stdout: string): number[] {
  const pids = new Set<number>()
  for (const line of stdout.split(/\r?\n/)) {
    const pid = Number(line.trim())
    if (Number.isInteger(pid) && pid > 0) pids.add(pid)
  }
  return [...pids]
}

function isNoMatchExit(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return (error as { code?: number | string }).code === 1
}

function binaryNameFromCommand(command: string): string {
  const trimmed = command.trim().replace(/^"/, '').replace(/"$/, '')
  const base = trimmed.split(/[/\\]/).pop() ?? trimmed
  return base.replace(/\.exe$/i, '').toLowerCase()
}

function isCwp2pDaemonCommand(commandLine: string): boolean {
  const tokens = commandLine.trim().match(/"[^"]+"|\S+/g)
  if (!tokens || tokens.length === 0) return false
  if (binaryNameFromCommand(tokens[0]) !== 'cwp2p') return false
  const firstPositional = tokens.slice(1).find((token) => !token.startsWith('-'))
  if (!firstPositional) return true
  return !CWP2P_CLI_COMMANDS.has(firstPositional.toLowerCase())
}

function addPid(pids: Set<number>, value: string | number): void {
  const pid = Number(value)
  if (Number.isInteger(pid) && pid > 0) pids.add(pid)
}

async function listUnixCwp2pPids(): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync('ps', ['-A', '-o', 'pid=', '-o', 'args='], { timeout: 4000 })
    const pids = new Set<number>()
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.trim().match(/^(\d+)\s+(\S.*)$/)
      if (!match) continue
      if (!isCwp2pDaemonCommand(match[2])) continue
      addPid(pids, match[1])
    }
    return [...pids]
  } catch {
    // Fall through to process-name matching.
  }
  try {
    const { stdout } = await execFileAsync('pgrep', ['-x', 'cwp2p'], { timeout: 4000 })
    return parsePidLines(stdout)
  } catch (error) {
    if (isNoMatchExit(error)) return []
  }
  try {
    const { stdout } = await execFileAsync('ps', ['-A', '-o', 'pid=', '-o', 'comm='], { timeout: 4000 })
    const pids = new Set<number>()
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.trim().match(/^(\d+)\s+(\S+)/)
      if (!match) continue
      if (binaryNameFromCommand(match[2]) !== 'cwp2p') continue
      addPid(pids, match[1])
    }
    return [...pids]
  } catch {
    return []
  }
}

async function listWindowsCwp2pPids(): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "Get-CimInstance Win32_Process -Filter \"Name='cwp2p.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"
      ],
      { timeout: 8000, windowsHide: true }
    )
    const parsed = JSON.parse(stdout || '[]') as
      | { ProcessId?: number; CommandLine?: string }
      | { ProcessId?: number; CommandLine?: string }[]
      | null
    if (!parsed) return []
    const rows = Array.isArray(parsed) ? parsed : [parsed]
    const pids = new Set<number>()
    for (const row of rows) {
      const commandLine = row.CommandLine || 'cwp2p.exe'
      if (!isCwp2pDaemonCommand(commandLine)) continue
      addPid(pids, row.ProcessId ?? 0)
    }
    return [...pids]
  } catch {
    // Fall through to tasklist.
  }
  try {
    const { stdout } = await execFileAsync(
      'tasklist',
      ['/FI', 'IMAGENAME eq cwp2p.exe', '/FO', 'CSV', '/NH'],
      { timeout: 8000, windowsHide: true }
    )
    if (/no tasks are running/i.test(stdout)) return []
    const pids = new Set<number>()
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/"cwp2p\.exe","(\d+)"/i)
      if (!match) continue
      addPid(pids, match[1])
    }
    return [...pids]
  } catch {
    return []
  }
}

async function listCwp2pPids(): Promise<number[]> {
  return process.platform === 'win32' ? listWindowsCwp2pPids() : listUnixCwp2pPids()
}

function samePidList(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false
  const a = [...left].sort((x, y) => x - y)
  const b = [...right].sort((x, y) => x - y)
  return a.every((pid, index) => pid === b[index])
}

export class DaemonManager {
  private process: ChildProcess | null = null
  private logs: string[] = []
  private starting = false
  private lastError: string | null = null
  private listeners = new Set<(state: DaemonState) => void>()
  private activeSocketPath: string | null = null
  private otherCwp2pPids: number[] = []

  getState(): DaemonState {
    return {
      running: Boolean(this.process && this.process.exitCode === null && !this.process.killed),
      starting: this.starting,
      pid: this.process?.pid ?? null,
      lastError: this.lastError,
      logs: [...this.logs],
      otherCwp2pPids: [...this.otherCwp2pPids]
    }
  }

  blockedByOtherCwp2p(): boolean {
    return this.otherCwp2pPids.length > 0 && !this.getState().running && !this.starting
  }

  async refreshOtherCwp2pPids(): Promise<number[]> {
    const ours = this.process?.pid
    const pids = (await listCwp2pPids()).filter((pid) => pid !== ours)
    if (!samePidList(pids, this.otherCwp2pPids)) {
      this.otherCwp2pPids = pids
      this.emit()
    }
    return this.otherCwp2pPids
  }

  onChange(listener: (state: DaemonState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }

  private appendLog(chunk: string): void {
    const lines = chunk.replace(/\r/g, '').split('\n').filter((line) => line.length > 0)
    this.logs.push(...lines)
    if (this.logs.length > MAX_LOG_LINES) {
      this.logs = this.logs.slice(-MAX_LOG_LINES)
    }
    this.emit()
  }

  private preferredSocketPath(): string {
    return join(runtimeDir(), commandSocketName())
  }

  private preferredStatePath(): string {
    return join(runtimeDir(), stateFileName())
  }

  private pidFilePath(): string {
    return join(runtimeDir(), 'cwp2p.pid')
  }

  socketPath(): string {
    return this.activeSocketPath ?? this.preferredSocketPath()
  }

  causewayEnv(): NodeJS.ProcessEnv {
    mkdirSync(runtimeDir(), { recursive: true })
    return {
      ...process.env,
      CWP2P_STATE: this.preferredStatePath(),
      CWP2P_SOCKET: this.socketPath()
    }
  }

  private findLiveSocket(folder: string): string | null {
    const candidates = [this.preferredSocketPath(), join(folder, commandSocketName())]
    return candidates.find((path) => existsSync(path)) ?? null
  }

  private async waitForCommandSocket(folder: string, timeoutMs = 15000): Promise<void> {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
      const found = this.findLiveSocket(folder)
      if (found) {
        this.activeSocketPath = found
        return
      }
      await sleep(150)
    }
    this.activeSocketPath = this.preferredSocketPath()
  }

  private async writePidFile(pid: number): Promise<void> {
    mkdirSync(runtimeDir(), { recursive: true })
    await writeFile(this.pidFilePath(), String(pid), 'utf8')
  }

  private async clearPidFile(): Promise<void> {
    try {
      await unlink(this.pidFilePath())
    } catch {
      // Missing is fine.
    }
  }

  private startupFailureMessage(): string {
    const bindLine = [...this.logs].reverse().find((line) => /bind:|already in use|only one usage of each socket/i.test(line))
    if (bindLine) {
      return 'Causeway is already running in the background. Stop that leftover process, then start again.'
    }
    return this.logs.at(-1) || 'Causeway exited before it was ready.'
  }

  private otherCwp2pMessage(pids: number[]): string {
    const listed = pids.join(', ')
    return `Causeway is already running outside this app (process ${listed}). Stop that process, then start here.`
  }

  private async clearStaleRuntimeFiles(): Promise<void> {
    await this.removeSocketFile()
    await this.clearPidFile()
  }

  async start(binaryPath: string, folder: string, settings: AppSettings): Promise<void> {
    if (this.getState().running || this.starting) return

    const otherPids = await this.refreshOtherCwp2pPids()
    if (otherPids.length > 0) {
      this.lastError = this.otherCwp2pMessage(otherPids)
      this.emit()
      throw new Error(this.lastError)
    }

    this.starting = true
    this.lastError = null
    this.logs = []
    this.activeSocketPath = this.preferredSocketPath()
    mkdirSync(runtimeDir(), { recursive: true })
    this.appendLog(`Starting Causeway from ${binaryPath}`)
    this.emit()

    await this.clearStaleRuntimeFiles()

    const child = spawn(binaryPath, daemonArgs(settings), {
      cwd: folder,
      env: this.causewayEnv(),
      windowsHide: true
    })

    this.process = child
    if (child.pid) await this.writePidFile(child.pid)

    child.stdout?.on('data', (chunk: Buffer) => this.appendLog(chunk.toString('utf8')))
    child.stderr?.on('data', (chunk: Buffer) => this.appendLog(chunk.toString('utf8')))
    child.on('error', (error) => {
      this.lastError = error.message
      this.appendLog(`Failed to start: ${error.message}`)
      this.starting = false
      this.process = null
      void this.clearPidFile()
      void this.refreshOtherCwp2pPids()
      this.emit()
    })
    child.on('exit', (code, signal) => {
      this.appendLog(`Causeway stopped${code !== null ? ` (code ${code})` : ''}${signal ? ` signal ${signal}` : ''}`)
      if (this.starting && code !== 0 && code !== null) {
        this.lastError = this.startupFailureMessage()
      }
      this.starting = false
      this.process = null
      void this.clearPidFile()
      void this.refreshOtherCwp2pPids()
      this.emit()
    })

    await new Promise<void>((resolve, reject) => {
      let unsub = (): void => {}
      const timeout = setTimeout(() => {
        unsub()
        this.starting = false
        this.emit()
        resolve()
      }, 12000)

      unsub = this.onChange((state) => {
        if (state.logs.some((line) => /^(ready|id:)|causeway is running|netcorenetwork id/i.test(line.trim()))) {
          clearTimeout(timeout)
          unsub()
          this.starting = false
          this.emit()
          resolve()
        }
        if (state.lastError) {
          clearTimeout(timeout)
          unsub()
          reject(new Error(state.lastError))
        }
      })
    })

    await this.waitForCommandSocket(folder)
    await this.refreshOtherCwp2pPids()
  }

  async stop(): Promise<void> {
    const child = this.process
    const pid = child?.pid
    if (!child || child.exitCode !== null) {
      this.process = null
      this.starting = false
      await this.clearStaleRuntimeFiles()
      await this.refreshOtherCwp2pPids()
      this.emit()
      return
    }

    this.appendLog('Stopping Causeway…')
    await new Promise<void>((resolve) => {
      let settled = false
      const finish = (): void => {
        if (settled) return
        settled = true
        resolve()
      }
      const killTimer = setTimeout(() => {
        if (pid && pidIsRunning(pid)) void killProcessTree(pid)
      }, 4000)
      const waitTimer = setTimeout(finish, 8000)
      child.once('exit', () => {
        clearTimeout(killTimer)
        clearTimeout(waitTimer)
        finish()
      })
      if (process.platform === 'win32' && pid) {
        void killProcessTree(pid)
      } else {
        child.kill('SIGTERM')
      }
    })
    this.process = null
    this.starting = false
    await this.removeSocketFile()
    await this.clearPidFile()
    await this.refreshOtherCwp2pPids()
    this.emit()
  }

  private async removeSocketFile(): Promise<void> {
    const socketPath = this.activeSocketPath ?? this.preferredSocketPath()
    if (existsSync(socketPath)) {
      try {
        await unlink(socketPath)
      } catch {
        // The process may already have removed it.
      }
    }
    this.activeSocketPath = null
  }
}

export const daemonManager = new DaemonManager()
