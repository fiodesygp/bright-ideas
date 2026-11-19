import model from '../../sim/model.json' with { type: 'json' }
import { sundayContent as text } from '../../content'
import { fill } from '../../lib/labels'
import type { Design, Hour } from '../../sim/types.ts'

type Props = {
  design: Design
  /** the hour to show: the playing hour, or sunrise before the first run */
  hour: Hour
  energy: number
  growth: number
  /** true once a run has started; false shows the sunrise values */
  live: boolean
}

type Level = 'good' | 'warn' | 'bad'

/** Energy, leaf temperature, soil water and growth for the hour on screen. */
export default function Gauges({ design: d, hour: hr, energy, growth, live }: Props) {
  const crop = model.crops[d.crop]
  const g = text.gauges
  const temp: [string, Level] = hr.leafTemp > crop.stress ? [g.tooHot, 'bad'] : hr.leafTemp > crop.hi ? [g.warm, 'warn'] : [g.comfy, 'good']
  const soil: [string, Level] = hr.moisture < model.dryBelow ? [g.dry, 'warn'] : hr.moisture > model.fieldCapacity ? [g.soggy, 'bad'] : [g.good, 'good']
  const soilPct = Math.round(hr.moisture * 100)
  const growPct = Math.round(growth * 100)

  return (
    <>
      {/* Not a live region: values change every fraction of a second while the day runs. */}
      <dl className="sd-gauges">
        <div className="sd-gauge">
          <dt>{g.energy}</dt>
          <dd><b>{energy.toFixed(1)}</b> {g.wh}</dd>
        </div>
        <div className="sd-gauge">
          <dt>{g.leafTemp}</dt>
          <dd><b>{fill(g.degF, { n: Math.round(hr.leafTemp) })}</b> <span className={`sd-level sd-${temp[1]}`}>{temp[0]}</span></dd>
        </div>
        <div className="sd-gauge">
          <dt>{g.soil}</dt>
          <dd>
            <b>{soilPct}%</b> <span className={`sd-level sd-${soil[1]}`}>{soil[0]}</span>
            <span className={`sd-meter sd-${soil[1]}`} aria-hidden="true"><i style={{ width: `${soilPct}%` }} /></span>
          </dd>
        </div>
        <div className="sd-gauge">
          <dt>{g.growth}</dt>
          <dd>
            <b>{growPct}%</b>
            <span className="sd-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, growPct)}%` }} /></span>
          </dd>
        </div>
      </dl>
      {!live && <p className="field-help sd-note">{g.atSunrise}</p>}
      {live && (
        <ul className="sd-running" aria-label={text.chips.label}>
          {d.fan && <li className={hr.on.fan ? 'is-on' : undefined}>{hr.on.fan ? text.chips.fanOn : text.chips.fanOff}</li>}
          {d.pump && <li className={hr.on.pump ? 'is-on' : undefined}>{hr.on.pump ? text.chips.pumpOn : text.chips.pumpOff}</li>}
          {d.pump && <li>{fill(text.chips.tank, { n: Math.round((hr.tank / model.tankSize.large) * 100) })}</li>}
          {hr.sun > 0 && <li>{fill(text.chips.light, { n: Math.round((hr.plantLight / hr.sun) * 100) })}</li>}
        </ul>
      )}
    </>
  )
}
