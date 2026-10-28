import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeading from '../components/PageHeading'
import { ArrowRightIcon, BookIcon, LeafIcon, PlugIcon } from '../components/Icons'
import { home } from '../content'
import { CURRENT_PLANT_ID, getEntries } from '../data/db'
import { useSettings } from '../data/settings'
import { daysAgo, formatDate } from '../lib/dates'
import './Home.css'

const SECTION_ICONS: Record<string, typeof LeafIcon> = {
  '/log': LeafIcon,
  '/learn': BookIcon,
  '/connect': PlugIcon,
}

export default function Home() {
  const { settings } = useSettings()
  const entries = useLiveQuery(() => getEntries(CURRENT_PLANT_ID), [])
  const latest = entries?.[0]

  return (
    <div className="page home">
      <header className="home-hero">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="56" height="56" />
        <div>
          <PageHeading>{home.appName}</PageHeading>
          <p className="home-tagline">{home.tagline}</p>
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
            <p>No log entries yet. Check your plant and add your first entry.</p>
          )}
          <Link className="btn" to="/log">{latest ? 'Add a new entry' : 'Start your log'}</Link>
        </section>
      )}
    </div>
  )
}
