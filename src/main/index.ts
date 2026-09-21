import { app, BrowserWindow, dialog, Menu, nativeImage, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { daemonManager } from './daemonManager'
import { initAppState, registerIpc } from './ipc'
import { windowBackground } from './appearance'
import appIconPath from '../../resources/icon.png?asset'

app.setName('Causeway Desktop')
process.title = 'Causeway Desktop'

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      createWindow()
      return
    }
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
}

let mainWindow: BrowserWindow | null = null
let allowClose = false
let quitPromptOpen = false

function causewayIsUp(): boolean {
  const state = daemonManager.getState()
  return state.running || state.starting
}

async function confirmStopCauseway(window: BrowserWindow | null): Promise<boolean> {
  if (!causewayIsUp()) return true

  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    buttons: ['Quit and stop Causeway', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: 'Causeway is running',
    message: 'Are you sure you want to quit?',
    detail:
      'Causeway is still running. Quitting this app will stop it and disconnect any peers until you start it again.'
  }

  const result =
    window && !window.isDestroyed()
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options)
  return result.response === 0
}

async function stopCausewayThenQuit(): Promise<void> {
  if (allowClose || quitPromptOpen) return
  quitPromptOpen = true
  try {
    const confirmed = await confirmStopCauseway(mainWindow)
    if (!confirmed) return
    await daemonManager.stop()
    allowClose = true
    app.quit()
  } finally {
    quitPromptOpen = false
  }
}

function installAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: 'Causeway Desktop',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ] satisfies Electron.MenuItemConstructorOptions[])
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function appIcon(): Electron.NativeImage {
  return nativeImage.createFromPath(appIconPath)
}

function createWindow(): void {
  const icon = appIcon()
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 840,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Causeway Desktop',
    backgroundColor: windowBackground(),
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (allowClose) return
    if (!causewayIsUp()) return
    event.preventDefault()
    void stopCausewayThenQuit()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  if (!gotTheLock) return
  electronApp.setAppUserModelId('network.netcore.causeway-desktop')
  app.setAboutPanelOptions({
    applicationName: 'Causeway Desktop',
    applicationVersion: app.getVersion(),
    copyright: 'NetcoreNetwork',
    iconPath: appIconPath
  })
  installAppMenu()
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window, { zoom: true })
  })

  await initAppState()
  registerIpc(() => mainWindow)
  nativeTheme.on('updated', () => {
    mainWindow?.setBackgroundColor(windowBackground())
  })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  if (allowClose) return
  if (!causewayIsUp()) {
    allowClose = true
    return
  }
  event.preventDefault()
  void stopCausewayThenQuit()
})
