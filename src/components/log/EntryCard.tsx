import type { HeightUnit, LogEntry } from '../../data/db'
import { formatDate } from '../../lib/dates'
import { entryDetails, heightText } from '../../lib/labels'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { TrashIcon } from '../Icons'

interface Props {
  entry: LogEntry
  unit: HeightUnit
  onDelete?: (entry: LogEntry) => void
}

export default function EntryCard({ entry, unit, onDelete }: Props) {
  const photoUrl = useObjectUrl(entry.photo)
  const details = entryDetails(entry)

  return (
    <article className="entry" aria-labelledby={`entry-${entry.id}`}>
      <header className="entry-head">
        <h3 id={`entry-${entry.id}`}>{formatDate(entry.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</h3>
        <p className="entry-height"><span className="visually-hidden">Height: </span>{heightText(entry, unit)}</p>
      </header>

      {details.length > 0 && (
        <dl className="entry-details">
          {details.map((d) => (
            <div key={d.label}>
              <dt>{d.label}</dt>
              <dd>
                {d.swatch && <span className="chip-swatch" style={{ background: d.swatch }} aria-hidden="true" />}
                {d.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {photoUrl && <img className="entry-photo" src={photoUrl} alt={`Photo of the plant on ${formatDate(entry.date)}`} />}

      {entry.note && <p className="entry-note">{entry.note}</p>}

      {entry.reflection && (
        <div className="entry-reflection">
          <p className="entry-prompt">{entry.promptText}</p>
          <p>{entry.reflection}</p>
        </div>
      )}

      {onDelete && (
        <button type="button" className="btn btn-ghost entry-delete" onClick={() => onDelete(entry)}>
          <TrashIcon width={20} height={20} />
          Delete<span className="visually-hidden"> entry from {formatDate(entry.date)}</span>
        </button>
      )}
    </article>
  )
}
