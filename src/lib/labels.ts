import { fromCm, type HeightUnit, type Learner, type LogEntry } from '../data/db'
import { logContent } from '../content'
import { formatDate } from './dates'

/** Rounded to one decimal place, without a trailing ".0". */
export function fmtNum(v: number) {
  return (Math.round(v * 10) / 10).toString()
}

/** Height shown in the unit picked in Settings. */
export function heightText(e: Pick<LogEntry, 'heightCm'>, unit: HeightUnit) {
  return `${fmtNum(fromCm(e.heightCm, unit))} ${unit}`
}

/** Fills "{name}"-style slots in a content string. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => (key in values ? String(values[key]) : slot))
}

/** "Maya's Planting Log" */
export function logTitle(learner: Pick<Learner, 'name'>) {
  return fill(logContent.about.logTitle, { name: learner.name })
}

/** The learner's plant, or "My plant" when they left it blank. */
export function plantLabel(learner: Pick<Learner, 'plant'> | undefined) {
  return learner?.plant || logContent.about.plantFallback
}

/** "Basil · started Nov 4", leaving out what was left blank. */
export function learnerDetails(learner: Pick<Learner, 'plant' | 'startDate'>) {
  const started = learner.startDate && fill(logContent.about.started, { date: formatDate(learner.startDate, { month: 'short', day: 'numeric' }) })
  return [learner.plant, started].filter(Boolean).join(' · ')
}

/** Checklist ticks on an entry. Only `true` counts; old entries may have null or nothing. */
export function ticks(e: Pick<LogEntry, 'soilChecked' | 'watered'>) {
  return { soil: e.soilChecked === true, water: e.watered === true }
}

/** "1 entry", "3 entries" */
export function entriesText(n: number) {
  return `${n} ${n === 1 ? logContent.count.entry : logContent.count.entries}`
}
