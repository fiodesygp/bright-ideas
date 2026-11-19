import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { PageHeader } from '../components/PageHeading'
import CircuitCard from '../components/learn/CircuitCard'
import FlipCard from '../components/learn/FlipCard'
import QuickCheck from '../components/learn/QuickCheck'
import { PartThumbnail } from '../components/diagram/parts'
import { AlertIcon, BulbIcon } from '../components/Icons'
import { connectContent, learn, type ComponentCard } from '../content'
import '../components/chips.css'
import './Learn.css'

/** The "How to connect" section; #/connect links land here (see App). */
export const CONNECT_HASH = '#how-to-connect'

export default function Learn() {
  const { hash } = useLocation()

  // Arriving at #/learn#how-to-connect: show that section and move focus to its heading.
  useEffect(() => {
    if (hash !== CONNECT_HASH) return
    const heading = document.getElementById('how-to-connect')
    heading?.scrollIntoView({ block: 'start' })
    heading?.focus({ preventScroll: true })
  }, [hash])

  return (
    <div className="page learn-page">
      <PageHeader title="Learn the Components">
        <p className="page-intro">{learn.intro}</p>
      </PageHeader>

      <section className="section" aria-labelledby="parts-title">
        <h2 id="parts-title">Parts in your kit</h2>
        <ul className="card-grid">
          {learn.components.map((c) => (
            <li key={c.id} className="learn-item">
              <PartCard card={c} />
              <QuickCheck check={c.quickCheck} />
            </li>
          ))}
        </ul>
      </section>

      <section className="section connect-section" aria-labelledby="how-to-connect">
        <h2 id="how-to-connect" tabIndex={-1}>{connectContent.title}</h2>
        <p className="page-intro">{connectContent.intro}</p>
        <div className="callout callout-tip">
          <AlertIcon />
          <p><strong>{connectContent.wireRuleLabel}</strong> {connectContent.wireRule}</p>
        </div>
        <ul className="circuit-list">
          {connectContent.circuits.map((c, i) => (
            <li key={c.id}>
              <CircuitCard circuit={c} number={i + 1} />
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="concepts-title">
        <h2 id="concepts-title">Big ideas</h2>
        <p className="page-intro">{learn.conceptsIntro}</p>
        <ul className="card-grid">
          {learn.concepts.map((c) => (
            <li key={c.id}>
              <FlipCard
                title={c.title}
                flipLabel="Find out"
                front={
                  <div className="concept-front">
                    <BulbIcon />
                    <p>{c.teaser}</p>
                  </div>
                }
                back={
                  <>
                    <p>{c.body}</p>
                    <div className="callout callout-success">
                      <BulbIcon />
                      <p>{c.example}</p>
                    </div>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PartCard({ card }: { card: ComponentCard }) {
  return (
    <FlipCard
      title={card.name}
      flipLabel="How to connect it"
      front={
        <>
          <div className="part-photo">
            {card.photo ? (
              <img src={`${import.meta.env.BASE_URL}${card.photo}`} alt={card.imageAlt} />
            ) : (
              <PartThumbnail type={card.partType} label={card.imageAlt} />
            )}
          </div>
          <p><strong>What it does:</strong> {card.whatItDoes}</p>
        </>
      }
      back={
        <>
          <h4>Polarity (+ and −)</h4>
          <p>{card.polarity}</p>
          <h4>How to connect</h4>
          <p>{card.howToConnect}</p>
          <div className="callout callout-tip">
            <AlertIcon />
            <p><strong>Watch out:</strong> {card.watchOut}</p>
          </div>
        </>
      }
    />
  )
}
