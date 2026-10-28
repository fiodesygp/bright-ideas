import { useEffect, useRef } from 'react'
import type { HeightUnit, LogEntry } from '../data/db'
import { formatDate } from '../lib/dates'
import { heightText } from '../lib/labels'
import { photoAlt } from '../lib/stats'
import { useObjectUrl } from '../lib/useObjectUrl'
import { CloseIcon } from './Icons'
import './PhotoViewer.css'

interface Props {
  entry: LogEntry | null
  unit: HeightUnit
  plantName: string
  onClose: () => void
}

/** Larger view of one entry's photo in a native modal dialog. */
export default function PhotoViewer({ entry, unit, plantName, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const url = useObjectUrl(entry?.photo)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (entry && !d.open) d.showModal()
    if (!entry && d.open) d.close()
  }, [entry])

  return (
    <dialog ref={ref} className="photo-viewer" aria-labelledby="photo-viewer-title" onClose={onClose}>
      {entry && (
        <>
          <div className="photo-viewer-head">
            <h2 id="photo-viewer-title">{formatDate(entry.date)} · {heightText(entry, unit)}</h2>
            <button type="button" className="btn btn-secondary" onClick={onClose} autoFocus>
              <CloseIcon width={20} height={20} /> Close
            </button>
          </div>
          {url && <img src={url} alt={photoAlt(entry, unit, plantName)} />}
          {entry.note && <p>{entry.note}</p>}
        </>
      )}
    </dialog>
  )
}
