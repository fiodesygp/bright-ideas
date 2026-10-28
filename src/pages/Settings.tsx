import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeading from '../components/PageHeading'
import ConfirmDialog from '../components/ConfirmDialog'
import ExportButtons from '../components/ExportButtons'
import { CheckIcon } from '../components/Icons'
import { clearAllData, db } from '../data/db'
import { useSettings } from '../data/settings'
import '../components/log/LogForm.css'
import './Settings.css'

export default function Settings() {
  const { settings, update, reset } = useSettings()
  const [name, setName] = useState(settings.plantName)
  const [confirming, setConfirming] = useState(false)
  const [cleared, setCleared] = useState(false)
  const count = useLiveQuery(() => db.entries.count(), [])

  const saveName = () => {
    const trimmed = name.trim() || 'My plant'
    setName(trimmed)
    if (trimmed !== settings.plantName) update({ plantName: trimmed })
  }

  return (
    <div className="page settings-page">
      <PageHeading>Settings</PageHeading>

      <section className="card stack" aria-labelledby="plant-title">
        <h2 id="plant-title">Your plant</h2>
        <div>
          <label className="field-label" htmlFor="plant-name">Plant name</label>
          <input
            id="plant-name"
            className="input"
            type="text"
            maxLength={40}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
        </div>
        <fieldset className="choice-group">
          <legend className="field-label">Show plant height in</legend>
          <div className="unit-toggle">
            {(['cm', 'in'] as const).map((u) => (
              <label key={u}>
                <input type="radio" name="unit" value={u} checked={settings.heightUnit === u} onChange={() => update({ heightUnit: u })} />
                <span>{u === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card stack section" aria-labelledby="export-title">
        <h2 id="export-title">Save or share your log</h2>
        <p>Make a PDF or picture of your whole log. You can print it or send it to your facilitator.</p>
        {count ? <ExportButtons /> : <p className="field-help">Add a log entry first. Then you can save it here.</p>}
      </section>

      <section className="card stack section" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Your data stays here</h2>
        <p>
          Everything you enter stays on this device. Nothing is sent over the internet. There are no accounts and no
          tracking.
        </p>
        <p>
          You have <strong>{count ?? 0}</strong> log {count === 1 ? 'entry' : 'entries'} saved.
        </p>
        <div>
          <button type="button" className="btn btn-danger" onClick={() => { setCleared(false); setConfirming(true) }}>
            Clear all data
          </button>
        </div>
        {cleared && (
          <div className="callout callout-success" role="status">
            <CheckIcon />
            <p>All data was cleared.</p>
          </div>
        )}
      </section>

      <section className="card stack section" aria-labelledby="facilitator-title">
        <h2 id="facilitator-title">For facilitators</h2>
        <ul className="facilitator-notes">
          <li>Each device keeps its own log. Students on a shared device should export before the next class clears it.</li>
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
          setName('My plant')
          setConfirming(false)
          setCleared(true)
        }}
      >
        <p>This deletes every log entry and photo, and resets your settings. You cannot undo this.</p>
        <p>Tip: save a PDF first if you want to keep a copy.</p>
      </ConfirmDialog>
    </div>
  )
}
