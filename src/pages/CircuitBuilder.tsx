import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import PageHeading from '../components/PageHeading'
import CircuitDiagram from '../components/diagram/CircuitDiagram'
import { AlertIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '../components/Icons'
import { circuitsContent } from '../content'
import NotFound from './NotFound'
import './CircuitBuilder.css'

type Outcome = 'ask' | 'yes' | 'no'

// Keyed by circuit so moving to the next circuit starts fresh at step 1.
export default function CircuitBuilderRoute() {
  const { circuitId } = useParams()
  return <CircuitBuilder key={circuitId} circuitId={circuitId} />
}

function CircuitBuilder({ circuitId }: { circuitId?: string }) {
  const circuit = circuitsContent.circuits.find((c) => c.id === circuitId)
  const [step, setStep] = useState(0)
  const [outcome, setOutcome] = useState<Outcome>('ask')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  // Move focus to the step heading after Next/Back so the new instruction is read.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (outcome !== 'ask') resultRef.current?.focus()
  }, [outcome])

  if (!circuit || circuit.status !== 'ready' || !circuit.diagram || !circuit.steps) return <NotFound />

  const { diagram, steps } = circuit
  const total = steps.length
  const isCheck = step === total
  const current = steps[Math.min(step, total - 1)]
  const doneWireIds = steps.slice(0, Math.min(step + 1, total)).flatMap((s) => (s.wire ? [s.wire] : []))
  const next = circuitsContent.circuits.find((c) => c.number > circuit.number && c.status === 'ready')

  const go = (n: number) => {
    moved.current = true
    setStep(n)
    setOutcome('ask')
  }

  const toggle = (i: number) =>
    setChecked((prev) => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })

  return (
    <div className="page circuit-page">
      <Link to="/connect" className="back-link">
        <ArrowLeftIcon width={20} height={20} /> All circuits
      </Link>
      <PageHeading>Circuit {circuit.number}: {circuit.title}</PageHeading>

      <details className="needs">
        <summary>What you need ({circuit.parts.length} items)</summary>
        <ul>{circuit.parts.map((p) => <li key={p}>{p}</li>)}</ul>
      </details>

      <div className="progress" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${(Math.min(step + 1, total) / total) * 100}%` }} />
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="step-heading">
        {isCheck ? 'Did it work?' : `Step ${step + 1} of ${total}`}
      </h2>

      <figure className="step-figure">
        <CircuitDiagram
          parts={diagram.parts}
          wires={diagram.wires}
          height={diagram.height}
          doneWireIds={doneWireIds}
          currentWireId={isCheck ? undefined : current.wire}
          highlightPartIds={isCheck ? [] : current.highlightParts}
          caption={isCheck ? 'Finished circuit' : `Step ${step + 1} of ${total}`}
          altOverride={isCheck ? undefined : current.alt}
        />
        <figcaption className="legend">
          <span><span className="swatch-line pos" aria-hidden="true" /> Red wire = <strong>+</strong> (positive)</span>
          <span><span className="swatch-line neg" aria-hidden="true" /> Black wire = <strong>−</strong> (negative)</span>
          {!isCheck && current.wire && <span><span className="swatch-glow" aria-hidden="true" /> Glow + <strong>NEW</strong> tag = add this wire now</span>}
        </figcaption>
      </figure>

      {!isCheck ? (
        <>
          <p className="instruction">{current.text}</p>
          <div className="step-nav">
            <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)} disabled={step === 0}>
              <ArrowLeftIcon width={20} height={20} /> Back
            </button>
            <button type="button" className="btn" onClick={() => go(step + 1)}>
              {step === total - 1 ? 'I am done' : 'Next'} <ArrowRightIcon width={20} height={20} />
            </button>
          </div>
        </>
      ) : (
        <>
          {outcome === 'ask' && (
            <>
              <p className="instruction">Put the panel in bright sun. Did your circuit work?</p>
              <div className="step-nav">
                <button type="button" className="btn" onClick={() => setOutcome('yes')}>
                  <CheckIcon width={20} height={20} /> Yes, it worked
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setOutcome('no')}>
                  <AlertIcon width={20} height={20} /> No, not yet
                </button>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => go(total - 1)}>
                <ArrowLeftIcon width={20} height={20} /> Back to the last step
              </button>
            </>
          )}

          {outcome === 'yes' && (
            <section aria-labelledby="result-title">
              <div className="callout callout-success">
                <CheckIcon />
                <div>
                  <h3 id="result-title" ref={resultRef} tabIndex={-1}>It works!</h3>
                  <p>{circuit.success}</p>
                </div>
              </div>
              <div className="step-nav">
                {next && <Link className="btn" to={`/connect/${next.id}`}>Next: {next.title} <ArrowRightIcon width={20} height={20} /></Link>}
                <Link className="btn btn-secondary" to="/connect">All circuits</Link>
              </div>
            </section>
          )}

          {outcome === 'no' && (
            <section aria-labelledby="result-title">
              <h3 id="result-title" ref={resultRef} tabIndex={-1}>Let's find the problem</h3>
              <p>Check each item. Tick it when you have checked it.</p>
              <ul className="checklist">
                {(circuit.troubleshooting ?? []).map((item, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="field-help" aria-live="polite">
                {checked.size} of {circuit.troubleshooting?.length ?? 0} checked
              </p>
              <div className="step-nav">
                <button type="button" className="btn" onClick={() => setOutcome('yes')}>
                  <CheckIcon width={20} height={20} /> It works now
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setChecked(new Set()); go(0) }}>
                  Start over
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
