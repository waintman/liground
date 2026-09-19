// UCI ranks may have two digits (a10); Chessground uses ':' for rank 10.
export function pvShapes (pv, limit = 6) {
  if (typeof pv !== 'string') return []
  const shapes = []
  for (const [index, move] of pv.trim().split(/\s+/).slice(0, limit).entries()) {
    const match = /^([a-i](?:10|[1-9]))([a-i](?:10|[1-9]))[a-z]?$/.exec(move)
    const drop = /^[a-z]@([a-i](?:10|[1-9]))$/i.exec(move)
    if (!match && !drop) break
    const orig = (match ? match[1] : drop[1]).replace('10', ':')
    const dest = match && match[2].replace('10', ':')
    shapes.unshift({
      orig,
      order: index + 1,
      ...(dest && dest !== orig ? { dest } : {}),
      brush: index === 0 ? 'yellow' : index % 2 ? 'red' : 'green',
      modifiers: { lineWidth: Math.max(3, 12 - index * 2) }
    })
  }
  return shapes
}

// Percentage coordinates keep badges aligned when the board is resized or flipped.
export function pvLabels (shapes, width, height, orientation) {
  const center = key => {
    const file = key.charCodeAt(0) - 97
    const rank = key.charCodeAt(1) - 49
    const x = (file + 0.5) / width * 100
    const y = (height - rank - 0.5) / height * 100
    return orientation === 'black' ? [100 - x, 100 - y] : [x, y]
  }
  const labels = []
  for (const shape of [...shapes].reverse()) {
    const from = center(shape.orig)
    const to = center(shape.dest || shape.orig)
    let x = from[0] + (to[0] - from[0]) * 0.4
    let y = from[1] + (to[1] - from[1]) * 0.4
    // Keep repeated moves / passes legible instead of stacking their numbers.
    const dx = x > 75 ? -3 : 3
    const dy = y > 75 ? -3 : 3
    while (labels.some(label => Math.abs(label.x - x) < 3 && Math.abs(label.y - y) < 3)) {
      x += dx
      y += dy
    }
    labels.push({ order: shape.order, brush: shape.brush, x, y })
  }
  return labels
}
