// Uploads learners, entries and photos to the project team's database through
// the sync endpoint (api/sync.ts). The app stays local-first: everything is
// saved on the device first, and this runs in the background. Nothing here
// blocks a save; a failed upload stays queued and is tried again later.
import { currentEditTick, db, editedSince, onLocalChange, type Learner, type LogEntry } from './db'
import { getDeviceId } from './device'

/** The Vercel deployment's endpoint. GitHub Pages builds set VITE_SYNC_URL to it. */
export const SYNC_URL = import.meta.env.VITE_SYNC_URL || `${location.origin}/api/sync`

// Text-only records go in batches; each photo goes in its own request, so
// every request stays well under Vercel's 4.5 MB body limit.
const BATCH = 50
const TOMBSTONE_BATCH = 200
const DEBOUNCE_MS = 1500
const FIRST_RETRY_MS = 5_000
const MAX_RETRY_MS = 5 * 60_000

/** A failed request. `retryAfterMs` is set when the server said how long to wait (429). */
class SyncError extends Error {
  retryAfterMs = 0
}

async function send(url: string, init: RequestInit) {
  // Same-origin credentials: on a protected Vercel preview the request needs
  // Vercel's own cookie; nothing is ever sent cross-origin with cookies.
  const res = await fetch(url, { ...init, mode: 'cors', credentials: 'same-origin', cache: 'no-store' })
  if (res.ok) return
  const err = new SyncError(`Sync request failed: ${res.status} ${await res.text().catch(() => '')}`)
  // Too many requests is not a problem with the data: wait as asked, then try again.
  if (res.status === 429) err.retryAfterMs = (Number(res.headers.get('Retry-After')) || 0) * 1000
  throw err
}

const postJson = (body: unknown) =>
  send(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const postPhoto = (deviceId: string, entryId: number, photo: Blob) =>
  send(`${SYNC_URL}?${new URLSearchParams({ device: deviceId, entry: String(entryId) })}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: photo,
  })

function* chunks<T>(list: T[], size: number) {
  for (let i = 0; i < list.length; i += size) yield list.slice(i, i + size)
}

const learnerOut = (l: Learner) => ({ localId: l.id, name: l.name, plant: l.plant ?? '', startDate: l.startDate ?? '' })

// Entries saved by older versions may lack fields or carry extra ones; send only these.
const entryOut = (e: LogEntry) => ({
  localId: e.id,
  learnerId: e.learnerId ?? null,
  plantId: e.plantId,
  date: e.date,
  height: e.height,
  heightUnit: e.heightUnit,
  heightCm: e.heightCm,
  note: e.note ?? '',
  soilChecked: typeof e.soilChecked === 'boolean' ? e.soilChecked : null,
  watered: typeof e.watered === 'boolean' ? e.watered : null,
  hasPhoto: !!e.photo,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt ?? null,
})

/** Clears the dirty mark once the server has the record, unless it was edited meanwhile. */
async function markSynced(table: 'learners' | 'entries', records: (Learner | LogEntry)[], tick: number) {
  const t = db.table(table)
  await db.transaction('rw', t, async () => {
    for (const r of records) {
      if (editedSince(table, r.id, tick)) continue
      const done: Record<string, unknown> = { dirty: undefined, syncedAt: Date.now() }
      // A removed photo has nothing left to upload.
      if (table === 'entries' && !(r as LogEntry).photo) done.photoDirty = undefined
      await t.update(r.id, done)
    }
  })
}

/** Learners first, then each changed photo, then entries, then deletions. */
async function pushAll() {
  const deviceId = await getDeviceId()
  const about = { deviceId, appVersion: __APP_VERSION__ }

  let tick = currentEditTick()
  const learners = await db.learners.where('dirty').equals(1).toArray()
  for (const part of chunks(learners, BATCH)) {
    await postJson({ ...about, learners: part.map(learnerOut) })
    await markSynced('learners', part, tick)
  }

  tick = currentEditTick()
  const entries = await db.entries.where('dirty').equals(1).toArray()
  for (const e of entries) {
    if (!e.photo || !e.photoDirty) continue
    await postPhoto(deviceId, e.id, e.photo)
    await db.transaction('rw', db.entries, async () => {
      if (!editedSince('entries', e.id, tick)) await db.entries.update(e.id, { photoDirty: undefined })
    })
  }
  for (const part of chunks(entries, BATCH)) {
    await postJson({ ...about, entries: part.map(entryOut) })
    await markSynced('entries', part, tick)
  }

  const stones = await db.tombstones.toArray()
  for (const part of chunks(stones, TOMBSTONE_BATCH)) {
    await postJson({ ...about, deletes: part.map((t) => ({ table: t.table, localId: t.localId })) })
    await db.tombstones.bulkDelete(part.map((t) => t.id))
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
let running = false
let again = false
let failures = 0

/** Runs a sync after `delay` ms. Calls in quick succession run it once. */
export function scheduleSync(delay = DEBOUNCE_MS) {
  clearTimeout(timer)
  timer = setTimeout(run, delay)
}

async function run() {
  if (running) {
    again = true
    return
  }
  // The `online` event starts it again.
  if (!navigator.onLine) return
  running = true
  try {
    await pushAll()
    failures = 0
  } catch (err) {
    failures++
    again = false
    const backoff = FIRST_RETRY_MS * 2 ** (failures - 1)
    const asked = err instanceof SyncError ? err.retryAfterMs : 0
    const wait = Math.min(MAX_RETRY_MS, Math.max(backoff, asked))
    console.warn(`Upload failed; trying again in ${Math.round(wait / 1000)} s.`, err)
    scheduleSync(wait)
  } finally {
    running = false
    if (again) {
      again = false
      scheduleSync(0)
    }
  }
}

let started = false

/** Starts background uploads: now, after every change, when back online, and when the app is shown again. */
export function startSync() {
  if (started) return
  started = true
  onLocalChange(() => scheduleSync())
  window.addEventListener('online', () => scheduleSync(0))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(0)
  })
  scheduleSync(0)
}
