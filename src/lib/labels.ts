import { fromCm, type HeightUnit, type LogEntry } from '../data/db'

/** Rounded to one decimal place, without a trailing ".0". */
export function fmtNum(v: number) {
  return (Math.round(v * 10) / 10).toString()
}

/** Height shown in the unit picked in Settings. */
export function heightText(e: Pick<LogEntry, 'heightCm'>, unit: HeightUnit) {
  return `${fmtNum(fromCm(e.heightCm, unit))} ${unit}`
}
