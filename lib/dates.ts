// Lightweight Paris-timezone aware date helpers.
// The app is locale fr-FR / timezone Europe/Paris per spec.

const PARIS_TZ = "Europe/Paris"

export function formatDateFr(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    dateStyle: "medium",
    ...opts,
  }).format(d)
}

export function formatTimeFr(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatDateTimeFr(iso: string): string {
  return `${formatDateFr(iso)} · ${formatTimeFr(iso)}`
}

export function formatRangeFr(startIso: string, endIso: string, allDay = false): string {
  if (allDay) {
    const s = formatDateFr(startIso)
    const e = formatDateFr(endIso)
    return s === e ? s : `${s} → ${e}`
  }
  const sameDay = formatDateFr(startIso) === formatDateFr(endIso)
  if (sameDay) {
    return `${formatDateFr(startIso)} · ${formatTimeFr(startIso)} – ${formatTimeFr(endIso)}`
  }
  return `${formatDateTimeFr(startIso)} → ${formatDateTimeFr(endIso)}`
}

// Month grid: returns a 6x7 grid of Date objects starting from the Monday
// on/before the first of the month, expressed in local (server) time.
export function monthGrid(year: number, monthIndex: number): Date[] {
  const first = new Date(year, monthIndex, 1)
  // Monday = 1, Sunday = 0 -> shift so Monday is 0
  const shift = (first.getDay() + 6) % 7
  const start = new Date(year, monthIndex, 1 - shift)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return days
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function toISODate(d: Date): string {
  // local-date YYYY-MM-DD
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Returns true if event [startIso, endIso) overlaps with the given calendar day (Paris local).
export function eventTouchesDay(startIso: string, endIso: string, day: Date): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  const s = new Date(startIso).getTime()
  const e = new Date(endIso).getTime()
  return s < dayEnd && e > dayStart
}

export const FRENCH_MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

export const FRENCH_WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"]
