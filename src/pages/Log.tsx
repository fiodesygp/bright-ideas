import { useState, type MouseEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeading from '../components/PageHeading'
import ConfirmDialog from '../components/ConfirmDialog'
import LogForm from '../components/log/LogForm'
import HeightChart from '../components/log/HeightChart'
import EntryCard from '../components/log/EntryCard'
import ExportButtons from '../components/ExportButtons'
import { reflectionPrompts } from '../content'
import { CURRENT_PLANT_ID, db, getEntries, type LogEntry } from '../data/db'
import { useSettings } from '../data/settings'
import { formatDate } from '../lib/dates'
import './Log.css'

export default function Log() {
  const { settings } = useSettings()
  const entries = useLiveQuery(() => getEntries(CURRENT_PLANT_ID), [])
  const [toDelete, setToDelete] = useState<LogEntry | null>(null)

  // One prompt per entry, rotating through the list in order.
  const prompt = reflectionPrompts[(entries?.length ?? 0) % reflectionPrompts.length]

  return (
    <div className="page log-page">
      <PageHeading>Planting Log</PageHeading>
      <p className="page-intro">Tracking: <strong>{settings.plantName}</strong></p>
      <nav aria-label="On this page" className="jump-links">
        <a href="#history" onClick={jump('history')}>History</a>
        <a href="#growth" onClick={jump('growth')}>Growth chart</a>
      </nav>

      {entries && <LogForm prompt={prompt} />}

      <section className="section" aria-labelledby="growth" >
        <h2 id="growth" tabIndex={-1}>Growth chart</h2>
        {entries && entries.length > 0 ? (
          <div className="card">
            <HeightChart entries={entries} unit={settings.heightUnit} />
            {entries.length === 1 && <p className="field-help">Add one more entry to see a line.</p>}
          </div>
        ) : (
          <p className="page-intro">Your chart will show up after your first entry.</p>
        )}
      </section>

      <section className="section" aria-labelledby="history">
        <h2 id="history" tabIndex={-1}>History</h2>
        {entries && entries.length > 0 ? (
          <>
            <p className="page-intro">Newest first. {entries.length} {entries.length === 1 ? 'entry' : 'entries'}.</p>
            <ol className="timeline">
              {entries.map((e) => (
                <li key={e.id}>
                  <EntryCard entry={e} unit={settings.heightUnit} onDelete={setToDelete} />
                </li>
              ))}
            </ol>
            <div className="card export-card">
              <h3>Save or share your log</h3>
              <p>Make a file you can print or send to your facilitator.</p>
              <ExportButtons />
            </div>
          </>
        ) : (
          <p className="page-intro">No entries yet.</p>
        )}
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this entry?"
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await db.entries.delete(toDelete.id)
          setToDelete(null)
          document.getElementById('history')?.focus()
        }}
      >
        <p>The entry from {toDelete && formatDate(toDelete.date)} will be gone for good.</p>
      </ConfirmDialog>
    </div>
  )
}

// Hash routing owns the URL hash, so in-page links scroll and move focus by hand.
function jump(id: string) {
  return (e: MouseEvent) => {
    e.preventDefault()
    const el = document.getElementById(id)
    el?.scrollIntoView({ block: 'start' })
    el?.focus({ preventScroll: true })
  }
}
