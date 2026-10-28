import { useRef, useState } from 'react'
import type { HeightUnit, LogEntry } from '../../data/db'
import { formatDate } from '../../lib/dates'
import { heightText } from '../../lib/labels'
import { photoAlt } from '../../lib/stats'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { EditIcon, TrashIcon } from '../Icons'
import LogForm from './LogForm'

interface Props {
  entry: LogEntry
  unit: HeightUnit
  plantName: string
  /** Show Edit and Delete buttons */
  editable?: boolean
  onDelete?: (entry: LogEntry) => void
  onViewPhoto?: (entry: LogEntry) => void
}

export default function EntryCard({ entry, unit, plantName, editable, onDelete, onViewPhoto }: Props) {
  const photoUrl = useObjectUrl(entry.photo)
  const [editing, setEditing] = useState(false)
  const editBtnRef = useRef<HTMLButtonElement>(null)

  const stopEditing = () => {
    setEditing(false)
    requestAnimationFrame(() => editBtnRef.current?.focus())
  }
  const when = formatDate(entry.date)

  return (
    <article className="entry" aria-labelledby={`entry-${entry.id}`}>
      <div className="entry-main">
        {photoUrl &&
          (onViewPhoto ? (
            <button type="button" className="entry-thumb" onClick={() => onViewPhoto(entry)}>
              <img src={photoUrl} alt={photoAlt(entry, unit, plantName)} />
              <span className="visually-hidden"> View larger</span>
            </button>
          ) : (
            <img className="entry-thumb" src={photoUrl} alt={photoAlt(entry, unit, plantName)} />
          ))}
        <div className="entry-text">
          <h3 id={`entry-${entry.id}`}>{formatDate(entry.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          <p className="entry-height"><span className="visually-hidden">Height: </span>{heightText(entry, unit)}</p>
          {entry.note && <p className="entry-note">{entry.note}</p>}
        </div>
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
