import { sundayContent as text } from '../../content'
import type { SunDayReason } from '../../data/db'
import type { Guess } from '../../sim/feedback.ts'
import Choice from './Choice'
import { PlayIcon } from './PlayIcon'

export type Pred = { guess: Guess | null; why: SunDayReason | null }

const GUESSES: Guess[] = ['more', 'same', 'less']
const REASONS: SunDayReason[] = ['shade', 'light', 'fan', 'pump']

type Props = {
  pred: Pred
  onChange: (p: Pred) => void
  /** same words as the Run button by the scene */
  runLabel: string
  /** full name for the skip button, e.g. "Skip prediction and run the day" */
  skipLabel: string
  onRun: () => void
  onSkip: () => void
  running: boolean
}

/** Step 4: guess, give a reason, then run the day from here. */
export default function Prediction({ pred, onChange, runLabel, skipLabel, onRun, onSkip, running }: Props) {
  return (
    <div className="sd-step">
      <h3>{text.controls.step4}</h3>
      <p>{text.predict.prompt}</p>
      <Choice
        legend={text.predict.guessLabel}
        options={GUESSES.map((v) => ({ v, label: text.predict.guesses[v] }))}
        value={pred.guess}
        onChange={(guess) => onChange({ ...pred, guess })}
      />
      <Choice
        legend={<><span className="visually-hidden">{text.predict.whyLabel}: </span>{text.predict.because}</>}
        options={REASONS.map((v) => ({ v, label: text.predict.why[v] }))}
        value={pred.why}
        onChange={(why) => onChange({ ...pred, why })}
      />
      <div className="btn-row">
        <button className="btn" type="button" disabled={running} onClick={onRun}>
          <PlayIcon /> {runLabel}
        </button>
        <button className="btn btn-ghost" type="button" disabled={running} aria-label={skipLabel} onClick={onSkip}>
          {text.predict.skip}
        </button>
      </div>
    </div>
  )
}
