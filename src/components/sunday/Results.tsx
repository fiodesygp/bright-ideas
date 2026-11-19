import { forwardRef, useId, useState } from 'react'
import { sundayContent as text } from '../../content'
import { fill } from '../../lib/labels'
import { passesChallenge, type ChallengeId } from '../../sim/challenges.ts'
import { compareToFullSun, pickRule } from '../../sim/feedback.ts'
import type { Design, Score, SimResult } from '../../sim/types.ts'
import type { Pred } from './Prediction'
import SaveHint from './SaveHint'

export type Run = { r: SimResult; s: Score; design: Design; pred: Pred; challenge: ChallengeId | null }

const pct = (x: number) => Math.round(x * 100)

/**
 * Sun Score, the prediction against what happened, why, and a three-step hint
 * ladder. `saved` is false when nobody is logging, so the run was not saved.
 */
const Results = forwardRef<HTMLHeadingElement, { run: Run; saved: boolean }>(function Results({ run, saved }, ref) {
  const { r, s, design: d, pred, challenge } = run
  const id = useId()
  const [hints, setHints] = useState(0)
  const res = text.results
  const total = pct(s.food + s.energy), fs = pct(s.fullSun)
  const actual = compareToFullSun(s)
  const rule = pickRule(d, r, s)
  const words = text.rules[rule.id]
  const crop = text.crops[d.crop].toLowerCase()
  const vars = { ...rule.vars, crop }
  const passed = challenge ? passesChallenge(challenge, r, s) : null

  const predText = pred.guess
    ? (pred.why
        ? fill(res.guessedBecause, { guess: res.words[pred.guess], why: text.predict.why[pred.why], actual: res.words[actual] })
        : fill(res.guessed, { guess: res.words[pred.guess], actual: res.words[actual] })) +
      ' ' + (pred.guess === actual ? res.matched : res.surprise)
    : res.skipped
  let what = fill(res.what, {
    crop, food: pct(s.food), perfect: d.days === 1 ? res.perfectDay : res.perfectWeek, fs, wh: r.energy.toFixed(1), energy: pct(s.energy),
  })
  if (challenge) what += ' ' + text.challenges[challenge][passed ? 'pass' : 'fail']

  return (
    <section className="card sd-results" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} ref={ref} tabIndex={-1}>{res.title}</h2>
      <p className="sd-total">
        <b>{total}</b> <span>{res.outOf}</span>
        {challenge && <span className={`sd-badge${passed ? ' is-pass' : ''}`}>{passed ? res.passed : res.notYet}</span>}
      </p>
      <p className="field-help">{fill(res.ref, { fs })}</p>
      {!saved && <SaveHint />}

      <div className="sd-bars">
        <div className="sd-bar">
          <span>{res.food}</span>
          <span className="sd-track" aria-hidden="true">
            <i className="sd-fill-food" style={{ width: `${Math.min(100, pct(s.food))}%` }} />
            <i className="sd-ref" style={{ left: `${Math.min(100, fs)}%` }} title={res.fullSunMark} />
          </span>
          <span>{pct(s.food)}</span>
        </div>
        <div className="sd-bar">
          <span>{res.energy}</span>
          <span className="sd-track" aria-hidden="true">
            <i className="sd-fill-energy" style={{ width: `${Math.min(100, pct(s.energy))}%` }} />
          </span>
          <span>{pct(s.energy)}</span>
        </div>
      </div>
      <p className="field-help">{res.note}</p>

      <dl className="sd-feedback">
        <div><dt>{res.yourPrediction}</dt><dd>{predText}</dd></div>
        <div><dt>{res.whatHappened}</dt><dd>{what}</dd></div>
        <div className="sd-why"><dt>{res.why}</dt><dd>{fill(words.why, vars)}</dd></div>
        <div className="sd-next"><dt>{res.tryNext}</dt><dd>{fill(words.next, vars)}</dd></div>
      </dl>

      {/* Polite: each new hint is read when it appears. */}
      <div className="sd-ladder" aria-live="polite">
        {words.hints.slice(0, hints).map((h, i) => (
          <p key={i}><strong>{res.ladder[i]}:</strong> {fill(h, vars)}</p>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn btn-secondary" type="button" disabled={hints >= words.hints.length} onClick={() => setHints(hints + 1)}>
          {hints === 0 ? res.hint : hints < words.hints.length ? res.moreHelp : res.allHelp}
        </button>
      </div>
    </section>
  )
})

export default Results
