import { useId, useRef, useState, type FormEvent } from 'react'
import type { QuickCheck as QC } from '../../content'
import { AlertIcon, CheckIcon } from '../Icons'

type Result = 'none' | 'empty' | 'right' | 'wrong'

/** One question with a hint and unlimited retries. No score is kept. */
export default function QuickCheck({ check }: { check: QC }) {
  const [choice, setChoice] = useState('')
  const [result, setResult] = useState<Result>('none')
  const id = useId()
  const firstRef = useRef<HTMLInputElement>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!choice) setResult('empty')
    else setResult(choice === check.answer ? 'right' : 'wrong')
  }

  function retry() {
    setChoice('')
    setResult('none')
    firstRef.current?.focus()
  }

  const locked = result === 'right' || result === 'wrong'

  return (
    <form className="quick-check" onSubmit={onSubmit}>
      <fieldset className="choice-group" disabled={locked}>
        <legend>
          <span className="qc-label">Quick check</span>
          {check.question}
        </legend>
        <div className="chips chips-column">
          {check.options.map((o, i) => (
            <label key={o.id} className="chip">
              <input
                ref={i === 0 ? firstRef : undefined}
                type="radio"
                name={id}
                value={o.id}
                checked={choice === o.id}
                onChange={() => {
                  setChoice(o.id)
                  if (result === 'empty') setResult('none')
                }}
              />
              <span className="chip-mark" aria-hidden="true" />
              <span className="chip-text">{o.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div role="status" className="qc-result">
        {result === 'right' && (
          <div className="callout callout-success">
            <CheckIcon />
            <p><strong>Correct!</strong> {check.explain}</p>
          </div>
        )}
        {result === 'wrong' && (
          <div className="callout callout-tip">
            <AlertIcon />
            <p><strong>Not quite. Hint:</strong> {check.hint}</p>
          </div>
        )}
        {result === 'empty' && <p className="field-error"><AlertIcon /> Pick an answer first.</p>}
      </div>

      {result === 'wrong' ? (
        <button type="button" className="btn btn-secondary" onClick={retry}>Try again</button>
      ) : result === 'right' ? (
        <button type="button" className="btn btn-ghost" onClick={retry}>Reset question</button>
      ) : (
        <button type="submit" className="btn btn-secondary">Check my answer</button>
      )}
    </form>
  )
}
