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
const { pvShapes, pvLabels } = load('src/renderer/engine/pvShapes.js')
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
const labels = pvLabels(shapes, 9, 10, 'white')
const flipped = pvLabels(shapes, 9, 10, 'black')
assert.equal(labels.map(label => label.order).join(','), '1,2,3,4,5,6')
for (let i = 0; i < labels.length; i++) {
  assert(Math.abs(labels[i].x + flipped[i].x - 100) < 0.001)
  assert(Math.abs(labels[i].y + flipped[i].y - 100) < 0.001)
}
const repeats = pvLabels(pvShapes('e2e2 e2e2 e2e2'), 9, 10, 'white')
assert.equal(new Set(repeats.map(label => `${label.x},${label.y}`)).size, 3)
assert.equal(pvLabels([], 9, 10, 'white').length, 0)
const corner = pvLabels(pvShapes('i1i1 i1i1 i1i1 i1i1 i1i1 i1i1'), 9, 10, 'white')
assert.equal(new Set(corner.map(label => `${label.x},${label.y}`)).size, 6)
assert(corner.every(label => label.x > 0 && label.x < 100 && label.y > 0 && label.y < 100))
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
