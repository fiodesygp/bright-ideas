import Dexie, { type EntityTable } from 'dexie'

export type HeightUnit = 'cm' | 'in'
export type Soil = 'dry' | 'damp' | 'wet'

export interface LogEntry {
  id: number
  plantId: number
  /** Local calendar date, YYYY-MM-DD */
  date: string
  createdAt: number
  height: number
  heightUnit: HeightUnit
  /** Height normalized to cm, for the chart and sorting */
  heightCm: number
  leafCount: number | null
  /** Option ids from src/content/log.json; '' when left blank */
  leafColor: string
  soil: Soil | ''
  watered: boolean | null
  weather: string
  shade: string
  photo?: Blob
  note: string
  promptId: string
  /** Prompt text is saved with the entry so edits to prompts.json don't change history */
  promptText: string
  reflection: string
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

/** Entries newest first (by date, then by time saved). */
export async function getEntries(plantId: number) {
  const list = await db.entries.where('plantId').equals(plantId).toArray()
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export async function clearAllData() {
  await db.entries.clear()
}
