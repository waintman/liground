/** Development setup for Electron and Vue 3. */
import { app } from 'electron'
import debug from 'electron-debug'
import { installExtension, VUEJS_DEVTOOLS } from 'electron-devtools-installer'

debug({ showDevTools: true })

app.whenReady().then(() => {
  installExtension(VUEJS_DEVTOOLS)
    .catch(err => console.log('Unable to install Vue Devtools:', err.message))
  require('./index')
})
