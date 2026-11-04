import Dexie, { type EntityTable } from 'dexie'

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
  /** Compressed JPEG, stored only on this device */
  photo?: Blob
  /** Who the entry belongs to. Missing on entries saved before learners existed. */
  learnerId?: number
  /** Checklist ticks. Missing (or null, from the first version of the app) means not ticked. */
  soilChecked?: boolean
  watered?: boolean | null
}

/** One person logging on this device, like the cover of the printed booklet. */
export interface Learner {
  id: number
  /** First name or nickname */
  name: string
  /** '' when left blank */
  plant: string
  /** YYYY-MM-DD, or '' when left blank */
  startDate: string
}

export const db = new Dexie('bright-ideas') as Dexie & {
  entries: EntityTable<LogEntry, 'id'>
  learners: EntityTable<Learner, 'id'>
}

db.version(1).stores({
  entries: '++id, plantId, date, createdAt, [plantId+date]',
})
// Adds the learners table. Entries keep their stored shape; learnerId is not indexed.
db.version(2).stores({
  learners: '++id',
})

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
export async function addLearner(data: Omit<Learner, 'id'>) {
  return db.transaction('rw', db.learners, db.entries, async () => {
    const first = (await db.learners.count()) === 0
    const id = await db.learners.add(data as Learner)
    const adopted = first ? await db.entries.filter((e) => e.learnerId == null).modify({ learnerId: id }) : 0
    return { id, adopted }
  })
}

/** Deletes a learner and only their entries. */
export async function deleteLearner(id: number) {
  await db.transaction('rw', db.learners, db.entries, async () => {
    await db.entries.filter((e) => e.learnerId === id).delete()
    await db.learners.delete(id)
  })
}

export async function clearAllData() {
  await db.transaction('rw', db.learners, db.entries, async () => {
    await db.entries.clear()
    await db.learners.clear()
  })
}
