import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeading'
import { ArrowRightIcon } from '../components/Icons'
import { circuitsContent } from '../content'
import './Connect.css'

export default function Connect() {
  return (
    <div className="page">
      <PageHeader title="Connect the Components">
        <p className="page-intro">{circuitsContent.intro}</p>
      </PageHeader>
      <div className="callout callout-tip safety">
        <p><strong>Wire colors:</strong> red always means + (positive). Black always means − (negative).</p>
      </div>

      <ol className="circuit-list">
        {circuitsContent.circuits.map((c) => {
          const ready = c.status === 'ready'
          const body = (
            <>
              <span className="circuit-num" aria-hidden="true">{c.number}</span>
              <span className="circuit-text">
                <span className="circuit-title">
                  <span className="visually-hidden">Circuit {c.number}: </span>
                  {c.title}
                </span>
                <span>{c.summary}</span>
                <span className="circuit-parts">You need: {c.parts.join(', ')}</span>
                {!ready && <span className="badge">Coming soon</span>}
              </span>
              {ready && <ArrowRightIcon className="circuit-arrow" />}
            </>
          )
          return (
            <li key={c.id}>
              {ready ? (
                <Link className="circuit-item" to={`/connect/${c.id}`}>{body}</Link>
              ) : (
                <div className="circuit-item is-soon">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
