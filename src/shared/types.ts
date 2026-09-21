export const DOWNLOAD_URL = 'https://www.netcore.network/causeway'
export const LEARN_URL = 'https://www.netcore.network/learn'

export type ConnectionMode = 'wireguard' | 'data-channels'

export type LogLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug' | 'verbose'

export type Appearance = 'system' | 'light' | 'dark'

export type AppSettings = {
  causewayFolder: string | null
  connectionMode: ConnectionMode
  bindAddress: string
  logLevel: LogLevel
  appearance: Appearance
  shareName: string | null
}

export type DaemonState = {
  running: boolean
  starting: boolean
  pid: number | null
  lastError: string | null
  logs: string[]
  otherCwp2pPids: number[]
}

export type ParsedStatus = {
  running: boolean
  nodeCount: string | null
  mode: string | null
  localId: string | null
  publicEndpoint: string | null
  nat: string | null
  connectedPeers: string | null
  totalPeers: string | null
  recoveryWarning: string | null
}

export type PortMapping = {
  localPort: string
  remotePort: string
}

export type ParsedPeer = {
  name: string
  id: string
  status: string | null
  connectionType: string | null
  rtt: string | null
  selectedEndpoint: string | null
  publishedEndpoint: string | null
  mappings: PortMapping[]
  needsReAdd: boolean
  raw: string
}

export type CommandResult = {
  ok: boolean
  stdout: string
  stderr: string
  error?: string
}

export type FolderConnectResult = {
  ok: boolean
  folder?: string
  binaryPath?: string
  version?: string
  error?: string
}

export type AppPlatform = 'darwin' | 'win32' | 'linux' | string

export type ListeningPort = {
  port: number
  address: string
  processName: string
}

export type AppSnapshot = {
  platform: AppPlatform
  platformLabel: string
  downloadName: string
  binaryName: string
  downloadUrl: string
  learnUrl: string
  settings: AppSettings
  binaryPath: string | null
  daemon: DaemonState
  status: ParsedStatus | null
  statusRaw: string
  peers: ParsedPeer[]
  peersRaw: string
  version: string | null
  candidateFolders: string[]
  suggestedPeerName: string
  allowedPorts: number[]
}

export type PageId = 'status' | 'peers' | 'ports' | 'connection' | 'terminal' | 'learn' | 'settings'

export const DEFAULT_SETTINGS: AppSettings = {
  causewayFolder: null,
  connectionMode: 'wireguard',
  bindAddress: '127.0.0.1',
  logLevel: 'warning',
  appearance: 'light',
  shareName: null
}
