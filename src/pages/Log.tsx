import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '../components/PageHeading'
import LearnerBar from '../components/log/LearnerBar'
import LogForm from '../components/log/LogForm'
import EntryCard from '../components/log/EntryCard'
import { ArrowRightIcon, ChartIcon } from '../components/Icons'
import { CURRENT_PLANT_ID, getEntries } from '../data/db'
import { useSettings } from '../data/settings'
import { useLearners } from '../data/useLearners'
import { plantLabel } from '../lib/labels'
import './Log.css'

const RECENT = 3

export default function Log() {
  const { settings } = useSettings()
  const { current } = useLearners()
  const entries = useLiveQuery(() => (current ? getEntries(CURRENT_PLANT_ID, current.id) : []), [current?.id])
  const [savedId, setSavedId] = useState<number>()

  return (
    <div className="page log-page">
      <PageHeader title="Planting Log" />

      <LearnerBar />

      {current && (
        <>
          <Link className="btn btn-secondary btn-block dashboard-btn" to="/log/dashboard">
            <ChartIcon width={22} height={22} /> Open my Dashboard
          </Link>

          <LogForm key={current.id} learnerId={current.id} onSaved={setSavedId} />

          <section className="section" aria-labelledby="recent-title">
            <h2 id="recent-title">Recent entries</h2>
            {entries && entries.length > 0 ? (
              <>
                <ol className="timeline">
                  {entries.slice(0, RECENT).map((e) => (
                    <li key={e.id}>
                      <EntryCard entry={e} unit={settings.heightUnit} plantName={plantLabel(current)} fresh={e.id === savedId} />
                    </li>
                  ))}
                </ol>
                <p className="see-all">
                  <Link to="/log/dashboard">
                    {entries.length > RECENT ? `See all ${entries.length} entries` : 'See your growth chart'} on your Dashboard
                    <ArrowRightIcon width={18} height={18} />
                  </Link>
                </p>
              </>
            ) : (
              <p className="page-intro">No entries yet. Your first one will show up here.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
