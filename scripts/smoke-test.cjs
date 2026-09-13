const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const os = require('os')
const root = path.resolve(__dirname, '..')
const binary = process.env.LIGROUND_TEST_ENGINE || path.join(root, 'engines', process.platform === 'win32' ? 'stockfish.exe' : 'stockfish')
if (!fs.existsSync(binary)) throw new Error('Install the Stockfish binary with npm ci or set LIGROUND_TEST_ENGINE before running the smoke test.')
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'liground-smoke-'))
app.setPath('userData', profile)
const errors = []
process.on('exit', () => { try { fs.rmSync(profile, { recursive: true, force: true }) } catch {} })
process.on('uncaughtException', err => { console.error(err); app.exit(1) })
setTimeout(() => { console.error('SMOKE TIMEOUT', errors); app.exit(1) }, 45000)
app.whenReady().then(async () => {
  const seed = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } })
  const seedFile = path.join(profile, 'seed.html')
  fs.writeFileSync(seedFile, '<html></html>')
  await seed.loadFile(seedFile)
  await seed.webContents.executeJavaScript(`localStorage.engines = JSON.stringify({'Test Stockfish': { binary: ${JSON.stringify(binary)}, cwd: ${JSON.stringify(path.join(root, 'engines'))}, variants: ['chess', 'janggi', 'janggimodern', 'janggicasual'] }}); localStorage.muteButton = 'true'`)
  app.on('browser-window-created', (_, win) => {
    win.webContents.on('console-message', ({ level, message }) => { if (level === 'error') { errors.push(message); console.log('RENDERER', message.slice(0, 1000)) } })
    win.webContents.on('did-finish-load', async () => {
      try {
        const result = await win.webContents.executeJavaScript(`(${rendererSmokeTest.toString()})(${JSON.stringify(path.join(profile, 'smoke.pgn'))})`)
        if (process.env.LIGROUND_SMOKE_SCREENSHOT) fs.writeFileSync(process.env.LIGROUND_SMOKE_SCREENSHOT, (await win.webContents.capturePage()).toPNG())
        console.log('SMOKE RESULT', JSON.stringify(result))
        console.log('SMOKE ERRORS', JSON.stringify(errors))
        app.exit(errors.length ? 1 : 0)
      } catch (err) { console.error('SMOKE FAILED', err); app.exit(1) }
    })
  })
  require(process.env.LIGROUND_TEST_APP || path.join(root, 'dist/electron/main.js'))
  seed.destroy()
}).catch(err => { console.error(err); app.exit(1) })

// Runs inside the compiled renderer, exercising the real Vue 3 component tree.
async function rendererSmokeTest (savePath) {
  for (let i = 0; i < 150; i++) {
    const app = document.querySelector('#app').__vue_app__
    if (app?.config.globalProperties.$store?.getters.initialized) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const store = document.querySelector('#app').__vue_app__.config.globalProperties.$store
  const assert = (v, m) => { if (!v) throw new Error(m) }
  assert(store.getters.initialized, 'Store initialized')
  assert(document.querySelector('cg-board'), 'Board rendered')
  const findComponent = (name) => {
    const visit = vnode => {
      if (!vnode) return null
      if (Array.isArray(vnode)) { for (const child of vnode) { const found = visit(child); if (found) return found } return null }
      if (vnode.component) { if (vnode.component.type.name === name) return vnode.component.proxy; const found = visit(vnode.component.subTree); if (found) return found }
      return Array.isArray(vnode.children) ? visit(vnode.children) : null
    }
    return visit(document.querySelector('#app').__vue_app__._container._vnode)
  }
  const tick = () => new Promise(resolve => setTimeout(resolve, 200))
  assert(findComponent('EvalPlot'), 'Evaluation chart component')
  const assertBoardStyles = async () => {
    await tick()
    assert(getComputedStyle(document.querySelector('.cg-board-wrap')).backgroundImage !== 'none', 'Board background stylesheet loaded')
    assert(getComputedStyle(document.querySelector('cg-board piece')).backgroundImage !== 'none', 'Piece stylesheet loaded')
  }
  await assertBoardStyles()
  for (let i = 0; i < 50 && !store.getters.engineOptions.length; i++) await tick()
  assert(store.getters.engineOptions.length > 0, 'UCI engine handshake')
  findComponent('AnalysisContainer').onSwitch()
  for (let i = 0; i < 50 && store.getters.depth === 0; i++) await tick()
  assert(store.getters.depth > 0, 'Engine analysis updates Vuex')
  assert(store.getters.multipv.some(line => line.pv?.length), 'Principal variation received')
  findComponent('AnalysisContainer').onSwitch()
  await tick()
  const before = store.getters.fen
  await store.dispatch('push', { move: 'e2e4', prev: undefined })
  assert(store.getters.fen !== before, 'Move updates FEN')
  assert(store.getters.moves.length === 1 && store.getters.moves[0].uci === 'e2e4', 'Move history')
  const { ipcRenderer } = require('electron')
  const payload = { positionKey: 'smoke-position', engineName: 'Smoke 1', multipv: 1, depth: 22, cp: 42, wdl: [400, 500, 100], pv: 'e2e4', updatedAt: Date.now() }
  ipcRenderer.send('eval-cache-put', payload)
  const rows = await ipcRenderer.invoke('eval-cache-get', { positionKey: payload.positionKey, engineName: payload.engineName })
  assert(rows.length === 1 && rows[0].cp_eval === 42, 'SQLite cache roundtrip')
  assert((await ipcRenderer.invoke('write-file', savePath, '[Event "Smoke"]\n\n1. e4 e5 *')).success, 'Write PGN')
  assert((await ipcRenderer.invoke('add-game-path', savePath)).success, 'Register saved game')
  assert((await ipcRenderer.invoke('load-saved-games')).paths.includes(savePath), 'Saved registry')
  assert((await ipcRenderer.invoke('read-pgn-file', savePath)).content.includes('e4'), 'Read PGN')
  const menu = findComponent('MenuBar')
  assert(menu, 'MenuBar instance')
  menu.convertAndStorePgn('[Event "Smoke"]\n[White "White"]\n[Black "Black"]\n\n1. e4 {first move} e5 *\n')
  assert(store.getters.loadedGames.length === 1, 'PGN import')
  await store.dispatch('loadGame', { game: store.getters.loadedGames[0] })
  await tick()
  assert(store.getters.moves.length === 2, 'PGN moves loaded')
  assert(store.getters.moves[0].comment === 'first move', 'PGN comments')
  const head = findComponent('AnalysisHead')
  head.openStartModal(); await tick()
  assert(findComponent('StartGameModal'), 'Start-game modal')
  head.closeStartModal(); await tick()
  head.openPgnBrowser(); await tick()
  assert(findComponent('PgnBrowser'), 'PGN browser')
  head.showPgnModal = false; await tick()
  store.commit('viewAnalysis', false); await tick()
  assert(findComponent('SettingsTab'), 'Settings mounted')
  findComponent('SettingsTab').cancel(); await tick()
  assert(findComponent('AnalysisView'), 'Analysis remounted')
  for (const variant of ['janggi', 'janggimodern', 'janggicasual']) {
    store.commit('variant', variant); store.commit('newBoard', { is960: false, fen: '' }); await store.dispatch('updateBoard'); await tick()
    assert(store.getters.isJanggi, 'Janggi classification ' + variant)
    await assertBoardStyles()
    const board = findComponent('GameBoards')
    const old = store.getters.fen
    assert(board.canPass, 'Pass enabled ' + variant)
    board.passMove(); await tick()
    assert(store.getters.fen !== old && store.getters.moves.length === 1, 'Janggi pass ' + variant)
  }
  return { initialized: store.getters.initialized, fen: store.getters.fen, cacheRows: rows.length, body: document.body.innerText.slice(0, 500) }
}
