import { forwardRef } from 'react'
import type { HeightUnit, LogEntry } from '../data/db'
import { formatDate, todayISO } from '../lib/dates'
import { entryDetails, heightText } from '../lib/labels'
import HeightChart from './log/HeightChart'

export const SHEET_WIDTH = 760

interface Props {
  plantName: string
  unit: HeightUnit
  entries: LogEntry[]
  photoUrls: Map<number, string>
}

/**
 * A plain, print-friendly version of the log. Rendered off-screen and turned
 * into an image or PDF. Each [data-block] is kept whole across PDF pages.
 */
const ExportSheet = forwardRef<HTMLDivElement, Props>(function ExportSheet({ plantName, unit, entries, photoUrls }, ref) {
  return (
    <div ref={ref} className="export-sheet" style={{ width: SHEET_WIDTH }}>
      <div data-block>
        <h1>Planting Log: {plantName}</h1>
        <p className="export-meta">Made with Bright Ideas on {formatDate(todayISO())}. {entries.length} {entries.length === 1 ? 'entry' : 'entries'}.</p>
        {entries.length > 0 && (
          <>
            <h2>Height over time ({unit})</h2>
            <HeightChart entries={entries} unit={unit} width={SHEET_WIDTH - 64} interactive={false} />
          </>
        )}
        <h2>Entries (newest first)</h2>
      </div>
      {entries.map((e) => (
        <div key={e.id} data-block className="export-entry">
          <h3>
            {formatDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {heightText(e, unit)}
          </h3>
          {entryDetails(e).length > 0 && <p>{entryDetails(e).map((d) => `${d.label}: ${d.value}`).join(' · ')}</p>}
          {photoUrls.get(e.id) && <img src={photoUrls.get(e.id)} alt="" />}
          {e.note && <p>Note: {e.note}</p>}
          {e.reflection && (
            <p>
              <em>{e.promptText}</em> {e.reflection}
            </p>
          )}
        </div>
      ))}
    </div>
  )
})

export default ExportSheet
