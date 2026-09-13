'use strict'

import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { addGamePath, removeGamePath, getAllSavedGamePaths, clearAllGamePaths } from './gameStorage'
import { createSchema, insertEval, getEvals } from './evalCache'
// IPC handler to clear all saved game paths
ipcMain.handle('clear-all-game-paths', async () => {
  try {
    const success = clearAllGamePaths()
    return { success }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow

// eslint-disable-next-line node/no-path-concat
const winURL = process.env.NODE_ENV === 'development' ? 'http://localhost:9080' : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    // height: 563,
    useContentSize: true,
    // width: 1000,
    // fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      // allow access to Node globals
      contextIsolation: false
    }
  })

  mainWindow.maximize()
  mainWindow.loadURL(winURL)
  mainWindow.removeMenu()
  /*
  mainWindow.webContents.on('before-input-event', (_, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
  */
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
ipcMain.handle('openPGN', async () => {
  let _result
  await dialog.showOpenDialog({
    title: 'Open PGN file',
    properties: ['openFile'],
    filters: [
      { name: 'PGN Files', extensions: ['pgn'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      _result = result
      // console.log(result)
      // localStorage.PGNPath = JSON.stringify(result.filePaths[0])
      // this.openPGNFromPath(result.filePaths[0])
    }
  }).catch(err => {
    console.log(err)
  })
  return _result
})

ipcMain.handle('openEPD', async () => {
  let _result
  await dialog.showOpenDialog({
    title: 'Open EPD file',
    properties: ['openFile'],
    filters: [
      { name: 'Epd Files', extensions: ['epd'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      _result = result
    }
  }).catch(err => {
    console.log(err)
  })
  return _result
})

ipcMain.handle('selectPath', async () => {
  let _result
  await dialog.showOpenDialog({ properties: ['openFile'] }).then(result => {
    if (!result.canceled) {
      _result = result
    }
  })
  return _result
})

ipcMain.handle('selectSVG', async () => {
  let _result
  await dialog.showOpenDialog({
    title: 'Choose Custom Board Style',
    properties: ['openFile'],
    filters: [{ name: 'SVG Files', extensions: ['svg'] }]
  }).then(result => {
    if (!result.canceled) {
      _result = result
    }
  })
  return _result
})

ipcMain.handle('selectImage', async () => {
  let _result
  await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'svg', 'tif', 'tiff', 'webp'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      _result = result
    }
  })
  return _result
})

app.whenReady().then(() => {
  createSchema()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.handle('eval-cache-get', async (event, payload) => {
  try {
    const { positionKey, engineName } = payload || {}
    if (!positionKey || !engineName) return null
    const [name, version] = engineName.split(' ')
    const evaluation = getEvals(positionKey, name, version)
    console.log(JSON.stringify(evaluation))
    return evaluation
  } catch (err) {
    console.error('[eval-cache-get] failed', err)
  }
})

ipcMain.on('eval-cache-put', (_event, payload) => {
  try {
    insertEval(payload)
  } catch (err) {
    console.error('[eval-cache-put] failed', err)
  }
})

ipcMain.handle('show-open-dialog', async (event, options) => {
  const browserWindow = mainWindow || null
  try {
    const res = await dialog.showOpenDialog(browserWindow, options || {})
    return res
  } catch (err) {
    return { canceled: true, filePaths: [] }
  }
})

// IPC handler for save-as dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
  const browserWindow = mainWindow || null
  try {
    const res = await dialog.showSaveDialog(browserWindow, options || {})
    return res
  } catch (err) {
    return { canceled: true, filePath: '' }
  }
})

// IPC handler for writing files
ipcMain.handle('write-file', async (event, filePath, content) => {
  const fs = require('fs')
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Build and show a context menu requested from renderer. The renderer
// sends a simplified template (no functions) and we build native menu
// items whose click handlers forward a message back to the renderer.
ipcMain.handle('show-context-menu', async (event, template) => {
  try {
    if (!Array.isArray(template)) return false
    const menu = Menu.buildFromTemplate(template.map(item => {
      return {
        label: item.label,
        type: item.type,
        checked: item.checked,
        id: item.id,
        click: (menuItem, browserWindow, ev) => {
          try {
            const payload = { id: item.id, checked: menuItem.checked }
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.send('context-menu-command', payload)
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }))
    menu.popup({ window: mainWindow })
    return true
  } catch (err) {
    return false
  }
})

// IPC handler to load all saved game paths
ipcMain.handle('load-saved-games', async (event) => {
  try {
    const paths = getAllSavedGamePaths()
    return { success: true, paths }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// IPC handler to add a game path to the saved games list
ipcMain.handle('add-game-path', async (event, filePath) => {
  try {
    const success = addGamePath(filePath)
    return { success }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// IPC handler to remove a game path from the saved games list
ipcMain.handle('remove-game-path', async (event, filePath) => {
  try {
    const success = removeGamePath(filePath)
    return { success }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// IPC handler to read a PGN file content
ipcMain.handle('read-pgn-file', async (event, filePath) => {
  const fs = require('fs')
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return { success: true, content }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
