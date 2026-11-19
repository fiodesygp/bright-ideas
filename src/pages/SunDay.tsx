import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeading'
import { useAnnounce } from '../components/Announcer'
import Scene from '../components/sunday/Scene'
import Controls from '../components/sunday/Controls'
import Gauges from '../components/sunday/Gauges'
import Prediction, { type Pred } from '../components/sunday/Prediction'
import Results, { type Run } from '../components/sunday/Results'
import RunsList from '../components/sunday/RunsList'
import { PlayIcon } from '../components/sunday/PlayIcon'
import { sundayContent as text } from '../content'
import { addSunDayRun } from '../data/db'
import { useLearners } from '../data/useLearners'
import { fill } from '../lib/labels'
import model from '../sim/model.json' with { type: 'json' }
import { applyChallenge, type ChallengeId } from '../sim/challenges.ts'
import { CROPS, DAYS, HEIGHTS, PANELS, WEATHERS } from '../sim/choices.ts'
import { compareToFullSun } from '../sim/feedback.ts'
import { idealGrowth, score, simulate } from '../sim/simulate.ts'
import type { Design } from '../sim/types.ts'
import '../components/sunday/SunDay.css'

// playback speed: one day in about 9 s (14 hours x 650 ms); a week runs faster per hour
const MS_PER_HOUR = { 1: 650, 7: 120 }
const DEFAULT: Design = { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false }
const NO_PRED: Pred = { guess: null, why: null }
const DESIGN_KEY = 'bright-ideas:sunDayDesign'
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Phase = 'ready' | 'playing' | 'done'

/** The last design used on this device; anything unknown falls back to the default. */
function savedDesign(): Design {
  let x: Record<string, unknown> = {}
  try {
    x = JSON.parse(localStorage.getItem(DESIGN_KEY) ?? '{}') ?? {}
  } catch {
    // Storage blocked or damaged: start from the default.
  }
  const pick = <T,>(v: unknown, ok: readonly T[], d: T) => (ok.includes(v as T) ? (v as T) : d)
  return {
    crop: pick(x.crop, CROPS, DEFAULT.crop),
    weather: pick(x.weather, WEATHERS, DEFAULT.weather),
    days: pick(x.days, DAYS, DEFAULT.days),
    panels: pick(x.panels, PANELS, DEFAULT.panels),
    height: pick(x.height, HEIGHTS, DEFAULT.height),
    fan: typeof x.fan === 'boolean' ? x.fan : DEFAULT.fan,
    pump: typeof x.pump === 'boolean' ? x.pump : DEFAULT.pump,
  }
}

export default function SunDay() {
  const { learners, current } = useLearners()

  return (
    <div className="page sunday-page">
      <PageHeader title={text.title}>
        <p className="sd-eyebrow">{text.eyebrow}</p>
        <p className="page-intro">{text.lede}</p>
        <p className="sd-estimates">{text.estimates}</p>
      </PageHeader>
      {/* Anyone can play. Runs are saved (and uploaded) only for a learner set on the Planting Log. */}
      {learners && <SunDayLab key={current?.id ?? 'nobody'} learner={current && { id: current.id, name: current.name }} />}
    </div>
  )
}

function SunDayLab({ learner }: { learner?: { id: number; name: string } }) {
  const announce = useAnnounce()
  const [design, setDesign] = useState<Design>(savedDesign)
  const [challenge, setChallenge] = useState<ChallengeId | null>(null)
  const [pred, setPred] = useState<Pred>(NO_PRED)
  const [phase, setPhase] = useState<Phase>('ready')
  const [run, setRun] = useState<(Run & { ideal: number; id: number }) | null>(null)
  const [frame, setFrame] = useState(0)
  // after a first finished run, the buttons say "again"
  const [finished, setFinished] = useState(false)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const saved = useRef(0)
  // before the first run the gauges show this design at sunrise (the first simulated hour)
  const sunrise = useMemo(() => simulate(design).hours[0], [design])

  // any change starts over: new prediction, no results
  function change(next: Design, nextChallenge = challenge) {
    const d = nextChallenge ? applyChallenge(next, nextChallenge) : next
    setDesign(d)
    setChallenge(nextChallenge)
    try {
      localStorage.setItem(DESIGN_KEY, JSON.stringify(d))
    } catch {
      // ignore: the design just isn't remembered
    }
    setPhase('ready')
    setRun(null)
    setPred(NO_PRED)
    setFinished(false)
  }

  function finish() {
    setPhase('done')
    setFinished(true)
  }

  function play(skipPrediction = false) {
    const r = simulate(design), s = score(design, r), p = skipPrediction ? NO_PRED : pred
    if (skipPrediction) setPred(NO_PRED)
    setRun({ r, s, design, pred: p, challenge, ideal: idealGrowth(design), id: Date.now() })
    setFrame(0)
    if (reducedMotion()) {
      finish()
    } else {
      setPhase('playing')
      announce(fill(text.run.running, { span: design.days === 1 ? text.run.spanDay : text.run.spanWeek }))
    }
  }

  // when a run starts: bring the scene into view (Run may have been pressed in
  // step 4, far below it on a phone), and focus Skip, as the Run buttons are now disabled
  useEffect(() => {
    if (phase !== 'playing') return
    const stage = stageRef.current
    const r = stage?.getBoundingClientRect()
    if (stage && r && (r.top < 0 || r.bottom > window.innerHeight)) stage.scrollIntoView({ behavior: 'smooth', block: 'start' })
    skipRef.current?.focus({ preventScroll: true })
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing' || !run) return
    const n = run.r.hours.length, per = MS_PER_HOUR[run.design.days], t0 = performance.now()
    let id = 0
    const tick = (now: number) => {
      setFrame(Math.max(0, Math.min(n - 1, Math.floor((now - t0) / per))))
      if (now - t0 >= n * per) finish()
      else id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [phase, run])

  // when a run finishes: save it to My Sun Day runs, then move to the results
  useEffect(() => {
    if (phase !== 'done' || !run) return
    const { s } = run
    const total = Math.round((s.food + s.energy) * 100)
    // once per run, even if this effect runs again
    if (saved.current !== run.id) {
      saved.current = run.id
      // Without a learner nothing is saved, so nothing is uploaded either:
      // the server needs a learner on every run.
      if (!learner) announce(`${fill(text.run.done, { total })} ${text.saveHint}`)
      else void addSunDayRun({
        learnerId: learner.id,
        createdAt: run.id,
        design: run.design,
        challenge: run.challenge,
        guess: run.pred.guess,
        why: run.pred.why,
        actual: compareToFullSun(s),
        score: total,
        fullSun: Math.round(s.fullSun * 100),
        food: Math.round(s.food * 100),
        energy: Math.round(s.energy * 100),
      }).then(() => announce(`${fill(text.run.done, { total })} ${text.run.saved}`))
    }
    // move focus to the results so keyboard and screen-reader users land on them
    resultsRef.current?.focus({ preventScroll: true })
    resultsRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [phase, run, learner, announce])

  // the hour on screen: the current frame while playing, the last sunny hour when done
  const i = run ? (phase === 'done' ? run.r.hours.length - 2 : frame) : -1
  const hr = run && i >= 0 ? run.r.hours[i] : null
  let energy = 0
  if (run) for (let k = 0; k <= i; k++) energy += run.r.hours[k].power
  const growth = hr && run ? hr.totalGrowth / run.ideal : 0
  const runLabel = finished ? text.run.again : design.days === 1 ? text.run.day : text.run.week
  const skipLabel = finished ? text.predict.skipAgain : design.days === 1 ? text.predict.skipDay : text.predict.skipWeek
  const playing = phase === 'playing'
  const loads = design.fan && design.pump ? 'both' : design.fan ? 'fan' : design.pump ? 'pump' : 'none'
  const sceneLabel = fill(text.sceneLabel, {
    crop: text.crops[design.crop].toLowerCase(),
    panel: design.panels === 'none'
      ? text.panelNames.none
      : fill(text.scene.panelAt, { panel: text.panelNames[design.panels], height: text.heights[design.height].toLowerCase() }),
    loads: text.scene.loads[loads],
  })
  const clock = fill(text.run.clock, hr ? { hour: hr.h, day: hr.day + 1 } : { hour: model.hours.start, day: 1 })

  return (
    <>
      {learner && (
        <p className="sd-who">
          {fill(text.who, { name: learner.name })} <Link to="/log">{text.whoLink}</Link>
        </p>
      )}

      <div className="sd-stage" ref={stageRef}>
        <div className="card sd-scene-card">
          <Scene
            design={design}
            hour={hr}
            growth={hr ? 0.25 + 0.75 * growth : 0.35}
            tank={hr && design.pump ? hr.tank / model.tankSize.large : 1}
            label={sceneLabel}
          />
          <div className="sd-playbar">
            <button className="btn" type="button" disabled={playing} onClick={() => play()}>
              <PlayIcon /> {runLabel}
            </button>
            {playing && (
              <button className="btn btn-secondary" type="button" ref={skipRef} onClick={finish}>
                {text.run.skip}
              </button>
            )}
            <span className="sd-clock">{clock}</span>
            {run && (
              <span className="sd-progress" aria-hidden="true">
                <i style={{ width: `${((i + 1) / run.r.hours.length) * 100}%` }} />
              </span>
            )}
          </div>
        </div>
        <Gauges design={design} hour={hr ?? sunrise} energy={energy} growth={growth} live={!!hr} />
      </div>

      <Controls design={design} challenge={challenge} onDesign={(d) => change(d)} onChallenge={(c) => change(design, c)}>
        <Prediction
          pred={pred}
          onChange={setPred}
          runLabel={runLabel}
          skipLabel={skipLabel}
          onRun={() => play()}
          onSkip={() => play(true)}
          running={playing}
        />
      </Controls>

      {phase === 'done' && run && <Results key={run.id} ref={resultsRef} run={run} saved={!!learner} />}

      <RunsList learnerId={learner?.id} />
    </>
  )
}
