import { useState } from 'react'
import type { Circuit } from '../../content'
import { connectContent as text } from '../../content'
import { fill } from '../../lib/labels'
import CircuitDiagram from '../diagram/CircuitDiagram'
import { CheckIcon, WarningIcon } from '../Icons'

/**
 * One circuit as a disclosure card, closed at first so the page stays short.
 * The diagram is drawn only while the card is open.
 */
export default function CircuitCard({ circuit: c, number }: { circuit: Circuit; number: number }) {
  const [open, setOpen] = useState(false)

  return (
    <details className="circuit-card" id={`circuit-${c.id}`} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="circuit-num" aria-hidden="true">{number}</span>
        <span className="circuit-head">
          <h3>
            <span className="visually-hidden">Circuit {number}: </span>
            {c.title}
          </h3>
          <span className="circuit-summary">{c.summary}</span>
        </span>
      </summary>

      {open && (
        <div className="circuit-body">
          <h4>{text.needLabel}</h4>
          <ul className="circuit-parts">
            {c.parts.map((p) => <li key={p}>{p}</li>)}
          </ul>

          <h4>{text.diagramLabel}</h4>
          <CircuitDiagram diagram={c.diagram} title={fill(text.diagramTitle, { title: c.title })} />

          <h4>{text.stepsLabel}</h4>
          <ol className="circuit-steps">
            {c.steps.map((s, i) => (
              <li key={i} className={s.kind === 'safety' ? 'circuit-step-safety' : undefined}>
                {s.kind === 'safety' && <WarningIcon width={22} height={22} />}
                <span>
                  {s.kind === 'safety' && <strong>{text.safetyLabel} </strong>}
                  {s.text}
                </span>
              </li>
            ))}
          </ol>

          <div className="callout callout-success">
            <CheckIcon />
            <p><strong>{text.successLabel}:</strong> {c.success}</p>
          </div>

          <h4>{text.troubleLabel}</h4>
          <ul className="circuit-trouble">
            {c.troubleshooting.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}
    </details>
  )
}
