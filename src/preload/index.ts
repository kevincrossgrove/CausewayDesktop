import { contextBridge, ipcRenderer } from 'electron'
import type {
  Appearance,
  AppSnapshot,
  CommandResult,
  ConnectionMode,
  FolderConnectResult,
  ListeningPort,
  LogLevel
} from '@shared/types'

export type CausewayApi = {
  getSnapshot: () => Promise<AppSnapshot>
  onSnapshot: (listener: (snapshot: AppSnapshot) => void) => () => void
  openExternal: (url: string) => Promise<void>
  pickFolder: () => Promise<FolderConnectResult>
  connectFolder: (folder: string) => Promise<FolderConnectResult>
  unlinkFolder: () => Promise<AppSnapshot>
  start: () => Promise<{ ok: boolean; error?: string }>
  stop: () => Promise<{ ok: boolean }>
  refresh: () => Promise<AppSnapshot>
  setMode: (mode: ConnectionMode) => Promise<AppSnapshot>
  setBindAddress: (bindAddress: string) => Promise<AppSnapshot>
  setLogLevel: (logLevel: LogLevel) => Promise<AppSnapshot>
  setAppearance: (appearance: Appearance) => Promise<AppSnapshot>
  setShareName: (shareName: string) => Promise<AppSnapshot>
  addPeer: (name: string, peerId: string, mappings: string) => Promise<CommandResult>
  removePeer: (idOrName: string) => Promise<CommandResult>
  addPeerPort: (idOrName: string, mapping: string) => Promise<CommandResult>
  removePeerPort: (idOrName: string, mapping: string) => Promise<CommandResult>
  addAllowedPort: (port: string) => Promise<CommandResult>
  listeningPorts: () => Promise<ListeningPort[]>
  runCli: (line: string) => Promise<CommandResult>
}

const api: CausewayApi = {
  getSnapshot: () => ipcRenderer.invoke('causeway:snapshot'),
  onSnapshot: (listener) => {
    const wrapped = (_event: unknown, snapshot: AppSnapshot): void => listener(snapshot)
    ipcRenderer.on('causeway:snapshot', wrapped)
    return () => ipcRenderer.removeListener('causeway:snapshot', wrapped)
  },
  openExternal: (url) => ipcRenderer.invoke('causeway:open-external', url),
  pickFolder: () => ipcRenderer.invoke('causeway:pick-folder'),
  connectFolder: (folder) => ipcRenderer.invoke('causeway:connect-folder', folder),
  unlinkFolder: () => ipcRenderer.invoke('causeway:unlink-folder'),
  start: () => ipcRenderer.invoke('causeway:start'),
  stop: () => ipcRenderer.invoke('causeway:stop'),
  refresh: () => ipcRenderer.invoke('causeway:refresh'),
  setMode: (mode) => ipcRenderer.invoke('causeway:set-mode', mode),
  setBindAddress: (bindAddress) => ipcRenderer.invoke('causeway:set-bind-address', bindAddress),
  setLogLevel: (logLevel) => ipcRenderer.invoke('causeway:set-log-level', logLevel),
  setAppearance: (appearance) => ipcRenderer.invoke('causeway:set-appearance', appearance),
  setShareName: (shareName) => ipcRenderer.invoke('causeway:set-share-name', shareName),
  addPeer: (name, peerId, mappings) => ipcRenderer.invoke('causeway:peer-add', name, peerId, mappings),
  removePeer: (idOrName) => ipcRenderer.invoke('causeway:peer-remove', idOrName),
  addPeerPort: (idOrName, mapping) => ipcRenderer.invoke('causeway:peer-port-add', idOrName, mapping),
  removePeerPort: (idOrName, mapping) => ipcRenderer.invoke('causeway:peer-port-remove', idOrName, mapping),
  addAllowedPort: (port) => ipcRenderer.invoke('causeway:port-add', port),
  listeningPorts: () => ipcRenderer.invoke('causeway:listening-ports'),
  runCli: (line: string) => ipcRenderer.invoke('causeway:run-cli', line)
}

contextBridge.exposeInMainWorld('causeway', api)
