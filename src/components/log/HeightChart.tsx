import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fromCm, type HeightUnit, type LogEntry } from '../../data/db'
import { formatDate, parseISODate } from '../../lib/dates'
import './HeightChart.css'

interface Props {
  entries: LogEntry[]
  unit: HeightUnit
  /** Fixed width for export; otherwise fills its container. */
  width?: number
  interactive?: boolean
}

const H = 220
const PAD = { top: 28, right: 18, bottom: 34, left: 44 }

// Styles are set as SVG attributes (not CSS classes) so they survive image export.
const C = { grid: '#e3e8e0', axis: '#6b7a72', ink: '#48534d', line: '#1f6b3a', surface: '#ffffff' }
const tickProps = { fill: C.ink, fontSize: 12 }

function niceMax(v: number) {
  if (v <= 0) return 5
  const step = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step
  return 10 * step
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString()

/** Single-series line chart of plant height over time. */
export default function HeightChart({ entries, unit, width, interactive = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState(340)
  const W = width ?? measured
  const [selected, setSelected] = useState<number | null>(null)
  const descId = useId()

  useEffect(() => {
    if (width || !wrapRef.current) return
    const ro = new ResizeObserver(([e]) => setMeasured(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [width])

  // Oldest to newest; same-day entries keep the order they were saved.
  const points = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((e) => ({ date: e.date, t: parseISODate(e.date).getTime(), v: fromCm(e.heightCm, unit) }))

  if (points.length === 0) return null

  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const span = t1 - t0 || 1
  const yMax = niceMax(Math.max(...points.map((p) => p.v)))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (t: number) => PAD.left + (t1 === t0 ? innerW / 2 : ((t - t0) / span) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax)

  const sel = selected ?? points.length - 1
  const active = points[Math.min(sel, points.length - 1)]
  const first = points[0]
  const last = points[points.length - 1]
  const summary =
    points.length === 1
      ? `One entry: ${fmt(first.v)} ${unit} on ${formatDate(first.date)}.`
      : `Height went from ${fmt(first.v)} ${unit} on ${formatDate(first.date)} to ${fmt(last.v)} ${unit} on ${formatDate(last.date)}, over ${points.length} entries.`

  function nearest(clientX: number) {
    const rect = wrapRef.current!.querySelector('svg')!.getBoundingClientRect()
    const px = ((clientX - rect.left) / rect.width) * W
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(points[best].t) - px)) best = i
    })
    return best
  }

  function onKey(e: KeyboardEvent) {
    const keys: Record<string, number> = { ArrowLeft: sel - 1, ArrowRight: sel + 1, Home: 0, End: points.length - 1 }
    if (e.key in keys) {
      e.preventDefault()
      setSelected(Math.max(0, Math.min(points.length - 1, keys[e.key])))
    }
  }

  // Thin x labels so they never collide: first, last, and a middle one if there is room.
  const xLabelIdx = points.length === 1 ? [0] : innerW > 300 && points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1]

  const svg = (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="height-chart-svg">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.axis : C.grid} strokeWidth={1} />
          <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" {...tickProps}>{fmt(v)}</text>
        </g>
      ))}
      <text x={PAD.left - 8} y={10} textAnchor="end" {...tickProps} fontWeight={700}>{unit}</text>
      {xLabelIdx.map((i, k) => (
        <text
          key={i}
          x={x(points[i].t)}
          y={H - 10}
          textAnchor={points.length === 1 ? 'middle' : k === 0 ? 'start' : k === xLabelIdx.length - 1 ? 'end' : 'middle'}
          {...tickProps}
        >
          {formatDate(points[i].date, { month: 'short', day: 'numeric' })}
        </text>
      ))}
      {interactive && (
        <line x1={x(active.t)} x2={x(active.t)} y1={PAD.top} y2={PAD.top + innerH} stroke={C.axis} strokeWidth={1} strokeDasharray="3 3" />
      )}
      {points.length > 1 && (
        <polyline points={points.map((p) => `${x(p.t)},${y(p.v)}`).join(' ')} fill="none" stroke={C.line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(p.t)} cy={y(p.v)} r={interactive && p === active ? 6.5 : 4.5} fill={C.line} stroke={C.surface} strokeWidth={2} />
      ))}
    </svg>
  )

  if (!interactive) return <div className="height-chart">{svg}</div>

  return (
    <div className="height-chart" ref={wrapRef}>
      <p className="hc-readout" aria-live="polite">
        <strong>{formatDate(active.date)}:</strong> {fmt(active.v)} {unit}
      </p>
      <div
        className="hc-plot"
        role="group"
        tabIndex={0}
        aria-label="Height chart. Use the left and right arrow keys to move between entries."
        aria-describedby={descId}
        onKeyDown={onKey}
        onPointerMove={(e: PointerEvent) => setSelected(nearest(e.clientX))}
        onPointerDown={(e: PointerEvent) => setSelected(nearest(e.clientX))}
      >
        {svg}
      </div>
      <p id={descId} className="visually-hidden">{summary}</p>
      <details className="hc-table">
        <summary>Show the numbers as a table</summary>
        <table>
          <caption className="visually-hidden">Plant height by date</caption>
          <thead>
            <tr><th scope="col">Date</th><th scope="col">Height ({unit})</th></tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p, i) => (
              <tr key={i}><td>{formatDate(p.date)}</td><td>{fmt(p.v)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
