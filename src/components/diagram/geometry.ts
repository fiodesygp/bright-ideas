import type { DiagramPart, DiagramWire, PartType } from '../../content'

// Each part is drawn around (0,0). Terminal offsets are where clips attach.

export const TERMINALS: Record<PartType, Record<string, { x: number; y: number; name: string }>> = {
  panel: {
    pos: { x: -50, y: 46, name: 'red (+) wire' },
    neg: { x: 50, y: 46, name: 'black (−) wire' },
  },
  led: {
    anode: { x: -10, y: 36, name: 'long leg (+)' },
    cathode: { x: 10, y: 28, name: 'short leg (−)' },
  },
  resistor: {
    a: { x: 0, y: -36, name: 'top end' },
    b: { x: 0, y: 36, name: 'bottom end' },
  },
  motor: {
    pos: { x: -50, y: 0, name: '+ tab' },
    neg: { x: 50, y: 0, name: '− tab' },
  },
  pump: {
    pos: { x: -50, y: 0, name: 'red (+) wire' },
    neg: { x: 50, y: 0, name: 'black (−) wire' },
  },
  clip: {},
}

/** Box around each drawing, for highlights and card thumbnails: [x, y, w, h] */
export const BOUNDS: Record<PartType, [number, number, number, number]> = {
  panel: [-96, -36, 192, 90],
  led: [-28, -22, 56, 64],
  resistor: [-16, -40, 32, 80],
  motor: [-58, -48, 116, 74],
  pump: [-58, -48, 116, 76],
  clip: [-80, -26, 160, 52],
}

type Pt = [number, number]

function resolve(parts: DiagramPart[], ref: string) {
  const [partId, term] = ref.split('.')
  const part = parts.find((p) => p.id === partId)
  const t = part && TERMINALS[part.type][term]
  if (!part || !t) throw new Error(`Unknown terminal "${ref}" in circuits.json`)
  return { part, term: t, pt: [part.x + t.x, part.y + t.y] as Pt }
}

export function wirePoints(parts: DiagramPart[], w: DiagramWire): Pt[] {
  const a = resolve(parts, w.from).pt
  const b = resolve(parts, w.to).pt
  if (w.via) return [a, ...w.via, b]
  if (a[0] === b[0] || a[1] === b[1]) return [a, b]
  // Default route: down, across, then down.
  const midY = Math.round((a[1] + b[1]) / 2)
  return [a, [a[0], midY], [b[0], midY], b]
}

export function longestSegmentMid(pts: Pt[]): Pt {
  let best: Pt = pts[0]
  let bestLen = -1
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (len > bestLen) {
      bestLen = len
      best = [(pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2]
    }
  }
  return best
}

function describeWire(parts: DiagramPart[], w: DiagramWire) {
  const a = resolve(parts, w.from)
  const b = resolve(parts, w.to)
  const color = w.side === '+' ? 'red (+)' : 'black (−)'
  return `a ${color} clip from the ${a.part.label} ${a.term.name} to the ${b.part.label} ${b.term.name}`
}

/** Builds the text alternative for a diagram from its data. */
export function describeDiagram(props: {
  parts: DiagramPart[]
  wires: DiagramWire[]
  doneWireIds: string[]
  currentWireId?: string
  highlightPartIds?: string[]
  caption: string
}) {
  const { parts, wires, doneWireIds, currentWireId, highlightPartIds = [], caption } = props
  const byId = (id: string) => wires.find((w) => w.id === id)!
  const out = [`${caption}. Parts: ${parts.map((p) => p.label).join(', ')}.`]
  if (highlightPartIds.length) {
    out.push(`Look at the ${highlightPartIds.map((id) => parts.find((p) => p.id === id)?.label).join(' and ')}.`)
  }
  if (currentWireId) out.push(`New wire: ${describeWire(parts, byId(currentWireId))}.`)
  const done = doneWireIds.filter((id) => id !== currentWireId)
  out.push(done.length ? `Already connected: ${done.map((id) => describeWire(parts, byId(id))).join('; ')}.` : 'No other wires connected yet.')
  return out.join(' ')
}
