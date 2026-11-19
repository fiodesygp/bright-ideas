import { useLiveQuery } from 'dexie-react-hooks'
import { sundayContent as text } from '../../content'
import { getSunDayRuns, type SunDayRun } from '../../data/db'
import { fill } from '../../lib/labels'
import SaveHint from './SaveHint'

const r = text.runs

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "Basil, big panel set low, fan" */
function designText(run: Pick<SunDayRun, 'design'>) {
  const d = run.design
  const panel = d.panels === 'none' ? text.panelNames.none : fill(text.scene.panelAt, { panel: text.panelNames[d.panels], height: text.heights[d.height].toLowerCase() })
  const loads = d.fan && d.pump ? r.fanAndPump : d.fan ? r.fan : d.pump ? r.pump : ''
  return [fill(r.designValue, { crop: text.crops[d.crop] ?? d.crop, panel }), loads].filter(Boolean).join(', ')
}

/** "Guessed more because the fan cools it. It grew about the same." */
function predictionText(run: Pick<SunDayRun, 'guess' | 'why' | 'actual'>) {
  const words = text.results.words
  if (!run.guess) return fill(r.noGuess, { actual: words[run.actual] })
  const because = run.why ? fill(r.because, { why: text.predict.why[run.why] }) : ''
  return fill(r.guessed, { guess: words[run.guess], because, actual: words[run.actual] })
}

/** "My simulation runs": the current learner's runs, newest first. With nobody logging, a hint instead. */
export default function RunsList({ learnerId }: { learnerId?: number }) {
  const runs = useLiveQuery(() => (learnerId == null ? [] : getSunDayRuns(learnerId)), [learnerId])
  if (!runs) return null
  if (learnerId == null) {
    return (
      <section className="section sd-runs" aria-labelledby="sd-runs-title">
        <h2 id="sd-runs-title" tabIndex={-1}>{r.title}</h2>
        <SaveHint />
      </section>
    )
  }

  return (
    <section className="section sd-runs" aria-labelledby="sd-runs-title">
      <h2 id="sd-runs-title" tabIndex={-1}>{r.title}</h2>
      <p className="page-intro">{r.intro}</p>
      {runs.length === 0 ? (
        <p>{r.empty}</p>
      ) : (
        <ol className="sd-run-list">
          {runs.map((run) => (
            <li key={run.id} className="card sd-run">
              <h3>
                {fill(r.score, { score: run.score })} <span className="sd-run-detail">{fill(r.scoreDetail, { fs: run.fullSun })}</span>
              </h3>
              <p className="sd-run-time">{fill(r.ran, { date: when(run.createdAt) })}</p>
              <dl>
                <div><dt>{r.design}</dt><dd>{designText(run)}</dd></div>
                <div><dt>{r.day}</dt><dd>{fill(r.dayValue, { weather: text.weather[run.design.weather], days: text.days[`${run.design.days}`] })}</dd></div>
                {run.challenge && <div><dt>{r.challenge}</dt><dd>{text.challenges[run.challenge].name}</dd></div>}
                <div><dt>{r.prediction}</dt><dd>{predictionText(run)}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
