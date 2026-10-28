import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ExportSheet from './ExportSheet'
import { DownloadIcon } from './Icons'
import { CURRENT_PLANT_ID, getEntries, type LogEntry } from '../data/db'
import { useSettings } from '../data/settings'
import { todayISO } from '../lib/dates'
import './ExportButtons.css'

type Format = 'pdf' | 'png'

interface Job {
  format: Format
  entries: LogEntry[]
  photoUrls: Map<number, string>
}

export default function ExportButtons() {
  const { settings } = useSettings()
  const [job, setJob] = useState<Job | null>(null)
  const [message, setMessage] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)

  async function start(format: Format) {
    setMessage(format === 'pdf' ? 'Making your PDF…' : 'Making your image…')
    const entries = await getEntries(CURRENT_PLANT_ID)
    const photoUrls = new Map<number, string>()
    entries.forEach((e) => e.photo && photoUrls.set(e.id, URL.createObjectURL(e.photo)))
    setJob({ format, entries, photoUrls })
  }

  // The PDF is built from data. The image needs the off-screen sheet in the page first.
  useEffect(() => {
    const node = sheetRef.current
    if (!job || (job.format === 'png' && !node)) return
    let cancelled = false
    ;(async () => {
      try {
        const name = `planting-log-${todayISO()}`
        if (job.format === 'png') {
          const { exportImage } = await import('../lib/exportImage')
          await exportImage(node!, `${name}.png`)
        } else {
          const { exportPdf } = await import('../lib/exportPdf')
          await exportPdf({ entries: job.entries, plantName: settings.plantName, unit: settings.heightUnit }, `${name}.pdf`)
        }
        if (!cancelled) setMessage(job.format === 'pdf' ? 'Your PDF is ready. Check your downloads.' : 'Your image is ready. Check your downloads.')
      } catch (err) {
        console.error('Export failed', err)
        if (!cancelled) setMessage('Something went wrong. Please try again.')
      } finally {
        job.photoUrls.forEach((u) => URL.revokeObjectURL(u))
        if (!cancelled) setJob(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [job, settings.plantName, settings.heightUnit])

  return (
    <div className="export-buttons">
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={() => start('pdf')} disabled={!!job}>
          <DownloadIcon width={20} height={20} /> Save as PDF
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => start('png')} disabled={!!job}>
          <DownloadIcon width={20} height={20} /> Save as image
        </button>
      </div>
      <p className="export-status" role="status">{message}</p>
      {job?.format === 'png' &&
        createPortal(
          <div className="export-offscreen" aria-hidden="true">
            <ExportSheet ref={sheetRef} plantName={settings.plantName} unit={settings.heightUnit} entries={job.entries} photoUrls={job.photoUrls} />
          </div>,
          document.body,
        )}
    </div>
  )
}
