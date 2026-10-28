/** Today's local date as YYYY-MM-DD (input[type=date] format). */
export function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse YYYY-MM-DD as a local date (not UTC, which can shift the day). */
export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return parseISODate(iso).toLocaleDateString('en-US', opts)
}

export function daysAgo(iso: string) {
  const ms = parseISODate(todayISO()).getTime() - parseISODate(iso).getTime()
  const days = Math.round(ms / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
