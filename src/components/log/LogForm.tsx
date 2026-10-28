import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AlertIcon, CameraIcon, CheckIcon, TrashIcon } from '../Icons'
import { logContent } from '../../content'
import { CURRENT_PLANT_ID, db, fromCm, toCm, type LogEntry } from '../../data/db'
import { useSettings } from '../../data/settings'
import { todayISO } from '../../lib/dates'
import { fmtNum } from '../../lib/labels'
import { resizePhoto } from '../../lib/photo'
import { useObjectUrl } from '../../lib/useObjectUrl'
import './LogForm.css'

const NOTE_MAX = 280
const MAX_HEIGHT_CM = 300

interface FormState {
  date: string
  height: string
  note: string
  photo: Blob | null
}

type Errors = Partial<Record<'date' | 'height' | 'photo', string>>

const { fields } = logContent

interface Props {
  /** When set, the form edits this entry instead of adding a new one. */
  entry?: LogEntry
  onDone?: () => void
}

export default function LogForm({ entry, onDone }: Props) {
  const { settings } = useSettings()
  const unit = settings.heightUnit
  const [form, setForm] = useState<FormState>(() =>
    entry
      ? { date: entry.date, height: fmtNum(fromCm(entry.heightCm, unit)), note: entry.note, photo: entry.photo ?? null }
      : { date: todayISO(), height: '', note: '', photo: null },
  )
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [photoBusy, setPhotoBusy] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoUrl = useObjectUrl(form.photo)
  const id = useId()
  const editing = !!entry
  const editTitleRef = useRef<HTMLHeadingElement>(null)

  // When the edit form opens, move focus to its heading.
  useEffect(() => {
    if (editing) editTitleRef.current?.focus()
  }, [editing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (status === 'saved') setStatus('idle')
  }

  function validate(f: FormState): Errors {
    const found: Errors = {}
    if (!f.date) found.date = 'Pick the date you measured your plant.'
    else if (f.date > todayISO()) found.date = 'The date cannot be in the future.'
    const h = Number(f.height)
    if (f.height.trim() === '') found.height = 'Enter how tall your plant is.'
    else if (!Number.isFinite(h) || h < 0) found.height = 'Height must be a number 0 or bigger.'
    else if (toCm(h, unit) > MAX_HEIGHT_CM) found.height = `That is very tall. Check the number. It should be in ${unit}.`
    return found
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
    const data = {
      date: form.date,
      height,
      heightUnit: unit,
      heightCm: toCm(height, unit),
      note: form.note.trim(),
      photo: form.photo ?? undefined,
    }
    if (entry) {
      await db.entries.update(entry.id, { ...data, updatedAt: Date.now() })
      onDone?.()
      return
    }
    await db.entries.add({ ...data, plantId: CURRENT_PLANT_ID, createdAt: Date.now() })
    setForm({ date: form.date, height: '', note: '', photo: null })
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
  const titleId = fieldId('title')

  return (
    <form className={`log-form${editing ? ' is-editing' : ' card'}`} onSubmit={onSubmit} noValidate aria-labelledby={titleId}>
      {editing ? (
        <h3 id={titleId} ref={editTitleRef} tabIndex={-1}>Edit entry</h3>
      ) : (
        <>
          <h2 id={titleId}>New entry</h2>
          <p className="page-intro">{logContent.intro}</p>
        </>
      )}
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
          <label className="field-label" htmlFor={fieldId('height')}>
            {fields.height} <span className="unit-hint">({unit === 'cm' ? 'centimeters' : 'inches'})</span> <Req />
          </label>
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
            <span className="unit-suffix" aria-hidden="true">{unit}</span>
          </div>
          {fieldError('height')}
          {!editing && <p className="field-help unit-link"><Link to="/settings">Change cm or inches in Settings</Link></p>}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={fieldId('note')}>{fields.note}</label>
        <p className="field-help" id={fieldId('note-help')}>{fields.noteHelp}</p>
        <textarea
          id={fieldId('note')}
          className="input"
          rows={3}
          maxLength={NOTE_MAX}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          aria-describedby={`${fieldId('note-help')} ${fieldId('note-count')}`}
        />
        <p className="field-help counter" id={fieldId('note-count')}>{form.note.length} of {NOTE_MAX} letters</p>
      </div>

      <div className="field">
        <span className="field-label">{fields.photo}</span>
        <p className="field-help" id={fieldId('photo-help')}>{fields.photoHelp}</p>
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
            {photoBusy ? 'Loading photo…' : 'Take or choose a photo'}
            <input
              ref={photoInputRef}
              id={fieldId('photo')}
              className="visually-hidden"
              type="file"
              accept="image/*"
              aria-describedby={describedBy('photo', fieldId('photo-help'))}
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
        )}
        {fieldError('photo')}
      </div>

      {status === 'saved' && (
        <div className="callout callout-success" role="status" tabIndex={-1} ref={savedRef}>
          <CheckIcon />
          <p><strong>Saved!</strong> See it in your recent entries below.</p>
        </div>
      )}

      <div className="btn-row">
        <button type="submit" className={`btn${editing ? '' : ' btn-block'}`} disabled={status === 'saving' || photoBusy}>
          {status === 'saving' ? 'Saving…' : editing ? 'Save changes' : 'Save entry'}
        </button>
        {editing && <button type="button" className="btn btn-secondary" onClick={onDone}>Cancel</button>}
      </div>
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
