import { spawn } from 'child_process'
import type { CommandResult } from '@shared/types'

export function runCausewayCommand(options: {
  binaryPath: string
  folder: string
  args: string[]
  env: NodeJS.ProcessEnv
  timeoutMs?: number
}): Promise<CommandResult> {
  const { binaryPath, folder, args, env, timeoutMs = 20000 } = options

  return new Promise((resolve) => {
    const child = spawn(binaryPath, args, {
      cwd: folder,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const finish = (result: CommandResult): void => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      setTimeout(() => {
        if (child.exitCode === null && !child.killed) child.kill('SIGKILL')
      }, 1500)
      finish({
        ok: false,
        stdout,
        stderr,
        error: `Command timed out: cwp2p ${args.join(' ')}`
      })
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      finish({
        ok: false,
        stdout,
        stderr,
        error: error.message
      })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const combined = `${stderr}\n${stdout}`.trim()
      finish({
        ok: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: code === 0 ? undefined : combined || `cwp2p exited with code ${code}`
      })
    })
  })
}
