import { useId } from 'react'
import type { DiagramPart, DiagramWire } from '../../content'
import { PartDrawing } from './parts'
import { BOUNDS, describeDiagram, longestSegmentMid, wirePoints } from './geometry'
import './CircuitDiagram.css'

interface Props {
  parts: DiagramPart[]
  wires: DiagramWire[]
  height: number
  /** Wires already connected, in order */
  doneWireIds: string[]
  /** The wire to add in this step */
  currentWireId?: string
  highlightPartIds?: string[]
  /** Short context for the description, e.g. "Step 2 of 5" */
  caption: string
  altOverride?: string
}

// Parts sit between x=30 and x=330 in circuits.json coordinates.
const VIEW_X = 30
const VIEW_W = 300

export default function CircuitDiagram(props: Props) {
  const { parts, wires, height, doneWireIds, currentWireId, highlightPartIds = [], altOverride } = props
  const titleId = useId()
  const descId = useId()
  const visible = wires.filter((w) => doneWireIds.includes(w.id) || w.id === currentWireId)

  return (
    <svg
      className="circuit-diagram"
      viewBox={`${VIEW_X} 0 ${VIEW_W} ${height}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>Circuit diagram</title>
      <desc id={descId}>{altOverride ?? describeDiagram(props)}</desc>

      {/* Glow behind the new wire */}
      {visible
        .filter((w) => w.id === currentWireId)
        .map((w) => (
          <polyline key={`halo-${w.id}`} points={wirePoints(parts, w).join(' ')} className="wire-halo" />
        ))}

      {parts.map((p) => {
        const [bx, by, bw, bh] = BOUNDS[p.type]
        return (
          <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
            {highlightPartIds.includes(p.id) && (
              <rect x={bx - 6} y={by - 6} width={bw + 12} height={bh + 12} rx={10} className="part-highlight" />
            )}
            <PartDrawing type={p.type} />
            <PartLabel part={p} />
          </g>
        )
      })}

      {visible.map((w) => {
        const pts = wirePoints(parts, w)
        const isNew = w.id === currentWireId
        const [mx, my] = longestSegmentMid(pts)
        const text = `${w.side === '+' ? '+' : '−'}${isNew ? ' NEW' : ''}`
        const pillW = isNew ? 64 : 26
        return (
          <g key={w.id} className={`wire wire-${w.side === '+' ? 'pos' : 'neg'}${isNew ? ' wire-new' : ''}`}>
            <polyline points={pts.join(' ')} className="wire-line" />
            {[pts[0], pts[pts.length - 1]].map(([cx, cy], i) => (
              <rect key={i} x={cx - 5} y={cy - 5} width={10} height={10} rx={2} className="wire-clip" />
            ))}
            <rect x={mx - pillW / 2} y={my - 11} width={pillW} height={22} rx={11} className="wire-pill" />
            <text x={mx} y={my} dy="0.35em" textAnchor="middle" className="wire-pill-text">{text}</text>
          </g>
        )
      })}
    </svg>
  )
}

function PartLabel({ part }: { part: DiagramPart }) {
  switch (part.type) {
    case 'panel':
      return <text x={0} y={5} textAnchor="middle" className="part-label part-label-inverse">{part.label}</text>
    case 'led':
      return <text x={0} y={-28} textAnchor="middle" className="part-label">{part.label}</text>
    case 'resistor':
      return <text x={-16} y={4} textAnchor="end" className="part-label">{part.label}</text>
    default:
      return <text x={0} y={40} textAnchor="middle" className="part-label">{part.label}</text>
  }
}
