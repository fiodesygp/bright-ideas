import { useRef, useState } from 'react'
import type { HeightUnit, LogEntry } from '../../data/db'
import { formatDate } from '../../lib/dates'
import { heightText, ticks } from '../../lib/labels'
import { photoAlt } from '../../lib/stats'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { logContent } from '../../content'
import { EditIcon, LeafIcon, TrashIcon } from '../Icons'
import LogForm from './LogForm'

interface Props {
  entry: LogEntry
  unit: HeightUnit
  plantName: string
  /** Show Edit and Delete buttons */
  editable?: boolean
  onDelete?: (entry: LogEntry) => void
  onViewPhoto?: (entry: LogEntry) => void
  /** The entry was just saved: grow it in and label it. */
  fresh?: boolean
}

export default function EntryCard({ entry, unit, plantName, editable, onDelete, onViewPhoto, fresh }: Props) {
  const photoUrl = useObjectUrl(entry.photo)
  const [editing, setEditing] = useState(false)
  const editBtnRef = useRef<HTMLButtonElement>(null)

  const stopEditing = () => {
    setEditing(false)
    requestAnimationFrame(() => editBtnRef.current?.focus())
  }
  const when = formatDate(entry.date)
  const ticked = ticks(entry)
  const { checklist } = logContent

  return (
    <article className={`entry${fresh ? ' entry-fresh' : ''}${photoUrl ? ' has-photo' : ''}`} aria-labelledby={`entry-${entry.id}`}>
      <span className="entry-band" aria-hidden="true" />
      {fresh && (
        <p className="entry-badge">
          <LeafIcon width={18} height={18} /> {logContent.newBadge}
        </p>
      )}
      <div className="entry-main">
        <div className="entry-text">
          <h3 id={`entry-${entry.id}`}>{formatDate(entry.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          <p className="entry-height"><span className="visually-hidden">Height: </span>{heightText(entry, unit)}</p>
          {(ticked.soil || ticked.water) && (
            <ul className="entry-ticks" aria-label={checklist.legend}>
              {ticked.soil && <TickChip label={checklist.soil} />}
              {ticked.water && <TickChip label={checklist.water} />}
            </ul>
          )}
          {entry.note && <p className="entry-note">{entry.note}</p>}
        </div>
        {photoUrl &&
          (onViewPhoto ? (
            <button type="button" className="entry-thumb" onClick={() => onViewPhoto(entry)}>
              <img src={photoUrl} alt={photoAlt(entry, unit, plantName)} />
              <span className="visually-hidden"> View larger</span>
            </button>
          ) : (
            <img className="entry-thumb" src={photoUrl} alt={photoAlt(entry, unit, plantName)} />
          ))}
      </div>

      {editable && !editing && (
        <div className="entry-actions">
          <button type="button" className="btn btn-ghost" ref={editBtnRef} onClick={() => setEditing(true)}>
            <EditIcon width={20} height={20} /> Edit<span className="visually-hidden"> entry from {when}</span>
          </button>
          {onDelete && (
            <button type="button" className="btn btn-ghost entry-delete" onClick={() => onDelete(entry)}>
              <TrashIcon width={20} height={20} /> Delete<span className="visually-hidden"> entry from {when}</span>
            </button>
          )}
        </div>
      )}
      {editing && <LogForm entry={entry} onDone={stopEditing} />}
    </article>
  )
}

/** "Soil ✓". Screen readers hear "Soil ticked". */
function TickChip({ label }: { label: string }) {
  return (
    <li className="entry-tick">
      {label} <span aria-hidden="true">✓</span>
      <span className="visually-hidden"> {logContent.checklist.ticked}</span>
    </li>
  )
}
