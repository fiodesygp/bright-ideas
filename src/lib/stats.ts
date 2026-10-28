import { fromCm, type HeightUnit, type LogEntry } from '../data/db'
import { formatDate, parseISODate, todayISO } from './dates'
import { fmtNum } from './labels'

export interface Stat {
  label: string
  value: string
  /** Small extra line, e.g. the date of a height */
  note?: string
}

/** Oldest first; same-day entries keep the order they were saved. */
export function chronological(entries: LogEntry[]) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
}

/** The five dashboard numbers. Expects at least one entry. */
export function summaryStats(entries: LogEntry[], unit: HeightUnit): Stat[] {
  const list = chronological(entries)
  const first = list[0]
  const latest = list[list.length - 1]
  const days = Math.round((parseISODate(todayISO()).getTime() - parseISODate(first.date).getTime()) / 86_400_000)
  const growth = fromCm(latest.heightCm - first.heightCm, unit)
  const sign = growth > 0 ? '+' : growth < 0 ? '−' : ''
  return [
    { label: 'Days since first entry', value: String(Math.max(0, days)) },
    { label: 'Entries', value: String(list.length) },
    { label: 'Starting height', value: `${fmtNum(fromCm(first.heightCm, unit))} ${unit}`, note: formatDate(first.date, { month: 'short', day: 'numeric' }) },
    { label: 'Latest height', value: `${fmtNum(fromCm(latest.heightCm, unit))} ${unit}`, note: formatDate(latest.date, { month: 'short', day: 'numeric' }) },
    { label: 'Total growth', value: `${sign}${fmtNum(Math.abs(growth))} ${unit}` },
  ]
}

/** One-sentence description of the height trend, for chart alt text. */
export function chartSummary(entries: LogEntry[], unit: HeightUnit) {
  const list = chronological(entries)
  const first = list[0]
  const last = list[list.length - 1]
  const h = (e: LogEntry) => `${fmtNum(fromCm(e.heightCm, unit))} ${unit}`
  return list.length === 1
    ? `One entry: ${h(first)} on ${formatDate(first.date)}.`
    : `Height went from ${h(first)} on ${formatDate(first.date)} to ${h(last)} on ${formatDate(last.date)}, over ${list.length} entries.`
}

/** Alt text for an entry's photo, built from its date and height. */
export function photoAlt(e: LogEntry, unit: HeightUnit, plantName: string) {
  return `Photo of ${plantName} on ${formatDate(e.date)}, ${fmtNum(fromCm(e.heightCm, unit))} ${unit} tall.`
}
