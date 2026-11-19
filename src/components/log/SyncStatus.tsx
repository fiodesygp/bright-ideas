import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAnnounce } from '../Announcer'
import { CheckIcon, CloudOffIcon, UploadIcon } from '../Icons'
import { logContent } from '../../content'
import { db } from '../../data/db'
import { fill } from '../../lib/labels'

// A state is only announced once it has lasted this long, so the short
// "waiting" moment after each save doesn't talk over "Saved to your Planting Log!".
const SETTLE_MS = 2000

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

/** "All entries uploaded" / "N waiting to upload" / "Offline — will upload later". */
export default function SyncStatus() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const waiting = useLiveQuery(async () => {
    const counts = await Promise.all([
      db.learners.where('dirty').equals(1).count(),
      db.entries.where('dirty').equals(1).count(),
      db.sunDayRuns.where('dirty').equals(1).count(),
      db.tombstones.count(),
    ])
    return counts.reduce((a, n) => a + n, 0)
  }, [])
  const announce = useAnnounce()
  const kind = waiting === undefined ? undefined : waiting === 0 ? 'done' : online ? 'waiting' : 'offline'
  const text = kind && (kind === 'waiting' ? fill(logContent.sync.waiting, { n: waiting! }) : logContent.sync[kind])
  const announced = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!kind) return
    // The first state is shown, not announced.
    if (announced.current === undefined) {
      announced.current = kind
      return
    }
    if (kind === announced.current) return
    const t = setTimeout(() => {
      announced.current = kind
      announce(text!)
    }, SETTLE_MS)
    return () => clearTimeout(t)
  }, [kind, text, announce])

  if (!kind) return null
  const Icon = kind === 'done' ? CheckIcon : kind === 'waiting' ? UploadIcon : CloudOffIcon
  return (
    <p className={`sync-status sync-${kind}`}>
      <Icon width={20} height={20} /> {text}
    </p>
  )
}
