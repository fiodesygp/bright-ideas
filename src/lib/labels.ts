import { logContent, type Option } from '../content'
import { fromCm, type HeightUnit, type LogEntry } from '../data/db'

const find = (list: Option[], id: string) => list.find((o) => o.id === id)

/** Height shown in the unit picked in Settings. */
export function heightText(e: LogEntry, unit: HeightUnit) {
  const shown = Math.round(fromCm(e.heightCm, unit) * 10) / 10
  return `${shown} ${unit}`
}

/** Readable rows for one entry. Blank fields are left out. */
export function entryDetails(e: LogEntry) {
  const color = find(logContent.leafColors, e.leafColor)
  const rows: { label: string; value: string; swatch?: string }[] = []
  if (e.leafCount !== null) rows.push({ label: 'Leaves', value: String(e.leafCount) })
  if (color) rows.push({ label: 'Leaf color', value: color.label, swatch: color.swatch })
  if (e.soil) rows.push({ label: 'Soil', value: find(logContent.soil, e.soil)?.label ?? e.soil })
  if (e.watered !== null) rows.push({ label: 'Watered', value: e.watered ? 'Yes' : 'No' })
  if (e.weather) rows.push({ label: 'Weather', value: find(logContent.weather, e.weather)?.label ?? e.weather })
  if (e.shade) rows.push({ label: 'Panel shade', value: find(logContent.shade, e.shade)?.label ?? e.shade })
  return rows
}
