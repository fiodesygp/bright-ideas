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
}

export const db = new Dexie('bright-ideas') as Dexie & {
  entries: EntityTable<LogEntry, 'id'>
}

db.version(1).stores({
  entries: '++id, plantId, date, createdAt, [plantId+date]',
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
export async function getEntries(plantId: number): Promise<LogEntry[]> {
  const list = await db.entries.where('plantId').equals(plantId).toArray()
  return list
    .map((e) => ({ ...e, note: e.note ?? '' }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export async function clearAllData() {
  await db.entries.clear()
}
