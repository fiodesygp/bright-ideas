import type { PartType } from '../../content'
import { BOUNDS } from './geometry'
import './parts.css'

const RED = 'var(--wire-red)'
const BLACK = 'var(--wire-black)'
const METAL = '#5f6f67'

function Sign({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="part-sign">{children}</text>
  )
}

export function PartDrawing({ type }: { type: PartType }) {
  switch (type) {
    case 'panel':
      return (
        <g>
          <rect x={-90} y={-30} width={180} height={60} rx={4} fill="#1d3557" stroke="#0d1b2a" strokeWidth={2} />
          {[-45, 0, 45].map((x) => <line key={x} x1={x} x2={x} y1={-30} y2={30} stroke="#5b8bb5" strokeWidth={1.5} />)}
          <line x1={-90} x2={90} y1={0} y2={0} stroke="#5b8bb5" strokeWidth={1.5} />
          <line x1={-50} x2={-50} y1={30} y2={46} stroke={RED} strokeWidth={4} />
          <line x1={50} x2={50} y1={30} y2={46} stroke={BLACK} strokeWidth={4} />
          <Sign x={-38} y={47}>+</Sign>
          <Sign x={38} y={47}>−</Sign>
        </g>
      )
    case 'led':
      return (
        <g>
          <line x1={-10} x2={-10} y1={14} y2={36} stroke={METAL} strokeWidth={3} />
          <line x1={10} x2={10} y1={14} y2={28} stroke={METAL} strokeWidth={3} />
          <path d="M-15 14 V-2 A15 15 0 0 1 15 -2 V14 Z" fill="#ef5350" stroke="#7f1d1d" strokeWidth={2} />
          <rect x={-18} y={11} width={36} height={5} rx={1} fill="#c62828" stroke="#7f1d1d" strokeWidth={1.5} />
          <Sign x={-21} y={36}>+</Sign>
          <Sign x={21} y={30}>−</Sign>
        </g>
      )
    case 'resistor':
      return (
        <g>
          <line x1={0} x2={0} y1={-36} y2={36} stroke={METAL} strokeWidth={3} />
          <rect x={-9} y={-22} width={18} height={44} rx={7} fill="#e8d3a8" stroke="#8b6d3f" strokeWidth={2} />
          {/* brown, black, brown, gold = 100 Ω */}
          <rect x={-9} y={-15} width={18} height={4} fill="#6d4c41" />
          <rect x={-9} y={-7} width={18} height={4} fill="#212121" />
          <rect x={-9} y={1} width={18} height={4} fill="#6d4c41" />
          <rect x={-9} y={11} width={18} height={4} fill="#b8901c" />
        </g>
      )
    case 'motor':
      return (
        <g>
          <rect x={-50} y={-4} width={22} height={8} rx={2} fill="#b0bec5" stroke={METAL} strokeWidth={1.5} />
          <rect x={28} y={-4} width={22} height={8} rx={2} fill="#b0bec5" stroke={METAL} strokeWidth={1.5} />
          <line x1={0} x2={0} y1={-20} y2={-36} stroke={METAL} strokeWidth={3} />
          <ellipse cx={-14} cy={-38} rx={14} ry={5} fill="#81d4fa" stroke="#01579b" strokeWidth={1.5} />
          <ellipse cx={14} cy={-38} rx={14} ry={5} fill="#81d4fa" stroke="#01579b" strokeWidth={1.5} />
          <circle cx={0} cy={-38} r={4} fill="#01579b" />
          <rect x={-30} y={-20} width={60} height={40} rx={8} fill="#cfd8dc" stroke="#455a64" strokeWidth={2} />
          <text x={0} y={6} textAnchor="middle" className="part-sign">M</text>
          <Sign x={-40} y={-10}>+</Sign>
          <Sign x={40} y={-10}>−</Sign>
        </g>
      )
    case 'pump':
      // Wires leave the top so the clips stay above the water.
      return (
        <g>
          <line x1={-14} x2={-14} y1={-22} y2={-66} stroke={RED} strokeWidth={4} />
          <line x1={14} x2={14} y1={-22} y2={-66} stroke={BLACK} strokeWidth={4} />
          <path d="M26 -6 H40 V-76 H64" fill="none" stroke="#006064" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={-26} y={-22} width={52} height={44} rx={10} fill="#b2ebf2" stroke="#006064" strokeWidth={2} />
          <path d="M0 -12 C6 -4 9 1 9 5 A9 9 0 0 1 -9 5 C-9 1 -6 -4 0 -12 Z" fill="#0277bd" />
          <Sign x={-27} y={-46}>+</Sign>
          <Sign x={27} y={-46}>−</Sign>
        </g>
      )
    case 'water':
      return (
        <g>
          <path d="M-48 -26 Q-36 -31 -24 -26 T0 -26 T24 -26 T48 -26 L43 34 Q43 40 37 40 L-37 40 Q-43 40 -43 34 Z" fill="#b3e5fc" />
          <path d="M-50 -40 L-44 34 Q-43 41 -36 41 L36 41 Q43 41 44 34 L50 -40" fill="none" stroke="#455a64" strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      )
    case 'clip':
      return (
        <g>
          <path d="M-52 0 C-20 -26 20 26 52 0" fill="none" stroke={RED} strokeWidth={5} />
          <Jaw x={-52} flip={false} />
          <Jaw x={52} flip />
        </g>
      )
  }
}

function Jaw({ x, flip }: { x: number; flip: boolean }) {
  return (
    <g transform={`translate(${x} 0) scale(${flip ? 1 : -1} 1)`}>
      <path d="M0 -6 L26 -14 L26 -8 L4 -2 Z" fill="#b0bec5" stroke={METAL} strokeWidth={1.5} />
      <path d="M0 6 L26 14 L26 8 L4 2 Z" fill="#b0bec5" stroke={METAL} strokeWidth={1.5} />
      <path d="M8 -4 l3 3 l3 -4 l3 3 l3 -4 M8 4 l3 -3 l3 4 l3 -3 l3 4" fill="none" stroke={METAL} strokeWidth={1.2} />
      <rect x={-6} y={-7} width={10} height={14} rx={3} fill={RED} />
    </g>
  )
}

/** Stand-alone drawing of one part, used as a photo placeholder on cards. */
export function PartThumbnail({ type, label }: { type: PartType; label: string }) {
  const [x, y, w, h] = BOUNDS[type]
  const pad = 10
  return (
    <svg className="part-thumb" viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`} role="img" aria-label={label}>
      <PartDrawing type={type} />
    </svg>
  )
}
