const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { transformSync } = require('@babel/core')

function load (file, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const { code } = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] })
  const exports = {}
  vm.runInNewContext(code, { exports, ...globals })
  return exports
}
const { pvShapes } = load('src/renderer/engine/pvShapes.js')
const shapes = pvShapes('a10a9 i1i2 a9b9 i2i3 b9b10 i3i4 b10c10')
assert.equal(shapes.length, 6)
assert.equal(shapes[5].orig, 'a:')
assert.equal(shapes[5].dest, 'a9')
assert.equal(shapes[5].brush, 'yellow')
assert.equal(shapes[4].brush, 'red')
assert.equal(shapes[3].brush, 'green')
assert(shapes[5].modifiers.lineWidth > shapes[0].modifiers.lineWidth)
assert.equal(pvShapes('e2e2')[0].dest, undefined, 'Pass is a ring')
assert.equal(pvShapes('P@e4')[0].orig, 'e4', 'Drop is a ring')
assert.equal(pvShapes('a10a9 bad')[0].dest, 'a9')
assert.equal(pvShapes('bad').length, 0)
assert.equal(pvShapes(undefined).length, 0)
assert.equal(pvShapes('a10a9 i1i2 a9b9', 2).length, 2)
let flush
const messages = []
const { default: Sender } = load('src/renderer/engine/sender.js', {
  setInterval: fn => { flush = fn }, self: { postMessage: payload => messages.push(payload) }
})
const sender = new Sender(50)
sender.queue('info', { pv: 'a10a9', depth: 2, cp: 1 })
sender.queue('info', { multipv: 1, depth: 3, nodes: 123 })
flush()
assert.equal(messages[0].pv[0].pv, 'a10a9', 'Stats-only update does not erase PV')
assert.equal(messages[0].pv[0].multipv, 1, 'Missing MultiPV defaults to first line')
sender.queue('info', { multipv: 1, pv: 'a10b10', depth: 3 })
sender.queue('info', { multipv: 1, pv: 'a10a8', depth: 3 })
sender.queue('info', { multipv: 2, pv: 'i1i2', depth: 3 })
flush()
assert.equal(messages[1].pv[0].pv, 'a10a8', 'Latest PV at the same depth wins')
assert.equal(messages[1].pv[1].pv, 'i1i2')
console.log('Live PV regression tests passed')
