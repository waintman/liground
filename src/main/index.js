'use strict'

import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'

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
      enableRemoteModule: true,
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

  ipcMain.handle('buildFromTemplate', (event, menuTemplate) => {
    return Menu.buildFromTemplate(menuTemplate)
  })

  ipcMain.on('show-context-menu', (event) => {
    const menuTemplate = [
      {
        label: 'Group by rounds',
        type: 'checkbox',
        checked: this.groupByRound,
        click: () => {
          event.sender.send('toggleGroup', event.checked)
        }
      },
      {
        label: 'Display unsupported',
        type: 'checkbox',
        checked: this.displayUnsupported,
        click: () => {
          event.sender.send('toggleUnsupported', event.checked)
        }
      },
      {
        label: 'Open all rounds',
        type: 'normal',
        click: () => {
          event.sender.send('openAllRounds')
        }
      },
      {
        label: 'Collapse all rounds',
        type: 'normal',
        click: () => {
          event.sender.send('collapseAllRounds')
        }
      }
    ]
    const menu = Menu.buildFromTemplate(menuTemplate)
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}
app.on('ready', createWindow)

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
