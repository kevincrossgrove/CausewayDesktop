import { spawn, type ChildProcess } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { join } from 'path'
import type { AppSettings, DaemonState } from '@shared/types'
import { commandSocketName, daemonArgs, runtimeDir, stateFileName } from './platform'

const MAX_LOG_LINES = 400

export class DaemonManager {
  private process: ChildProcess | null = null
  private logs: string[] = []
  private starting = false
  private lastError: string | null = null
  private listeners = new Set<(state: DaemonState) => void>()
  private activeSocketPath: string | null = null

  getState(): DaemonState {
    return {
      running: Boolean(this.process && this.process.exitCode === null && !this.process.killed),
      starting: this.starting,
      pid: this.process?.pid ?? null,
      lastError: this.lastError,
      logs: [...this.logs]
    }
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
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    this.activeSocketPath = this.preferredSocketPath()
  }

  async start(binaryPath: string, folder: string, settings: AppSettings): Promise<void> {
    if (this.getState().running || this.starting) return

    this.starting = true
    this.lastError = null
    this.logs = []
    this.activeSocketPath = this.preferredSocketPath()
    mkdirSync(runtimeDir(), { recursive: true })
    this.appendLog(`Starting Causeway from ${binaryPath}`)
    this.emit()

    const socketPath = this.preferredSocketPath()
    if (process.platform !== 'win32' && existsSync(socketPath)) {
      try {
        await unlink(socketPath)
      } catch {
        // If the old socket is still in use, spawn will fail with a clear error.
      }
    }

    const child = spawn(binaryPath, daemonArgs(settings), {
      cwd: folder,
      env: this.causewayEnv(),
      windowsHide: true
    })

    this.process = child

    child.stdout?.on('data', (chunk: Buffer) => this.appendLog(chunk.toString('utf8')))
    child.stderr?.on('data', (chunk: Buffer) => this.appendLog(chunk.toString('utf8')))
    child.on('error', (error) => {
      this.lastError = error.message
      this.appendLog(`Failed to start: ${error.message}`)
      this.starting = false
      this.process = null
      this.emit()
    })
    child.on('exit', (code, signal) => {
      this.appendLog(`Causeway stopped${code !== null ? ` (code ${code})` : ''}${signal ? ` signal ${signal}` : ''}`)
      this.starting = false
      this.process = null
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
  }

  async stop(): Promise<void> {
    const child = this.process
    if (!child || child.exitCode !== null) {
      this.process = null
      this.starting = false
      await this.removeSocketFile()
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
        if (child.exitCode === null) child.kill('SIGKILL')
      }, 4000)
      const waitTimer = setTimeout(finish, 7000)
      child.once('exit', () => {
        clearTimeout(killTimer)
        clearTimeout(waitTimer)
        finish()
      })
      child.kill(process.platform === 'win32' ? undefined : 'SIGTERM')
    })
    this.process = null
    this.starting = false
    await this.removeSocketFile()
    this.emit()
  }

  private async removeSocketFile(): Promise<void> {
    if (process.platform === 'win32') return
    const socketPath = this.activeSocketPath ?? this.preferredSocketPath()
    if (!existsSync(socketPath)) return
    try {
      await unlink(socketPath)
    } catch {
      // The process may already have removed it.
    }
    this.activeSocketPath = null
  }
}

export const daemonManager = new DaemonManager()
