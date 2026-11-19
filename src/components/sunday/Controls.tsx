import { useId, type ReactNode } from 'react'
import model from '../../sim/model.json' with { type: 'json' }
import { sundayContent as text } from '../../content'
import { CHALLENGES, type ChallengeId } from '../../sim/challenges.ts'
import type { Design } from '../../sim/types.ts'
import { CROPS, DAYS, HEIGHTS, PANELS, WEATHERS } from '../../sim/choices.ts'
import Choice from './Choice'

type Props = {
  design: Design
  challenge: ChallengeId | null
  onDesign: (d: Design) => void
  onChallenge: (c: ChallengeId | null) => void
  /** step 4, the prediction */
  children?: ReactNode
}

/** Steps 1 to 3: plant and day, panel, and what the energy runs. */
export default function Controls({ design: d, challenge, onDesign, onChallenge, children }: Props) {
  const id = useId()
  const rules = challenge ? model.challenges[challenge] : null
  const locked = (rules?.set ?? {}) as Partial<Design>
  const needs = rules && 'needs' in rules ? rules.needs : null
  const isLocked = <K extends keyof Design>(k: K, v: Design[K]) => k in locked && locked[k] !== v
  const set = <K extends keyof Design>(k: K) => (v: Design[K]) => onDesign({ ...d, [k]: v })

  return (
    <section className="card sd-controls" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="visually-hidden">{text.eyebrow}</h2>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-mode`}>{text.controls.playMode}</label>
        <select
          id={`${id}-mode`}
          className="input"
          aria-describedby={challenge ? `${id}-goal` : undefined}
          value={challenge ?? 'free'}
          onChange={(e) => onChallenge(e.target.value === 'free' ? null : (e.target.value as ChallengeId))}
        >
          <option value="free">{text.controls.free}</option>
          {CHALLENGES.map((c) => <option key={c} value={c}>{text.challenges[c].name}</option>)}
        </select>
        {challenge && <p className="sd-goal" id={`${id}-goal`}>{text.challenges[challenge].goal}</p>}
      </div>

      <div className="sd-step">
        <h3>{text.controls.step1}</h3>
        <Choice
          legend={text.controls.plant}
          options={CROPS.map((v) => ({ v, label: text.crops[v], disabled: isLocked('crop', v) }))}
          value={d.crop}
          onChange={set('crop')}
          help={text.cropHints[d.crop]}
        />
        <Choice
          legend={text.controls.weather}
          options={WEATHERS.map((v) => ({ v, label: text.weather[v], disabled: isLocked('weather', v) }))}
          value={d.weather}
          onChange={set('weather')}
        />
        <Choice
          legend={text.controls.howLong}
          options={DAYS.map((v) => ({ v, label: text.days[`${v}`], disabled: isLocked('days', v) }))}
          value={d.days}
          onChange={set('days')}
        />
      </div>

      <div className="sd-step">
        <h3>{text.controls.step2}</h3>
        <Choice
          legend={text.controls.panelSize}
          options={PANELS.map((v) => ({ v, label: text.panels[v] }))}
          value={d.panels}
          onChange={set('panels')}
          help={text.controls.panelHint}
        />
        <Choice
          legend={text.controls.height}
          options={HEIGHTS.map((v) => ({ v, label: text.heights[v] }))}
          value={d.height}
          onChange={set('height')}
          help={text.controls.heightHint}
        />
      </div>

      <div className="sd-step">
        <h3>{text.controls.step3}</h3>
        <fieldset className="choice-group" aria-describedby={`${id}-water`}>
          <legend>{text.controls.turnOn}</legend>
          <p className="field-help" id={`${id}-water`}>{d.pump ? text.controls.waterPump : text.controls.waterHand}</p>
          {/* two independent on/off switches, not a choice between them */}
          <div className="chips">
            {(['fan', 'pump'] as const).map((v) => (
              <label key={v} className={`chip${needs === v ? ' is-disabled' : ''}`}>
                <input type="checkbox" checked={d[v]} disabled={needs === v} onChange={(e) => onDesign({ ...d, [v]: e.target.checked })} />
                <span className="chip-mark" aria-hidden="true" />
                <span className="chip-text">
                  <span><strong>{text.controls[v]}</strong> — {text.controls[`${v}Text`]}</span>
                  {needs === v && <small>{text.controls.needed}</small>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {children}
    </section>
  )
}
