import { forwardRef } from 'react'
import type { HeightUnit, LogEntry } from '../data/db'
import { formatDate, todayISO } from '../lib/dates'
import { heightText } from '../lib/labels'
import { summaryStats } from '../lib/stats'
import HeightChart from './log/HeightChart'

export const SHEET_WIDTH = 760

interface Props {
  plantName: string
  unit: HeightUnit
  entries: LogEntry[]
  photoUrls: Map<number, string>
}

/** A plain, light version of the dashboard. Rendered off-screen and saved as an image. */
const ExportSheet = forwardRef<HTMLDivElement, Props>(function ExportSheet({ plantName, unit, entries, photoUrls }, ref) {
  return (
    <div ref={ref} className="export-sheet" style={{ width: SHEET_WIDTH }}>
      <h1>Planting Log: {plantName}</h1>
      <p className="export-meta">Made with Bright Ideas on {formatDate(todayISO())}.</p>
      {entries.length > 0 && (
        <>
          <dl className="export-stats">
            {summaryStats(entries, unit).map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
                {s.note && <dd className="export-note">{s.note}</dd>}
              </div>
            ))}
          </dl>
          <h2>Height over time ({unit})</h2>
          <HeightChart entries={entries} unit={unit} width={SHEET_WIDTH - 64} interactive={false} />
        </>
      )}
      <h2>Entries (newest first)</h2>
      {entries.map((e) => (
        <div key={e.id} className="export-entry">
          {photoUrls.get(e.id) && <img src={photoUrls.get(e.id)} alt="" />}
          <div>
            <h3>{formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {heightText(e, unit)}</h3>
            {e.note && <p>{e.note}</p>}
          </div>
        </div>
      ))}
    </div>
  )
})

export default ExportSheet
