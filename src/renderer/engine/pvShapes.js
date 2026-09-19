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
      ...(dest && dest !== orig ? { dest } : {}),
      brush: index === 0 ? 'yellow' : index % 2 ? 'red' : 'green',
      modifiers: { lineWidth: Math.max(3, 12 - index * 2) }
    })
  }
  return shapes
}
