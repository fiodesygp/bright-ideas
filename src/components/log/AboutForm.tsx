import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { AlertIcon, TrashIcon } from '../Icons'
import Waves from '../Waves'
import { logContent } from '../../content'
import { addLearner, db, type Learner } from '../../data/db'
import { useSettings } from '../../data/settings'
import { todayISO } from '../../lib/dates'
import { fill } from '../../lib/labels'
import SunSprout from './SunSprout'
import { Req } from './LogForm'
import './LogForm.css'
import './Learner.css'

const NAME_MAX = 30
const PLANT_MAX = 40

const { about } = logContent

type Errors = Partial<Record<'name' | 'startDate', string>>

interface Props {
  /** start: the first learner on the device. add: someone else. edit: change the current learner. */
  mode: 'start' | 'add' | 'edit'
  learner?: Learner
  /** Called after saving, with the learner and how many earlier entries they got. */
  onSaved: (learner: Learner, adopted: number) => void
  onCancel?: () => void
  onDelete?: () => void
  /** Move focus to the form's heading when it opens. */
  focusOnOpen?: boolean
}

/** "My name · My plant · Start date", like the cover of the printed booklet. */
export default function AboutForm({ mode, learner, onSaved, onCancel, onDelete, focusOnOpen }: Props) {
  const { settings, update } = useSettings()
  // A plant name set in Settings before learners existed prefills the first card.
  const oldPlant = mode === 'start' && settings.plantName && settings.plantName !== about.plantFallback ? settings.plantName : ''
  const [form, setForm] = useState({
    name: learner?.name ?? '',
    plant: learner?.plant ?? oldPlant,
    startDate: learner ? learner.startDate : todayISO(),
  })
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const id = useId()
  const fieldId = (name: string) => `${id}-${name}`
  const titleRef = useRef<HTMLHeadingElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusOnOpen) titleRef.current?.focus()
  }, [focusOnOpen])

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    const found: Errors = {}
    if (!name) found.name = about.nameError
    if (form.startDate && form.startDate > todayISO()) found.startDate = about.startDateError
    setErrors(found)
    if (found.name) return nameRef.current?.focus()
    if (found.startDate) return dateRef.current?.focus()
    setSaving(true)
    const data = { name, plant: form.plant.trim(), startDate: form.startDate }
    if (mode === 'edit' && learner) {
      await db.learners.update(learner.id, data)
      onSaved({ ...learner, ...data }, 0)
      return
    }
    const { id: newId, adopted } = await addLearner(data)
    if (oldPlant) update({ plantName: undefined })
    onSaved({ id: newId, ...data }, adopted)
  }

  const describedBy = (name: keyof Errors, ...extra: string[]) =>
    [errors[name] ? fieldId(`${name}-error`) : '', ...extra].filter(Boolean).join(' ') || undefined
  const fieldError = (name: keyof Errors) =>
    errors[name] && (
      <p className="field-error" id={fieldId(`${name}-error`)}>
        <AlertIcon /> {errors[name]}
      </p>
    )
  const titleId = fieldId('title')
  const title = mode === 'start' ? about.title : mode === 'add' ? about.addTitle : about.editTitle

  return (
    <form className={`log-form about-form${mode === 'start' ? ' card' : ' is-editing'}`} onSubmit={onSubmit} noValidate aria-labelledby={titleId}>
      {mode === 'start' ? (
        <div className="log-hero">
          <Waves variant="header" />
          <div className="log-hero-text">
            <h2 id={titleId} ref={titleRef} tabIndex={-1}>{title}</h2>
            <p className="page-intro">{about.intro}</p>
          </div>
          <SunSprout />
        </div>
      ) : (
        <h3 id={titleId} ref={titleRef} tabIndex={-1}>{title}</h3>
      )}
      <p className="required-note">Fields marked <span aria-hidden="true">*</span><span className="visually-hidden">with a star</span> are required.</p>

      <div className="field">
        <label className="field-label" htmlFor={fieldId('name')}>{about.name} <Req /></label>
        <p className="field-help" id={fieldId('name-help')}>{about.nameHelp}</p>
        <input
          ref={nameRef}
          id={fieldId('name')}
          className="input"
          type="text"
          required
          maxLength={NAME_MAX}
          autoComplete="off"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby={describedBy('name', fieldId('name-help'))}
        />
        {fieldError('name')}
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor={fieldId('plant')}>{about.plant}</label>
          <p className="field-help" id={fieldId('plant-help')}>{about.plantHelp}</p>
          <input
            id={fieldId('plant')}
            className="input"
            type="text"
            maxLength={PLANT_MAX}
            autoComplete="off"
            value={form.plant}
            onChange={(e) => set('plant', e.target.value)}
            aria-describedby={fieldId('plant-help')}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={fieldId('start')}>{about.startDate}</label>
          <input
            ref={dateRef}
            id={fieldId('start')}
            className="input"
            type="date"
            max={todayISO()}
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            aria-invalid={!!errors.startDate}
            aria-describedby={describedBy('startDate')}
          />
          {fieldError('startDate')}
        </div>
      </div>

      <div className="btn-row">
        <button type="submit" className={`btn${mode === 'start' ? ' btn-block' : ''}`} disabled={saving}>
          {mode === 'start' ? about.start : mode === 'add' ? about.add : 'Save changes'}
        </button>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
      {mode === 'edit' && learner && onDelete && (
        <div>
          <button type="button" className="btn btn-ghost about-delete" onClick={onDelete}>
            <TrashIcon width={20} height={20} /> {fill(about.deleteLog, { name: learner.name })}
          </button>
        </div>
      )}
    </form>
  )
}
