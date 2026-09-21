import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import {
  DOWNLOAD_URL,
  LEARN_URL,
  type AppSettings,
  type AppSnapshot,
  type CommandResult,
  type Appearance,
  type ConnectionMode,
  type FolderConnectResult,
  type LogLevel
} from '@shared/types'
import { applyNativeAppearance } from './appearance'
import { daemonManager } from './daemonManager'
import { parseIdFromLogs, parseAllowedPorts, parseStatus, peersFromCli } from './parseCauseway'
import {
  binaryName,
  foundCandidateFolders,
  downloadName,
  platformLabel,
  suggestedPeerName
} from './platform'
import {
  cliMappingArgs,
  formatMapping,
  mappingsError,
  parseOneMapping,
  peerIdError,
  peerNameError,
  sanitizePeerName
} from '@shared/peerInput'
import { listListeningTcpPorts } from './listListeningPorts'
import { resolveCausewayInstall } from './resolveInstall'
import { cliTimeoutMs, parseCwp2pLine } from '@shared/cwp2pCommand'
import { runCausewayCommand } from './runCommand'
import { loadSettings, saveSettings } from './settingsStore'

let settings: AppSettings
let cachedStatusRaw = ''
let cachedPeersRaw = ''
let cachedVersion: string | null = null

function binaryPathFromSettings(): string | null {
  if (!settings.causewayFolder) return null
  const path = join(settings.causewayFolder, binaryName())
  return existsSync(path) ? path : null
}

async function requireInstall(): Promise<{ folder: string; binaryPath: string }> {
  const binaryPath = binaryPathFromSettings()
  if (!settings.causewayFolder || !binaryPath) {
    throw new Error('Connect your unzipped Causeway folder first.')
  }
  return { folder: settings.causewayFolder, binaryPath }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isSocketNotReady(result: CommandResult): boolean {
  const text = `${result.error ?? ''} ${result.stderr} ${result.stdout}`
  return /no such file or directory|connection refused|connect: /i.test(text)
}

async function runCli(args: string[], timeoutMs?: number): Promise<CommandResult> {
  if (daemonManager.blockedByOtherCwp2p()) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      error: 'Causeway is already running outside this app. Stop that process first.'
    }
  }
  const { folder, binaryPath } = await requireInstall()
  return runCausewayCommand({
    binaryPath,
    folder,
    args,
    env: daemonManager.causewayEnv(),
    timeoutMs
  })
}

async function runCliWhenReady(args: string[]): Promise<CommandResult> {
  let last = await runCli(args)
  for (let attempt = 0; attempt < 10 && isSocketNotReady(last); attempt += 1) {
    await sleep(250)
    last = await runCli(args)
  }
  return last
}

export async function buildSnapshot(): Promise<AppSnapshot> {
  await daemonManager.refreshOtherCwp2pPids()
  const foundCandidates = foundCandidateFolders()
  const parsed = cachedStatusRaw ? parseStatus(cachedStatusRaw) : null
  const logId = parseIdFromLogs(daemonManager.getState().logs.join('\n'))
  const status = parsed
    ? { ...parsed, localId: parsed.localId || logId }
    : logId
      ? {
          running: daemonManager.getState().running,
          nodeCount: null,
          mode: null,
          localId: logId,
          publicEndpoint: null,
          nat: null,
          connectedPeers: null,
          totalPeers: null,
          recoveryWarning: null
        }
      : null

  const peers = peersFromCli(cachedPeersRaw, cachedStatusRaw)

  return {
    platform: process.platform,
    platformLabel: platformLabel(),
    downloadName: downloadName(),
    binaryName: binaryName(),
    downloadUrl: DOWNLOAD_URL,
    learnUrl: LEARN_URL,
    settings,
    binaryPath: binaryPathFromSettings(),
    daemon: daemonManager.getState(),
    status,
    statusRaw: cachedStatusRaw,
    peers,
    peersRaw: cachedPeersRaw,
    version: cachedVersion,
    candidateFolders: foundCandidates,
    suggestedPeerName: suggestedPeerName() || 'my-computer',
    allowedPorts: parseAllowedPorts(cachedStatusRaw)
  }
}

async function refreshStatusAndPeers(): Promise<void> {
  if (!binaryPathFromSettings() || !daemonManager.getState().running) {
    return
  }
  const status = await runCliWhenReady(['status'])
  if (status.ok) {
    cachedStatusRaw = status.stdout
  } else if (!isSocketNotReady(status)) {
    cachedStatusRaw = [status.stdout, status.stderr, status.error].filter(Boolean).join('\n')
  }
  const peers = await runCliWhenReady(['peer', 'list'])
  if (peers.ok) {
    cachedPeersRaw = peers.stdout
  } else if (!isSocketNotReady(peers)) {
    cachedPeersRaw = [peers.stdout, peers.stderr, peers.error].filter(Boolean).join('\n')
  }
}

async function connectFolder(selectedPath: string): Promise<FolderConnectResult> {
  try {
    const { folder, binaryPath } = await resolveCausewayInstall(selectedPath)
    const version = await runCausewayCommand({
      binaryPath,
      folder,
      args: ['version'],
      env: process.env,
      timeoutMs: 8000
    })
    if (!version.ok) {
      const detail = version.error ?? version.stderr ?? version.stdout
      const gatekeeper =
        process.platform === 'darwin'
          ? ' If macOS blocked it, open System Settings → Privacy & Security and click Open Anyway, then try again.'
          : process.platform === 'win32'
            ? ' If Windows SmartScreen blocked it, choose Run anyway and try again.'
            : ''
      return {
        ok: false,
        error: `Found ${binaryName()} but could not run it. ${detail}${gatekeeper}`
      }
    }

    settings = { ...settings, causewayFolder: folder }
    await saveSettings(settings)
    cachedVersion = version.stdout.split(/\r?\n/)[0]?.trim() ?? version.stdout
    return {
      ok: true,
      folder,
      binaryPath,
      version: cachedVersion
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function broadcastSnapshot(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  void buildSnapshot().then((snapshot) => {
    if (!window.isDestroyed()) {
      window.webContents.send('causeway:snapshot', snapshot)
    }
  })
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('causeway:snapshot', async () => buildSnapshot())

  ipcMain.handle('causeway:open-external', async (_event, url: string) => {
    const local = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/i.test(url)
    if (local || url.startsWith('https://')) {
      await shell.openExternal(url)
    }
  })

  ipcMain.handle('causeway:pick-folder', async () => {
    const window = getWindow()
    const dialogOptions = {
      title: 'Connect unzipped Causeway folder',
      properties: ['openDirectory' as const],
      defaultPath: settings.causewayFolder ?? app.getPath('desktop')
    }
    const result = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, error: 'No folder selected.' } satisfies FolderConnectResult
    }
    return connectFolder(result.filePaths[0])
  })

  ipcMain.handle('causeway:connect-folder', async (_event, folder: string) => {
    return connectFolder(folder)
  })

  ipcMain.handle('causeway:unlink-folder', async () => {
    await daemonManager.stop()
    cachedStatusRaw = ''
    cachedPeersRaw = ''
    cachedVersion = null
    settings = { ...settings, causewayFolder: null }
    await saveSettings(settings)
    return buildSnapshot()
  })

  ipcMain.handle('causeway:start', async () => {
    try {
      const { folder, binaryPath } = await requireInstall()
      await daemonManager.start(binaryPath, folder, settings)
      await refreshStatusAndPeers()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('causeway:stop', async () => {
    await daemonManager.stop()
    cachedStatusRaw = ''
    cachedPeersRaw = ''
    return { ok: true }
  })

  ipcMain.handle('causeway:refresh', async () => {
    await refreshStatusAndPeers()
    return buildSnapshot()
  })

  ipcMain.handle('causeway:set-mode', async (_event, mode: ConnectionMode) => {
    const wasRunning = daemonManager.getState().running
    settings = { ...settings, connectionMode: mode }
    await saveSettings(settings)
    if (wasRunning) {
      await daemonManager.stop()
      const { folder, binaryPath } = await requireInstall()
      await daemonManager.start(binaryPath, folder, settings)
      await refreshStatusAndPeers()
    }
    return buildSnapshot()
  })

  ipcMain.handle('causeway:set-bind-address', async (_event, bindAddress: string) => {
    settings = { ...settings, bindAddress }
    await saveSettings(settings)
    return buildSnapshot()
  })

  ipcMain.handle('causeway:set-log-level', async (_event, logLevel: LogLevel) => {
    settings = { ...settings, logLevel }
    await saveSettings(settings)
    return buildSnapshot()
  })

  ipcMain.handle('causeway:set-appearance', async (_event, appearance: Appearance) => {
    settings = { ...settings, appearance }
    await saveSettings(settings)
    applyNativeAppearance(appearance, getWindow())
    return buildSnapshot()
  })

  ipcMain.handle('causeway:set-share-name', async (_event, shareName: string) => {
    const name = sanitizePeerName(shareName)
    const problem = peerNameError(name)
    if (problem) return buildSnapshot()
    settings = { ...settings, shareName: name }
    await saveSettings(settings)
    return buildSnapshot()
  })

  ipcMain.handle('causeway:peer-add', async (_event, name: string, peerId: string, mappings: string) => {
    const cleanName = sanitizePeerName(name)
    const nameProblem = peerNameError(cleanName)
    if (nameProblem) return { ok: false, stdout: '', stderr: '', error: nameProblem }
    const idProblem = peerIdError(peerId)
    if (idProblem) return { ok: false, stdout: '', stderr: '', error: idProblem }
    const mappingProblem = mappingsError(mappings)
    if (mappingProblem) return { ok: false, stdout: '', stderr: '', error: mappingProblem }
    const args = ['peer', 'add', cleanName, peerId.trim().toLowerCase()]
    if (mappings.trim()) args.push(cliMappingArgs(mappings).join(','))
    const result = await runCli(args)
    await refreshStatusAndPeers()
    return result
  })

  ipcMain.handle('causeway:peer-remove', async (_event, idOrName: string) => {
    const result = await runCli(['peer', 'remove', idOrName.trim()])
    await refreshStatusAndPeers()
    return result
  })

  ipcMain.handle('causeway:peer-port-add', async (_event, idOrName: string, mapping: string) => {
    const parsed = parseOneMapping(mapping)
    if (!parsed) {
      return {
        ok: false,
        stdout: '',
        stderr: '',
        error: 'Use local-port:remote-port, like 1111:11434.'
      }
    }
    const result = await runCli(['peer', 'port', 'add', idOrName.trim(), formatMapping(parsed)])
    await refreshStatusAndPeers()
    return result
  })

  ipcMain.handle('causeway:peer-port-remove', async (_event, idOrName: string, mapping: string) => {
    const parsed = parseOneMapping(mapping)
    if (!parsed) {
      return {
        ok: false,
        stdout: '',
        stderr: '',
        error: 'That row is not a real mapping.'
      }
    }
    const result = await runCli(['peer', 'port', 'remove', idOrName.trim(), formatMapping(parsed)])
    await refreshStatusAndPeers()
    return result
  })

  ipcMain.handle('causeway:port-add', async (_event, port: string) => {
    const result = await runCli(['port', 'add', port.trim()])
    await refreshStatusAndPeers()
    return result
  })

  ipcMain.handle('causeway:listening-ports', async () => listListeningTcpPorts())

  ipcMain.handle('causeway:run-cli', async (_event, line: string) => {
    if (typeof line !== 'string') {
      return { ok: false, stdout: '', stderr: '', error: 'Type a cwp2p command.' } satisfies CommandResult
    }
    const parsed = parseCwp2pLine(line)
    if (!parsed.ok) {
      return { ok: false, stdout: '', stderr: '', error: parsed.error } satisfies CommandResult
    }
    try {
      const result = await runCli(parsed.args, cliTimeoutMs(parsed.args))
      await refreshStatusAndPeers()
      return result
    } catch (error) {
      return {
        ok: false,
        stdout: '',
        stderr: '',
        error: error instanceof Error ? error.message : String(error)
      } satisfies CommandResult
    }
  })

  daemonManager.onChange(() => broadcastSnapshot(getWindow()))
}

export async function initAppState(): Promise<void> {
  settings = await loadSettings()
  applyNativeAppearance(settings.appearance)
  if (settings.causewayFolder && existsSync(join(settings.causewayFolder, binaryName()))) {
    try {
      const version = await runCausewayCommand({
        binaryPath: join(settings.causewayFolder, binaryName()),
        folder: settings.causewayFolder,
        args: ['version'],
        env: process.env,
        timeoutMs: 8000
      })
      if (version.ok) {
        cachedVersion = version.stdout.split(/\r?\n/)[0]?.trim() ?? version.stdout
      }
    } catch {
      cachedVersion = null
    }
  }
}
