/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

import electron from 'electron'
import debug from 'electron-debug'
import installExtension from 'electron-devtools-installer'

const VUE3_DEVTOOLS_ID = 'nhdogjmejiglipccpnnnanhbledajbpd'
// Install `electron-debug` with `devtron`
debug({ showDevTools: true })

// Install `vue-devtools`
electron.app.on('ready', () => {
  installExtension(VUE3_DEVTOOLS_ID)
    .catch(err => console.log('Unable to install `vue-devtools`: \n', err))
})

// Require `main` process to boot app
require('./index')
