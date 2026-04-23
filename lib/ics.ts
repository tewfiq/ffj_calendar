// Minimal iCalendar (RFC 5545) parser tuned for Google Calendar exports.
// Supports:
//  - VEVENT blocks (VTIMEZONE / VTODO / VJOURNAL / VFREEBUSY / VALARM ignored)
//  - Line unfolding (CRLF + LWSP continuation)
//  - Property parameters (TZID, VALUE=DATE)
//  - Common properties: UID, SUMMARY, DESCRIPTION, LOCATION, DTSTART, DTEND, DURATION, RRULE, STATUS
//  - Escape sequences: \n, \,, \;, \\
//  - Basic RRULE expansion for FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with COUNT/UNTIL/INTERVAL/BYDAY
//  - All-day events (VALUE=DATE)
// Dates are always emitted as UTC ISO strings. TZID is preserved for display only;
// precise TZID → UTC conversion is only done for UTC ("Z") and local (browser/server tz naive) cases.
// For TZID we fall back to treating the local time as if it were in Europe/Paris offset
// for the given date — sufficient for French users importing Google Calendar.

export interface IcsEvent {
  uid: string | null
  summary: string
  description: string | null
  location: string | null
  start_at: string // ISO UTC
  end_at: string // ISO UTC
  all_day: boolean
  timezone: string | null
  status: string | null
  recurrence_master_uid: string | null
}

export interface IcsParseResult {
  calendarName: string | null
  events: IcsEvent[]
  rawEventCount: number
  expandedEventCount: number
  errorCount: number
}

/** Unfold lines per RFC 5545 §3.1: CRLF + (SPACE|TAB) continues previous line. */
function unfold(text: string): string[] {
  // Normalize line endings.
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const rawLines = normalized.split("\n")
  const out: string[] = []
  for (const l of rawLines) {
    if (l.startsWith(" ") || l.startsWith("\t")) {
      if (out.length > 0) out[out.length - 1] += l.slice(1)
    } else {
      out.push(l)
    }
  }
  return out
}

interface ParsedProperty {
  name: string
  params: Record<string, string>
  value: string
}

function parseLine(line: string): ParsedProperty | null {
  const colon = line.indexOf(":")
  if (colon === -1) return null
  const left = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const parts = left.split(";")
  const name = parts[0].toUpperCase()
  const params: Record<string, string> = {}
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=")
    if (eq === -1) continue
    params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1).replace(/^"|"$/g, "")
  }
  return { name, params, value }
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
}

/**
 * Parse an ICS date-time value.
 * Forms:
 *  - 20260316T093000Z (UTC)
 *  - 20260316T093000 (floating/local, with possible TZID param)
 *  - 20260316 (date-only, VALUE=DATE)
 */
function parseIcsDate(
  value: string,
  params: Record<string, string>,
): { iso: string; allDay: boolean; tzid: string | null } | null {
  const dateOnly = params.VALUE === "DATE" || /^\d{8}$/.test(value)
  if (dateOnly) {
    const m = value.match(/^(\d{4})(\d{2})(\d{2})$/)
    if (!m) return null
    const [, y, mo, d] = m
    // Represent all-day as 00:00 UTC of the given date.
    const iso = new Date(`${y}-${mo}-${d}T00:00:00Z`).toISOString()
    return { iso, allDay: true, tzid: null }
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/)
  if (!m) return null
  const [, y, mo, d, hh, mi, ss, z] = m
  if (z === "Z") {
    return { iso: `${y}-${mo}-${d}T${hh}:${mi}:${ss}.000Z`, allDay: false, tzid: null }
  }
  const tzid = params.TZID ?? null
  // Floating / TZID-local: interpret as Europe/Paris and convert to UTC.
  // Paris offset: UTC+1 (CET) or UTC+2 (CEST). We approximate DST with a simple rule:
  // last Sunday of March 01:00 UTC → last Sunday of October 01:00 UTC is CEST (UTC+2).
  const offsetMin = parisOffsetMinutes(
    parseInt(y, 10),
    parseInt(mo, 10),
    parseInt(d, 10),
    parseInt(hh, 10),
    parseInt(mi, 10),
  )
  const utcMs =
    Date.UTC(
      parseInt(y, 10),
      parseInt(mo, 10) - 1,
      parseInt(d, 10),
      parseInt(hh, 10),
      parseInt(mi, 10),
      parseInt(ss, 10),
    ) -
    offsetMin * 60000
  return { iso: new Date(utcMs).toISOString(), allDay: false, tzid }
}

function lastSundayUtc(year: number, monthIndex: number): Date {
  // monthIndex: 2 for March, 9 for October.
  // Start from the last day of the month, walk back to Sunday.
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  const dow = last.getUTCDay() // 0 = Sunday
  last.setUTCDate(last.getUTCDate() - dow)
  last.setUTCHours(1, 0, 0, 0) // DST transitions at 01:00 UTC
  return last
}

function parisOffsetMinutes(year: number, month: number, day: number, hour: number, minute: number): number {
  // Build a "would be UTC if CET (+60)" timestamp and compare against DST window in UTC.
  const asUtc = Date.UTC(year, month - 1, day, hour, minute) - 60 * 60000
  const dstStart = lastSundayUtc(year, 2).getTime() // March
  const dstEnd = lastSundayUtc(year, 9).getTime() // October
  return asUtc >= dstStart && asUtc < dstEnd ? 120 : 60
}

/** Parse an ISO-duration as in RFC 5545 (e.g. PT1H30M, P1D). Returns ms. */
function parseDuration(value: string): number | null {
  const m = value.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) return null
  const sign = m[1] === "-" ? -1 : 1
  const w = parseInt(m[2] ?? "0", 10)
  const d = parseInt(m[3] ?? "0", 10)
  const h = parseInt(m[4] ?? "0", 10)
  const mi = parseInt(m[5] ?? "0", 10)
  const s = parseInt(m[6] ?? "0", 10)
  return sign * (((w * 7 + d) * 24 + h) * 3600 + mi * 60 + s) * 1000
}

interface RRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  interval: number
  count: number | null
  until: Date | null
  byday: string[] | null // e.g. ["MO","WE","FR"]
}

function parseRRule(value: string): RRule | null {
  const parts = value.split(";")
  const map: Record<string, string> = {}
  for (const p of parts) {
    const [k, v] = p.split("=")
    if (k && v) map[k.toUpperCase()] = v
  }
  const freq = map.FREQ as RRule["freq"] | undefined
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null
  let until: Date | null = null
  if (map.UNTIL) {
    const parsed = parseIcsDate(map.UNTIL, {})
    if (parsed) until = new Date(parsed.iso)
  }
  return {
    freq,
    interval: map.INTERVAL ? Math.max(1, parseInt(map.INTERVAL, 10)) : 1,
    count: map.COUNT ? parseInt(map.COUNT, 10) : null,
    until,
    byday: map.BYDAY ? map.BYDAY.split(",").map((b) => b.toUpperCase()) : null,
  }
}

const DAY_CODE_TO_INDEX: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

/** Expand an RRULE from a single DTSTART within [windowStart, windowEnd]. */
function expandRRule(
  rule: RRule,
  dtStartMs: number,
  durationMs: number,
  windowStart: number,
  windowEnd: number,
  exdates: Set<number>,
  hardCap: number,
): Array<{ start: number; end: number }> {
  const results: Array<{ start: number; end: number }> = []
  let emitted = 0
  const addIfInWindow = (startMs: number) => {
    if (rule.count !== null && emitted >= rule.count) return false
    if (rule.until && startMs > rule.until.getTime()) return false
    emitted++
    if (exdates.has(startMs)) return true
    const end = startMs + durationMs
    if (end < windowStart || startMs > windowEnd) return true
    results.push({ start: startMs, end })
    return true
  }

  const startDate = new Date(dtStartMs)

  if (rule.freq === "DAILY") {
    let cur = dtStartMs
    let i = 0
    while (i < hardCap) {
      if (!addIfInWindow(cur)) break
      cur += rule.interval * 86400000
      if (cur > windowEnd && (!rule.count || emitted >= rule.count)) break
      i++
    }
  } else if (rule.freq === "WEEKLY") {
    // If BYDAY given, expand within each week-of-interval from the DTSTART's week.
    const byday =
      rule.byday && rule.byday.length > 0 ? rule.byday : [Object.keys(DAY_CODE_TO_INDEX)[startDate.getUTCDay()]]
    const bydayIdx = byday.map((b) => DAY_CODE_TO_INDEX[b]).filter((n) => n !== undefined)
    // Start from the Sunday of the DTSTART's week in UTC.
    const weekStart = new Date(dtStartMs)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay())
    weekStart.setUTCHours(startDate.getUTCHours(), startDate.getUTCMinutes(), startDate.getUTCSeconds(), 0)
    let weekBase = weekStart.getTime()
    let i = 0
    while (i < hardCap) {
      for (const idx of bydayIdx.sort((a, b) => a - b)) {
        const occur = weekBase + idx * 86400000
        if (occur < dtStartMs) continue
        if (!addIfInWindow(occur)) return results
      }
      weekBase += rule.interval * 7 * 86400000
      if (weekBase > windowEnd && (!rule.count || emitted >= rule.count)) break
      i++
    }
  } else if (rule.freq === "MONTHLY") {
    let y = startDate.getUTCFullYear()
    let m = startDate.getUTCMonth()
    const d = startDate.getUTCDate()
    const hh = startDate.getUTCHours()
    const mi = startDate.getUTCMinutes()
    let i = 0
    while (i < hardCap) {
      const occur = Date.UTC(y, m, d, hh, mi)
      // Guard against month-skew (e.g. Jan 31 -> Feb)
      if (new Date(occur).getUTCMonth() !== ((m % 12) + 12) % 12) {
        // skip invalid day
      } else {
        if (!addIfInWindow(occur)) break
      }
      m += rule.interval
      y += Math.floor(m / 12)
      m = ((m % 12) + 12) % 12
      if (Date.UTC(y, m, d) > windowEnd && (!rule.count || emitted >= rule.count)) break
      i++
    }
  } else if (rule.freq === "YEARLY") {
    let y = startDate.getUTCFullYear()
    const m = startDate.getUTCMonth()
    const d = startDate.getUTCDate()
    const hh = startDate.getUTCHours()
    const mi = startDate.getUTCMinutes()
    let i = 0
    while (i < hardCap) {
      const occur = Date.UTC(y, m, d, hh, mi)
      if (!addIfInWindow(occur)) break
      y += rule.interval
      if (Date.UTC(y, m, d) > windowEnd && (!rule.count || emitted >= rule.count)) break
      i++
    }
  }

  return results
}

export function parseIcs(
  raw: string,
  opts: { windowStart?: Date; windowEnd?: Date } = {},
): IcsParseResult {
  const windowStart = opts.windowStart ?? new Date(Date.now() - 365 * 24 * 3600 * 1000)
  const windowEnd = opts.windowEnd ?? new Date(Date.now() + 365 * 24 * 3600 * 1000)
  const windowStartMs = windowStart.getTime()
  const windowEndMs = windowEnd.getTime()

  const lines = unfold(raw)
  let calendarName: string | null = null
  const events: IcsEvent[] = []
  let errorCount = 0
  let rawEventCount = 0

  let inEvent = false
  let inOther = false // any non-VEVENT sub-component (e.g. VTIMEZONE, VALARM)
  let otherDepth = 0
  let current: {
    uid: string | null
    summary: string | null
    description: string | null
    location: string | null
    status: string | null
    dtstart: { iso: string; allDay: boolean; tzid: string | null } | null
    dtend: { iso: string; allDay: boolean; tzid: string | null } | null
    duration: number | null
    rrule: RRule | null
    exdates: number[]
    recurrenceId: string | null
  } | null = null

  for (const line of lines) {
    const prop = parseLine(line)
    if (!prop) continue

    if (prop.name === "BEGIN") {
      const v = prop.value.toUpperCase()
      if (v === "VEVENT" && !inOther) {
        inEvent = true
        current = {
          uid: null,
          summary: null,
          description: null,
          location: null,
          status: null,
          dtstart: null,
          dtend: null,
          duration: null,
          rrule: null,
          exdates: [],
          recurrenceId: null,
        }
      } else if (v !== "VCALENDAR") {
        inOther = true
        otherDepth++
      }
      continue
    }
    if (prop.name === "END") {
      const v = prop.value.toUpperCase()
      if (v === "VEVENT" && inEvent && current) {
        rawEventCount++
        const built = buildEvent(current, windowStartMs, windowEndMs)
        if (built === null) {
          errorCount++
        } else {
          for (const e of built) events.push(e)
        }
        inEvent = false
        current = null
      } else if (v !== "VCALENDAR") {
        otherDepth = Math.max(0, otherDepth - 1)
        if (otherDepth === 0) inOther = false
      }
      continue
    }

    if (inOther) continue

    if (!inEvent) {
      if (prop.name === "X-WR-CALNAME") calendarName = unescapeText(prop.value)
      continue
    }

    if (!current) continue

    switch (prop.name) {
      case "UID":
        current.uid = prop.value
        break
      case "SUMMARY":
        current.summary = unescapeText(prop.value)
        break
      case "DESCRIPTION":
        current.description = unescapeText(prop.value)
        break
      case "LOCATION":
        current.location = unescapeText(prop.value)
        break
      case "STATUS":
        current.status = prop.value
        break
      case "DTSTART":
        current.dtstart = parseIcsDate(prop.value, prop.params)
        break
      case "DTEND":
        current.dtend = parseIcsDate(prop.value, prop.params)
        break
      case "DURATION": {
        const d = parseDuration(prop.value)
        if (d !== null) current.duration = d
        break
      }
      case "RRULE":
        current.rrule = parseRRule(prop.value)
        break
      case "EXDATE": {
        // EXDATE can have multiple comma-separated values.
        for (const v of prop.value.split(",")) {
          const parsed = parseIcsDate(v, prop.params)
          if (parsed) current.exdates.push(new Date(parsed.iso).getTime())
        }
        break
      }
      case "RECURRENCE-ID":
        current.recurrenceId = prop.value
        break
      default:
        break
    }
  }

  return {
    calendarName,
    events,
    rawEventCount,
    expandedEventCount: events.length,
    errorCount,
  }
}

interface EventDraft {
  uid: string | null
  summary: string | null
  description: string | null
  location: string | null
  status: string | null
  dtstart: { iso: string; allDay: boolean; tzid: string | null } | null
  dtend: { iso: string; allDay: boolean; tzid: string | null } | null
  duration: number | null
  rrule: RRule | null
  exdates: number[]
  recurrenceId: string | null
}

function buildEvent(c: EventDraft, windowStart: number, windowEnd: number): IcsEvent[] | null {
  if (!c.summary || !c.dtstart) return null
  if (c.status && c.status.toUpperCase() === "CANCELLED") return null
  // Skip recurrence overrides for now (they'd modify a specific occurrence which we don't track).
  if (c.recurrenceId) return null

  const startMs = new Date(c.dtstart.iso).getTime()
  let endMs: number
  if (c.dtend) {
    endMs = new Date(c.dtend.iso).getTime()
  } else if (c.duration !== null) {
    endMs = startMs + c.duration
  } else if (c.dtstart.allDay) {
    endMs = startMs + 24 * 3600 * 1000
  } else {
    endMs = startMs + 60 * 60 * 1000
  }
  const durationMs = Math.max(0, endMs - startMs)

  const mkEvent = (s: number, e: number): IcsEvent => ({
    uid: c.uid,
    summary: c.summary!,
    description: c.description,
    location: c.location,
    start_at: new Date(s).toISOString(),
    end_at: new Date(e).toISOString(),
    all_day: c.dtstart!.allDay,
    timezone: c.dtstart!.tzid,
    status: c.status,
    recurrence_master_uid: c.rrule ? c.uid : null,
  })

  if (!c.rrule) {
    if (endMs < windowStart || startMs > windowEnd) return []
    return [mkEvent(startMs, endMs)]
  }

  const exdates = new Set(c.exdates)
  const occurrences = expandRRule(c.rrule, startMs, durationMs, windowStart, windowEnd, exdates, 1200)
  return occurrences.map((o) => mkEvent(o.start, o.end))
}
