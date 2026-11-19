import Dexie, { type EntityTable, type Transaction } from 'dexie'

export type HeightUnit = 'cm' | 'in'

export interface LogEntry {
  id: number
  plantId: number
  /** Local calendar date, YYYY-MM-DD */
  date: string
  createdAt: number
  updatedAt?: number
  height: number
  heightUnit: HeightUnit
  /** Height normalized to cm, for the chart and sorting */
  heightCm: number
  note: string
  /** Compressed JPEG, saved on the device and uploaded by the sync */
  photo?: Blob
  /** Who the entry belongs to. Missing on entries saved before learners existed. */
  learnerId?: number
  /** Checklist ticks. Missing (or null, from the first version of the app) means not ticked. */
  soilChecked?: boolean
  watered?: boolean | null
  /** Sync bookkeeping (see Sync below). */
  dirty?: 1
  syncedAt?: number
  /** The photo changed since it was last uploaded. */
  photoDirty?: 1
}

/** One person logging on this device, like the cover of the printed booklet. Uploaded by the sync. */
export interface Learner {
  id: number
  /** First name or nickname */
  name: string
  /** '' when left blank */
  plant: string
  /** YYYY-MM-DD, or '' when left blank */
  startDate: string
  dirty?: 1
  syncedAt?: number
}

/** A deleted learner or entry, kept until the sync tells the server. */
export interface Tombstone {
  id: number
  table: 'learners' | 'entries'
  localId: number
  deletedAt: number
}

export const db = new Dexie('bright-ideas') as Dexie & {
  entries: EntityTable<LogEntry, 'id'>
  learners: EntityTable<Learner, 'id'>
  tombstones: EntityTable<Tombstone, 'id'>
  /** Small key-value store; holds a copy of the device id. */
  meta: EntityTable<{ key: string; value: string }, 'key'>
}

db.version(1).stores({
  entries: '++id, plantId, date, createdAt, [plantId+date]',
})
// Adds the learners table. Entries keep their stored shape; learnerId is not indexed.
db.version(2).stores({
  learners: '++id',
})
// Sync bookkeeping. Every learner and entry already on the device is marked
// dirty, so the first sync uploads ("backfills") it.
db.version(3)
  .stores({
    learners: '++id, dirty',
    entries: '++id, plantId, date, createdAt, [plantId+date], dirty',
    tombstones: '++id, table, localId',
    meta: 'key',
  })
  .upgrade(async (tx) => {
    await tx.table('learners').toCollection().modify({ dirty: 1 })
    await tx.table('entries').toCollection().modify((e: LogEntry) => {
      e.dirty = 1
      if (e.photo) e.photoDirty = 1
    })
  })

// Set when IndexedDB was created from scratch on this visit (see device.ts).
let created = false
db.on('populate', () => {
  created = true
})
export const dbWasCreated = () => created

/* ---------- Sync: mark every change ----------
 * Hooks see every add, update and delete, so no call site can forget to
 * mark a record for upload. Deletes leave a tombstone in the same
 * transaction, so callers must include db.tombstones in it (see deleteEntry).
 */
const SYNC_KEYS = new Set(['dirty', 'syncedAt', 'photoDirty'])
type SyncTable = 'learners' | 'entries'

let editTick = 0
const lastEdit = new Map<string, number>()
/** Counter that goes up on every local change; the sync uses it to spot edits made while it uploads. */
export const currentEditTick = () => editTick
export const editedSince = (table: SyncTable, id: number, tick: number) => (lastEdit.get(`${table}:${id}`) ?? 0) > tick

const changeListeners = new Set<() => void>()
/** Called after any local change to learners or entries. */
export function onLocalChange(fn: () => void) {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}
const changed = () => changeListeners.forEach((fn) => fn())

for (const name of ['learners', 'entries'] as const) {
  const table = db.table(name)
  table.hook('creating', (_key, obj: LogEntry & Learner) => {
    obj.dirty = 1
    if (name === 'entries' && obj.photo) obj.photoDirty = 1
    changed()
  })
  table.hook('updating', (modifications: object, key) => {
    const mods = modifications as Record<string, unknown>
    // The sync's own bookkeeping writes are not changes.
    if (Object.keys(mods).every((k) => SYNC_KEYS.has(k))) return
    lastEdit.set(`${name}:${key}`, ++editTick)
    changed()
    const extra: Record<string, unknown> = { dirty: 1 }
    // Callers leave `photo` out of an update unless it changed (see LogForm).
    if (name === 'entries' && 'photo' in mods) extra.photoDirty = 1
    return extra
  })
  table.hook('deleting', (key, _obj, tx: Transaction) => {
    lastEdit.set(`${name}:${key}`, ++editTick)
    tx.table('tombstones').add({ table: name, localId: key as number, deletedAt: Date.now() })
    changed()
  })
}

export const CM_PER_IN = 2.54

export function toCm(value: number, unit: HeightUnit) {
  return unit === 'cm' ? value : value * CM_PER_IN
}

export function fromCm(cm: number, unit: HeightUnit) {
  return unit === 'cm' ? cm : cm / CM_PER_IN
}

/** The MVP tracks one plant. Entries keep a plantId so more plants can be added later. */
export const CURRENT_PLANT_ID = 1

/**
 * Entries newest first (by date, then by time saved).
 * Entries saved by older versions of the app may carry extra fields
 * (leaves, soil, weather...). They are left in storage and ignored here.
 */
export async function getEntries(plantId: number, learnerId: number): Promise<LogEntry[]> {
  const list = await db.entries.where('plantId').equals(plantId).toArray()
  return list
    .filter((e) => e.learnerId === learnerId)
    .map((e) => ({ ...e, note: e.note ?? '' }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

/**
 * Adds a learner. The first learner on a device also gets every entry saved
 * before learners existed. Returns the new id and how many entries it got.
 */
export async function addLearner(data: Pick<Learner, 'name' | 'plant' | 'startDate'>) {
  return db.transaction('rw', db.learners, db.entries, async () => {
    const first = (await db.learners.count()) === 0
    const id = await db.learners.add(data as Learner)
    const adopted = first ? await db.entries.filter((e) => e.learnerId == null).modify({ learnerId: id }) : 0
    return { id, adopted }
  })
}

/** Deletes one entry (and tells the server, through a tombstone). */
export async function deleteEntry(id: number) {
  await db.transaction('rw', db.entries, db.tombstones, () => db.entries.delete(id))
}

/** Deletes a learner and only their entries. */
export async function deleteLearner(id: number) {
  await db.transaction('rw', db.learners, db.entries, db.tombstones, async () => {
    await db.entries.filter((e) => e.learnerId === id).delete()
    await db.learners.delete(id)
  })
}

/** Deletes every learner and entry. Tombstones stay, so the server hears about it. */
export async function clearAllData() {
  await db.transaction('rw', db.learners, db.entries, db.tombstones, async () => {
    // Not clear(): that skips the hooks, so no tombstones would be written.
    await db.entries.toCollection().delete()
    await db.learners.toCollection().delete()
  })
}
