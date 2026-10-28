import type { ReactNode } from 'react'
import type { Option } from '../content'
import './ChoiceGroup.css'

interface Props {
  name: string
  legend: ReactNode
  help?: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  /** Show each option's help text under its label */
  showOptionHelp?: boolean
}

/**
 * Radio buttons styled as large chips. Selection is shown with a check mark,
 * thicker border, and bold text, not color alone.
 */
export default function ChoiceGroup({ name, legend, help, options, value, onChange, showOptionHelp }: Props) {
  const helpId = help ? `${name}-help` : undefined
  return (
    <fieldset className="choice-group" aria-describedby={helpId}>
      <legend>{legend}</legend>
      {help && <p id={helpId} className="field-help">{help}</p>}
      <div className="chips">
        {options.map((opt) => (
          <label key={opt.id} className="chip">
            <input
              type="radio"
              name={name}
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              onClick={() => {
                // Tapping the selected chip again clears it (all of these are optional).
                if (value === opt.id) onChange('')
              }}
            />
            <span className="chip-mark" aria-hidden="true" />
            {opt.swatch && <span className="chip-swatch" style={{ background: opt.swatch }} aria-hidden="true" />}
            <span className="chip-text">
              {opt.label}
              {showOptionHelp && opt.help && <small>{opt.help}</small>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
