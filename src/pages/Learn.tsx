import { PageHeader } from '../components/PageHeading'
import FlipCard from '../components/learn/FlipCard'
import QuickCheck from '../components/learn/QuickCheck'
import { PartThumbnail } from '../components/diagram/parts'
import { AlertIcon, BulbIcon } from '../components/Icons'
import { learn, type ComponentCard } from '../content'
import '../components/chips.css'
import './Learn.css'

export default function Learn() {
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
