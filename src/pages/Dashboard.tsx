import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '../components/PageHeading'
import ConfirmDialog from '../components/ConfirmDialog'
import ExportButtons from '../components/ExportButtons'
import PhotoViewer from '../components/PhotoViewer'
import Waves from '../components/Waves'
import HeightChart from '../components/log/HeightChart'
import EntryCard from '../components/log/EntryCard'
import { ArrowLeftIcon, LeafIcon } from '../components/Icons'
import { logContent } from '../content'
import { CURRENT_PLANT_ID, db, getEntries, type HeightUnit, type LogEntry } from '../data/db'
import { useSettings } from '../data/settings'
import { formatDate } from '../lib/dates'
import { heightText } from '../lib/labels'
import { chronological, photoAlt, summaryStats } from '../lib/stats'
import { useObjectUrl } from '../lib/useObjectUrl'
import './Log.css'
import './Dashboard.css'

export default function Dashboard() {
  const { settings } = useSettings()
  const { heightUnit: unit, plantName } = settings
  const entries = useLiveQuery(() => getEntries(CURRENT_PLANT_ID), [])
  const [viewing, setViewing] = useState<LogEntry | null>(null)
  const [toDelete, setToDelete] = useState<LogEntry | null>(null)

  const withPhotos = entries ? chronological(entries).filter((e) => e.photo) : []

  return (
    <div className="page dashboard-page">
      <PageHeader title="My Dashboard">
        <p className="page-intro">{logContent.dashboardIntro}</p>
      </PageHeader>
      <Link to="/log" className="back-link">
        <ArrowLeftIcon width={20} height={20} /> Back to Planting Log
      </Link>

      {entries && entries.length === 0 && (
        <section className="empty-state" aria-labelledby="empty-title">
          <Waves variant="empty" />
          <div className="empty-state-text">
            <LeafIcon className="empty-icon" />
            <h2 id="empty-title">{logContent.emptyTitle}</h2>
            <p>{logContent.emptyText}</p>
            <Link className="btn" to="/log">Add my first entry</Link>
          </div>
        </section>
      )}

      {entries && entries.length > 0 && (
        <>
          <section className="section" aria-labelledby="summary-title">
            <h2 id="summary-title">{plantName} at a glance</h2>
            <ul className="stat-grid">
              {summaryStats(entries, unit).map((s) => (
                <li key={s.label} className="stat">
                  <span className="stat-label">{s.label}</span>
                  <span className="stat-value">{s.value}</span>
                  {s.note && <span className="stat-note">{s.note}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section className="section" aria-labelledby="chart-title">
            <h2 id="chart-title">Height over time</h2>
            <div className="card">
              <HeightChart entries={entries} unit={unit} />
              {entries.length === 1 && <p className="field-help">Add one more entry to see a line.</p>}
            </div>
          </section>

          <section className="section" aria-labelledby="photos-title">
            <h2 id="photos-title">Photo timeline</h2>
            {withPhotos.length === 0 ? (
              <p className="page-intro">No photos yet. Add one with your next entry to watch your plant change.</p>
            ) : (
              <>
                <p className="page-intro">Oldest first. Tap a photo to see it bigger.</p>
                <ol className="photo-timeline">
                  {withPhotos.map((e) => (
                    <li key={e.id}>
                      <PhotoTile entry={e} unit={unit} plantName={plantName} onOpen={() => setViewing(e)} />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <section className="section" aria-labelledby="all-title">
            <h2 id="all-title" tabIndex={-1}>All entries</h2>
            <p className="page-intro">Newest first. {entries.length} {entries.length === 1 ? 'entry' : 'entries'}.</p>
            <ol className="timeline">
              {entries.map((e) => (
                <li key={e.id}>
                  <EntryCard entry={e} unit={unit} plantName={plantName} editable onDelete={setToDelete} onViewPhoto={setViewing} />
                </li>
              ))}
            </ol>
          </section>

          <section className="section card share-card" aria-labelledby="share-title">
            <h2 id="share-title">Share with your family</h2>
            <p>Save your dashboard as a PDF or a picture. Then print it or send it.</p>
            <ExportButtons />
          </section>
        </>
      )}

      <PhotoViewer entry={viewing} unit={unit} plantName={plantName} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this entry?"
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await db.entries.delete(toDelete.id)
          setToDelete(null)
          document.getElementById('all-title')?.focus()
        }}
      >
        <p>The entry from {toDelete && formatDate(toDelete.date)} and its photo will be gone for good.</p>
      </ConfirmDialog>
    </div>
  )
}

function PhotoTile({ entry, unit, plantName, onOpen }: { entry: LogEntry; unit: HeightUnit; plantName: string; onOpen: () => void }) {
  const url = useObjectUrl(entry.photo)
  return (
    <figure className="photo-tile">
      <button type="button" onClick={onOpen}>
        {url && <img src={url} alt={photoAlt(entry, unit, plantName)} />}
        <span className="visually-hidden"> View larger</span>
      </button>
      <figcaption>
        <strong>{formatDate(entry.date, { month: 'short', day: 'numeric' })}</strong> · {heightText(entry, unit)}
        {entry.note && <span className="photo-note">{entry.note}</span>}
      </figcaption>
    </figure>
  )
}
