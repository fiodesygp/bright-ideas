import { useId, type ReactNode } from 'react'
import '../chips.css'

export type Option<V> = { v: V; label: string; disabled?: boolean }

type Props<V> = {
  legend: ReactNode
  options: Option<V>[]
  value: V | null
  onChange: (v: V) => void
  /** Shown under the legend and read with the group */
  help?: ReactNode
}

/** A labelled group of radio buttons, drawn as Bright Ideas chips. */
export default function Choice<V extends string | number>({ legend, options, value, onChange, help }: Props<V>) {
  const id = useId()
  return (
    <fieldset className="choice-group" aria-describedby={help ? `${id}-help` : undefined}>
      <legend>{legend}</legend>
      {help && <p className="field-help" id={`${id}-help`}>{help}</p>}
      <div className="chips">
        {options.map((o) => (
          <label key={String(o.v)} className={`chip${o.disabled ? ' is-disabled' : ''}`}>
            <input type="radio" name={id} checked={value === o.v} disabled={o.disabled} onChange={() => onChange(o.v)} />
            <span className="chip-mark" aria-hidden="true" />
            <span className="chip-text">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
