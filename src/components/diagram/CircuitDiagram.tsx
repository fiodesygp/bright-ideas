import { useId } from 'react'
import type { CircuitDiagramData, DiagramPart } from '../../content'
import { PartDrawing } from './parts'
import { describeCircuit, longestSegmentMid, partBounds, wirePoints } from './geometry'
import './CircuitDiagram.css'

// Parts sit between x=30 and x=330 in learn.json coordinates.
const VIEW_X = 30
const VIEW_W = 300

/** A finished circuit, drawn once with every wire in place. `title` names it for screen readers. */
export default function CircuitDiagram({ diagram, title }: { diagram: CircuitDiagramData; title: string }) {
  const { parts, wires, height } = diagram
  const titleId = useId()
  const descId = useId()

  return (
    <svg className="circuit-diagram" viewBox={`${VIEW_X} 0 ${VIEW_W} ${height}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>{title}</title>
      <desc id={descId}>{describeCircuit(parts, wires)}</desc>

      {parts.map((p) => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
          <g transform={p.rotate ? `rotate(${p.rotate})` : undefined}>
            <PartDrawing type={p.type} />
          </g>
          <PartLabel part={p} />
        </g>
      ))}

      {wires.map((w) => {
        const pts = wirePoints(parts, w)
        const [mx, my] = longestSegmentMid(pts)
        return (
          <g key={w.id} className={`wire wire-${w.side === '+' ? 'pos' : 'neg'}`}>
            <polyline points={pts.join(' ')} className="wire-line" />
            {[pts[0], pts[pts.length - 1]].map(([cx, cy], i) => (
              <rect key={i} x={cx - 5} y={cy - 5} width={10} height={10} rx={2} className="wire-clip" />
            ))}
            {/* + and − tags, so the wire's side never depends on color alone */}
            <rect x={mx - 13} y={my - 11} width={26} height={22} rx={11} className="wire-pill" />
            <text x={mx} y={my} dy="0.35em" textAnchor="middle" className="wire-pill-text">{w.side === '+' ? '+' : '−'}</text>
          </g>
        )
      })}
    </svg>
  )
}

function PartLabel({ part }: { part: DiagramPart }) {
  if (part.labelSide) {
    const [x, y, w, h] = partBounds(part)
    const pos = {
      above: { x: x + w / 2, y: y - 8, anchor: 'middle' },
      below: { x: x + w / 2, y: y + h + 16, anchor: 'middle' },
      left: { x: x - 8, y: y + h / 2 + 5, anchor: 'end' },
      right: { x: x + w + 8, y: y + h / 2 + 5, anchor: 'start' },
    }[part.labelSide] as { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
    return <text x={pos.x} y={pos.y} textAnchor={pos.anchor} className="part-label">{part.label}</text>
  }
  switch (part.type) {
    case 'panel':
      return <text x={0} y={5} textAnchor="middle" className="part-label part-label-inverse">{part.label}</text>
    case 'led':
      return <text x={0} y={-28} textAnchor="middle" className="part-label">{part.label}</text>
    case 'resistor':
      return part.rotate ? (
        <text x={0} y={-14} textAnchor="middle" className="part-label">{part.label}</text>
      ) : (
        <text x={-16} y={4} textAnchor="end" className="part-label">{part.label}</text>
      )
    case 'pump':
      return <text x={-70} y={14} textAnchor="end" className="part-label">{part.label}</text>
    case 'water':
      return <text x={0} y={60} textAnchor="middle" className="part-label">{part.label}</text>
    default:
      return <text x={0} y={40} textAnchor="middle" className="part-label">{part.label}</text>
  }
}
