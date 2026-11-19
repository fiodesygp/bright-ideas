import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '../components/PageHeading'
import ConfirmDialog from '../components/ConfirmDialog'
import ExportButtons from '../components/ExportButtons'
import { CheckIcon } from '../components/Icons'
import { useAnnounce } from '../components/Announcer'
import { settingsContent as text } from '../content'
import { clearAllData, db, deleteLearner } from '../data/db'
import { useSettings, type Theme } from '../data/settings'
import { useLearners } from '../data/useLearners'
import { entriesText, fill } from '../lib/labels'
import './Settings.css'

const THEMES: [Theme, string][] = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System'],
]

export default function Settings() {
  const { settings, update, reset } = useSettings()
  const { current } = useLearners()
  const announce = useAnnounce()
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [cleared, setCleared] = useState('')
  const count = useLiveQuery(() => db.entries.count(), [])
  // The button that opened the dialog may be gone now, so focus the section
  // heading. Wait until the dialog has closed: the page behind it is inert.
  const focusHeading = useRef(false)
  useEffect(() => {
    if (!focusHeading.current || confirming || removing) return
    focusHeading.current = false
    document.getElementById('privacy-title')?.focus()
  })
  const done = (message: string) => {
    setCleared(message)
    announce(message)
    focusHeading.current = true
  }
  const myCount = useLiveQuery(() => (current ? db.entries.filter((e) => e.learnerId === current.id).count() : 0), [current?.id])

  return (
    <div className="page settings-page">
      <PageHeader title="Settings" />

      <section className="card stack" aria-labelledby="plant-title">
        <h2 id="plant-title">Your plant</h2>
        <p>
          {text.plantNote} <Link to="/log">{text.plantLink}</Link>
        </p>
        <fieldset className="plain-fieldset">
          <legend className="field-label">Measure plant height in</legend>
          <div className="segmented">
            {(['cm', 'in'] as const).map((u) => (
              <label key={u}>
                <input type="radio" name="unit" value={u} checked={settings.heightUnit === u} onChange={() => update({ heightUnit: u })} />
                <span>{u === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card stack section" aria-labelledby="look-title">
        <h2 id="look-title">Look</h2>
        <fieldset className="plain-fieldset" aria-describedby="theme-help">
          <legend className="field-label">Theme</legend>
          <p className="field-help" id="theme-help">System matches your device's light or dark setting.</p>
          <div className="segmented">
            {THEMES.map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="theme" value={value} checked={settings.theme === value} onChange={() => update({ theme: value })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card stack section" aria-labelledby="export-title">
        <h2 id="export-title">Save or share your log</h2>
        <p>Make a PDF or picture of your dashboard. You can print it or send it to your family or facilitator.</p>
        {myCount ? <ExportButtons /> : <p className="field-help">Add a log entry first. Then you can save it here.</p>}
      </section>

      <section className="card stack section" aria-labelledby="privacy-title">
        <h2 id="privacy-title" tabIndex={-1}>{text.privacyTitle}</h2>
        <p>{text.privacyText}</p>
        <p>
          You have <strong>{count ?? 0}</strong> log {count === 1 ? 'entry' : 'entries'} saved.
        </p>
        {current && (
          <div className="stack">
            <p className="field-help" id="remove-help">{fill(text.removeHelp, { name: current.name })}</p>
            <div>
              <button type="button" className="btn btn-secondary btn-danger-outline" aria-describedby="remove-help" onClick={() => { setCleared(''); setRemoving(true) }}>
                {text.removeMine}
              </button>
            </div>
          </div>
        )}
        <div>
          <button type="button" className="btn btn-danger" onClick={() => { setCleared(''); setConfirming(true) }}>
            Clear all data
          </button>
        </div>
        {cleared && (
          <div className="callout callout-success">
            <CheckIcon />
            <p>{cleared}</p>
          </div>
        )}
      </section>

      <section className="card stack section" aria-labelledby="facilitator-title">
        <h2 id="facilitator-title">For facilitators</h2>
        <ul className="facilitator-notes">
          <li>{text.facilitatorSharedDevice}</li>
          <li>After the first visit, the app works offline. Students can add it to their home screen.</li>
          <li>Card, circuit, and prompt text lives in JSON files in <code>src/content</code>. Edit them to change wording.</li>
        </ul>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Clear all data?"
        confirmLabel="Yes, clear everything"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          await clearAllData()
          reset()
          setConfirming(false)
          done('All data was cleared.')
        }}
      >
        <p>{text.clearAllText}</p>
        <p>{text.pdfTip}</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={removing}
        title={current ? fill(text.removeTitle, { name: current.name }) : ''}
        confirmLabel={text.removeConfirm}
        onCancel={() => setRemoving(false)}
        onConfirm={async () => {
          if (!current) return
          const { id, name } = current
          await deleteLearner(id)
          update({ learnerId: undefined })
          setRemoving(false)
          done(fill(text.removed, { name }))
        }}
      >
        <p>{current && fill(text.removeText, { name: current.name, count: entriesText(myCount ?? 0) })}</p>
        <p>{text.pdfTip}</p>
      </ConfirmDialog>
    </div>
  )
}
