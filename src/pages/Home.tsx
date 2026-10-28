import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeading from '../components/PageHeading'
import Waves from '../components/Waves'
import { ArrowRightIcon, BookIcon, ChartIcon, LeafIcon, PlugIcon } from '../components/Icons'
import { home } from '../content'
import { CURRENT_PLANT_ID, getEntries } from '../data/db'
import { useSettings } from '../data/settings'
import { daysAgo, formatDate } from '../lib/dates'
import './Home.css'

const SECTION_ICONS: Record<string, typeof LeafIcon> = {
  '/log': LeafIcon,
  '/log/dashboard': ChartIcon,
  '/learn': BookIcon,
  '/connect': PlugIcon,
}

export default function Home() {
  const { settings } = useSettings()
  const entries = useLiveQuery(() => getEntries(CURRENT_PLANT_ID), [])
  const latest = entries?.[0]

  return (
    <div className="page home">
      <header className="hero">
        <Waves variant="hero" />
        <div className="hero-text">
          <PageHeading>{home.appName}</PageHeading>
          <p className="hero-tagline">{home.tagline}</p>
          <p className="hero-subtitle">{home.subtitle}</p>
        </div>
      </header>

      <section className="driving-question" aria-labelledby="dq-label">
        <h2 id="dq-label">{home.drivingQuestionLabel}</h2>
        <p>{home.drivingQuestion}</p>
      </section>

      <section className="section" aria-labelledby="go-label">
        <h2 id="go-label">What do you want to do?</h2>
        <ul className="home-links">
          {home.sections.map((s) => {
            const Icon = SECTION_ICONS[s.to] ?? LeafIcon
            return (
              <li key={s.to}>
                <Link to={s.to} className="home-link">
                  <span className="home-link-icon"><Icon /></span>
                  <span className="home-link-text">
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </span>
                  <ArrowRightIcon className="home-link-arrow" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {entries && (
        <section className="section card" aria-labelledby="status-label">
          <h2 id="status-label">{settings.plantName}</h2>
          {latest ? (
            <p>
              Last check: {formatDate(latest.date)} ({daysAgo(latest.date)}).{' '}
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'} so far.
            </p>
          ) : (
            <p>No log entries yet. Measure your plant and add your first entry.</p>
          )}
          <div className="btn-row">
            <Link className="btn" to="/log">{latest ? 'Add a new entry' : 'Start your log'}</Link>
            {latest && <Link className="btn btn-secondary" to="/log/dashboard">Open my Dashboard</Link>}
          </div>
        </section>
      )}
    </div>
  )
}
