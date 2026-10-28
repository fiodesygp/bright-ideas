import { useId, useRef, useState, type FormEvent } from 'react'
import ChoiceGroup from '../ChoiceGroup'
import { AlertIcon, CameraIcon, CheckIcon, TrashIcon } from '../Icons'
import { logContent, type ReflectionPrompt } from '../../content'
import { CURRENT_PLANT_ID, db, toCm, type HeightUnit, type Soil } from '../../data/db'
import { useSettings } from '../../data/settings'
import { todayISO } from '../../lib/dates'
import { resizePhoto } from '../../lib/photo'
import { useObjectUrl } from '../../lib/useObjectUrl'
import './LogForm.css'

const NOTE_MAX = 280
const MAX_HEIGHT_CM = 300

interface FormState {
  date: string
  height: string
  heightUnit: HeightUnit
  leafCount: string
  leafColor: string
  soil: string
  watered: string
  weather: string
  shade: string
  photo: Blob | null
  note: string
  reflection: string
}

type Errors = Partial<Record<'date' | 'height' | 'leafCount' | 'photo', string>>

const { fields } = logContent
const YES_NO = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

function emptyForm(unit: HeightUnit, date = todayISO()): FormState {
  return {
    date, height: '', heightUnit: unit, leafCount: '', leafColor: '', soil: '', watered: '',
    weather: '', shade: '', photo: null, note: '', reflection: '',
  }
}

function validate(f: FormState): Errors {
  const errors: Errors = {}
  if (!f.date) errors.date = 'Pick the date you checked your plant.'
  else if (f.date > todayISO()) errors.date = 'The date cannot be in the future.'

  const h = Number(f.height)
  if (f.height.trim() === '') errors.height = 'Enter how tall your plant is.'
  else if (!Number.isFinite(h) || h < 0) errors.height = 'Height must be a number 0 or bigger.'
  else if (toCm(h, f.heightUnit) > MAX_HEIGHT_CM) errors.height = `That is very tall. Check the number and the unit (${f.heightUnit}).`

  if (f.leafCount !== '') {
    const n = Number(f.leafCount)
    if (!Number.isInteger(n) || n < 0 || n > 500) errors.leafCount = 'Leaves must be a whole number, like 0, 4, or 12.'
  }
  return errors
}

export default function LogForm({ prompt }: { prompt: ReflectionPrompt }) {
  const { settings } = useSettings()
  const [form, setForm] = useState(() => emptyForm(settings.heightUnit))
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [photoBusy, setPhotoBusy] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoUrl = useObjectUrl(form.photo)
  const id = useId()

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (status === 'saved') setStatus('idle')
  }

  const stepLeaves = (delta: number) => {
    const n = Math.max(0, (Number(form.leafCount) || 0) + delta)
    set('leafCount', String(n))
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setErrors((e) => ({ ...e, photo: undefined }))
    try {
      set('photo', await resizePhoto(file))
    } catch {
      setErrors((e) => ({ ...e, photo: 'We could not open that photo. Try a different one.' }))
    } finally {
      setPhotoBusy(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      setStatus('idle')
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setStatus('saving')
    const height = Number(form.height)
    await db.entries.add({
      plantId: CURRENT_PLANT_ID,
      date: form.date,
      createdAt: Date.now(),
      height,
      heightUnit: form.heightUnit,
      heightCm: toCm(height, form.heightUnit),
      leafCount: form.leafCount === '' ? null : Number(form.leafCount),
      leafColor: form.leafColor,
      soil: form.soil as Soil | '',
      watered: form.watered === '' ? null : form.watered === 'yes',
      weather: form.weather,
      shade: form.shade,
      photo: form.photo ?? undefined,
      note: form.note.trim(),
      promptId: prompt.id,
      promptText: prompt.text,
      reflection: form.reflection.trim(),
    })
    setForm(emptyForm(form.heightUnit, form.date))
    setStatus('saved')
    requestAnimationFrame(() => savedRef.current?.focus())
  }

  const errorList = Object.entries(errors).filter(([, msg]) => msg) as [keyof Errors, string][]
  const fieldId = (name: string) => `${id}-${name}`
  const describedBy = (name: keyof Errors, ...extra: string[]) =>
    [errors[name] ? fieldId(`${name}-error`) : '', ...extra].filter(Boolean).join(' ') || undefined
  const fieldError = (name: keyof Errors) =>
    errors[name] && (
      <p className="field-error" id={fieldId(`${name}-error`)}>
        <AlertIcon /> {errors[name]}
      </p>
    )

  return (
    <form className="log-form card" onSubmit={onSubmit} noValidate aria-labelledby="new-entry-title">
      <h2 id="new-entry-title">New entry</h2>
      <p className="page-intro">{logContent.intro}</p>
      <p className="required-note">Fields marked <span aria-hidden="true">*</span><span className="visually-hidden">with a star</span> are required.</p>

      {errorList.length > 0 && (
        <div className="callout callout-error" role="alert" tabIndex={-1} ref={summaryRef}>
          <AlertIcon />
          <div>
            <p><strong>Please fix {errorList.length === 1 ? 'this' : 'these'}:</strong></p>
            <ul>
              {errorList.map(([name, msg]) => (
                <li key={name}><a href={`#${fieldId(name)}`} onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(fieldId(name))?.focus()
                }}>{msg}</a></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <label className="field-label" htmlFor={fieldId('date')}>{fields.date} <Req /></label>
          <input
            id={fieldId('date')}
            className="input"
            type="date"
            required
            max={todayISO()}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={describedBy('date')}
          />
          {fieldError('date')}
        </div>

        <div className="field">
          <label className="field-label" htmlFor={fieldId('height')}>{fields.height} <Req /></label>
          <p className="field-help" id={fieldId('height-help')}>{fields.heightHelp}</p>
          <div className="height-row">
            <input
              id={fieldId('height')}
              className="input input-number"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              required
              value={form.height}
              onChange={(e) => set('height', e.target.value)}
              aria-invalid={!!errors.height}
              aria-describedby={describedBy('height', fieldId('height-help'))}
            />
            <fieldset className="unit-toggle">
              <legend className="visually-hidden">Height unit</legend>
              {(['cm', 'in'] as const).map((u) => (
                <label key={u}>
                  <input type="radio" name={fieldId('unit')} value={u} checked={form.heightUnit === u} onChange={() => set('heightUnit', u)} />
                  <span>{u === 'cm' ? 'cm' : 'in'}<span className="visually-hidden">{u === 'cm' ? ' centimeters' : ' inches'}</span></span>
                </label>
              ))}
            </fieldset>
          </div>
          {fieldError('height')}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={fieldId('leafCount')}>{fields.leafCount}</label>
        <div className="stepper">
          <button type="button" className="btn btn-secondary" onClick={() => stepLeaves(-1)} aria-label="One fewer leaf">−</button>
          <input
            id={fieldId('leafCount')}
            className="input input-number"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={form.leafCount}
            onChange={(e) => set('leafCount', e.target.value)}
            aria-invalid={!!errors.leafCount}
            aria-describedby={describedBy('leafCount')}
          />
          <button type="button" className="btn btn-secondary" onClick={() => stepLeaves(1)} aria-label="One more leaf">+</button>
        </div>
        {fieldError('leafCount')}
      </div>

      <ChoiceGroup name={fieldId('leafColor')} legend={fields.leafColor} options={logContent.leafColors} value={form.leafColor} onChange={(v) => set('leafColor', v)} />
      <ChoiceGroup name={fieldId('soil')} legend={fields.soil} help={fields.soilHelp} options={logContent.soil} value={form.soil} onChange={(v) => set('soil', v)} showOptionHelp />
      <ChoiceGroup name={fieldId('watered')} legend={fields.watered} options={YES_NO} value={form.watered} onChange={(v) => set('watered', v)} />
      <ChoiceGroup name={fieldId('weather')} legend={fields.weather} options={logContent.weather} value={form.weather} onChange={(v) => set('weather', v)} />
      <ChoiceGroup name={fieldId('shade')} legend={fields.shade} options={logContent.shade} value={form.shade} onChange={(v) => set('shade', v)} />

      <div className="field">
        <span className="field-label" id={fieldId('photo-label')}>{fields.photo}</span>
        {photoUrl ? (
          <div className="photo-preview">
            <img src={photoUrl} alt="The photo you added to this entry" />
            <button type="button" className="btn btn-secondary" onClick={() => set('photo', null)}>
              <TrashIcon width={20} height={20} /> Remove photo
            </button>
          </div>
        ) : (
          <label className="btn btn-secondary photo-button">
            <CameraIcon width={22} height={22} />
            {photoBusy ? 'Loading photo…' : 'Add a photo'}
            <input
              ref={photoInputRef}
              id={fieldId('photo')}
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              aria-describedby={describedBy('photo')}
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
        )}
        {fieldError('photo')}
      </div>

      <div className="field">
        <label className="field-label" htmlFor={fieldId('note')}>{fields.note}</label>
        <textarea
          id={fieldId('note')}
          className="input"
          rows={2}
          maxLength={NOTE_MAX}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          aria-describedby={fieldId('note-count')}
        />
        <p className="field-help counter" id={fieldId('note-count')}>{form.note.length} of {NOTE_MAX} letters</p>
      </div>

      <div className="field reflection">
        <label className="field-label" htmlFor={fieldId('reflection')}>
          {fields.reflection}
          <span className="reflection-prompt">{prompt.text}</span>
        </label>
        <textarea
          id={fieldId('reflection')}
          className="input"
          rows={3}
          maxLength={500}
          value={form.reflection}
          onChange={(e) => set('reflection', e.target.value)}
        />
      </div>

      {status === 'saved' && (
        <div className="callout callout-success" role="status" tabIndex={-1} ref={savedRef}>
          <CheckIcon />
          <p><strong>Saved!</strong> Your entry is in the history below.</p>
        </div>
      )}

      <button type="submit" className="btn btn-block" disabled={status === 'saving' || photoBusy}>
        {status === 'saving' ? 'Saving…' : 'Save entry'}
      </button>
    </form>
  )
}

function Req() {
  return (
    <>
      <span className="req" aria-hidden="true">*</span>
      <span className="visually-hidden">(required)</span>
    </>
  )
}
