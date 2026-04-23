import type { Event, ConflictType, ConflictSeverity } from "./types"

export interface DetectedConflict {
  event_ids: string[]
  type: ConflictType
  severity: ConflictSeverity
  score_impact: number
  reason: string
}

// Deterministic, pure conflict detector.
// Only detects conflicts among non-system events, but flags school-holiday
// overlaps when a user event sits inside a system holiday window.
export function detectConflicts(
  events: Event[],
  opts: {
    holidayMode: "informational" | "soft_block" | "hard_block"
    workingHours: Record<string, { start: string; end: string } | null> | null
    defaultBufferMinutes: number
  },
): DetectedConflict[] {
  const conflicts: DetectedConflict[] = []
  const user = events.filter((e) => !e.is_system)
  const system = events.filter((e) => e.is_system)

  // 1) Strict overlaps between any two non-system events.
  for (let i = 0; i < user.length; i++) {
    for (let j = i + 1; j < user.length; j++) {
      const a = user[i]
      const b = user[j]
      if (overlaps(a, b)) {
        const severity: ConflictSeverity =
          a.priority === "critical" || b.priority === "critical"
            ? "critical"
            : a.priority === "high" || b.priority === "high"
              ? "medium"
              : "low"
        conflicts.push({
          event_ids: [a.id, b.id],
          type: "strict_overlap",
          severity,
          score_impact: severity === "critical" ? 1 : severity === "medium" ? 0.6 : 0.3,
          reason: `« ${a.title} » et « ${b.title} » se chevauchent.`,
        })
      }
    }
  }

  // 2) Buffer violations: two user events closer than required buffer.
  for (let i = 0; i < user.length; i++) {
    for (let j = i + 1; j < user.length; j++) {
      const a = user[i]
      const b = user[j]
      if (overlaps(a, b)) continue
      const gap = minutesBetween(a, b)
      const required = Math.max(
        a.buffer_after_minutes,
        b.buffer_before_minutes,
        opts.defaultBufferMinutes,
      )
      if (gap < required) {
        conflicts.push({
          event_ids: [a.id, b.id],
          type: "buffer_violation",
          severity: "low",
          score_impact: 0.2,
          reason: `Seulement ${gap} min entre « ${a.title} » et « ${b.title} » (minimum requis : ${required} min).`,
        })
      }
    }
  }

  // 3) School-holiday violations (soft_block or hard_block only).
  if (opts.holidayMode !== "informational") {
    const holidays = system.filter((e) => e.system_type === "vacation_period")
    for (const u of user) {
      for (const h of holidays) {
        if (overlaps(u, h)) {
          conflicts.push({
            event_ids: [u.id, h.id],
            type: "school_holiday_violation",
            severity: opts.holidayMode === "hard_block" ? "critical" : "medium",
            score_impact: opts.holidayMode === "hard_block" ? 0.9 : 0.5,
            reason: `« ${u.title} » tombe pendant « ${h.title} ».`,
          })
          break // one holiday clash is enough per event
        }
      }
    }
  }

  // 4) Working-hours violations.
  if (opts.workingHours) {
    for (const u of user) {
      if (u.all_day) continue
      if (outsideWorkingHours(u, opts.workingHours)) {
        conflicts.push({
          event_ids: [u.id],
          type: "working_hours_violation",
          severity: "low",
          score_impact: 0.15,
          reason: `« ${u.title} » est planifié en dehors de vos heures de travail.`,
        })
      }
    }
  }

  return conflicts
}

function overlaps(a: Event, b: Event): boolean {
  const as = new Date(a.start_at).getTime()
  const ae = new Date(a.end_at).getTime()
  const bs = new Date(b.start_at).getTime()
  const be = new Date(b.end_at).getTime()
  return as < be && bs < ae
}

function minutesBetween(a: Event, b: Event): number {
  const ae = new Date(a.end_at).getTime()
  const as = new Date(a.start_at).getTime()
  const be = new Date(b.end_at).getTime()
  const bs = new Date(b.start_at).getTime()
  if (ae <= bs) return Math.round((bs - ae) / 60000)
  if (be <= as) return Math.round((as - be) / 60000)
  return 0
}

function outsideWorkingHours(
  e: Event,
  hours: Record<string, { start: string; end: string } | null>,
): boolean {
  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  const start = new Date(e.start_at)
  const end = new Date(e.end_at)
  const dayKey = DAY_KEYS[start.getDay()]
  const window = hours[dayKey]
  if (!window) return true // No working day configured
  const [wsH, wsM] = window.start.split(":").map(Number)
  const [weH, weM] = window.end.split(":").map(Number)
  const ws = start.getHours() * 60 + start.getMinutes()
  const we = end.getHours() * 60 + end.getMinutes()
  const bandStart = wsH * 60 + wsM
  const bandEnd = weH * 60 + weM
  return ws < bandStart || we > bandEnd
}
