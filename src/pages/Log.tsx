import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '../components/PageHeading'
import LogForm from '../components/log/LogForm'
import EntryCard from '../components/log/EntryCard'
import { ArrowRightIcon, ChartIcon } from '../components/Icons'
import { CURRENT_PLANT_ID, getEntries } from '../data/db'
import { useSettings } from '../data/settings'
import './Log.css'

const RECENT = 3

export default function Log() {
  const { settings } = useSettings()
  const entries = useLiveQuery(() => getEntries(CURRENT_PLANT_ID), [])

  return (
    <div className="page log-page">
      <PageHeader title="Planting Log">
        <p className="page-intro">Tracking: <strong>{settings.plantName}</strong></p>
      </PageHeader>

      <Link className="btn btn-secondary btn-block dashboard-btn" to="/log/dashboard">
        <ChartIcon width={22} height={22} /> Open my Dashboard
      </Link>

      <LogForm />

      <section className="section" aria-labelledby="recent-title">
        <h2 id="recent-title">Recent entries</h2>
        {entries && entries.length > 0 ? (
          <>
            <ol className="timeline">
              {entries.slice(0, RECENT).map((e) => (
                <li key={e.id}>
                  <EntryCard entry={e} unit={settings.heightUnit} plantName={settings.plantName} />
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
    </div>
  )
}
