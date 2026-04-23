"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import type { CsvTargetField } from "@/lib/types"
import { detectConflicts } from "@/lib/conflict-engine"
import { getSettings, listEventsBetween } from "@/lib/queries"

export interface CommitImportInput {
  filename: string
  calendarName: string
  calendarColor: string
  mapping: Partial<Record<CsvTargetField, string>> // target -> source header
  rows: Array<Record<string, string>> // parsed rows keyed by source header
}

export interface CommitImportResult {
  calendarId: string
  importId: string
  eventCount: number
  errorCount: number
  conflictsDetected: number
}

// Commits a parsed CSV: creates a calendar, an import row, and inserts all events.
// After insertion, re-runs conflict detection across the full event universe.
export async function commitCsvImport(input: CommitImportInput): Promise<CommitImportResult> {
  const sb = createServerClient()

  // 1. Create calendar
  const { data: cal, error: calErr } = await sb
    .from("calendars")
    .insert({
      name: input.calendarName.trim() || input.filename.replace(/\.csv$/i, ""),
      source_type: "csv_import",
      color: input.calendarColor,
      is_system: false,
      is_enabled: true,
    })
    .select()
    .single()
  if (calErr || !cal) throw calErr ?? new Error("Failed to create calendar")

  // 2. Create import row
  const { data: imp, error: impErr } = await sb
    .from("imports")
    .insert({
      calendar_id: cal.id,
      filename: input.filename,
      status: "pending",
      column_mapping: input.mapping,
      row_count: input.rows.length,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (impErr || !imp) throw impErr ?? new Error("Failed to create import")

  // 3. Normalize rows into events.
  const events: Array<Record<string, unknown>> = []
  let errorCount = 0
  for (const row of input.rows) {
    const get = (field: CsvTargetField): string =>
      (input.mapping[field] ? row[input.mapping[field]!] : "")?.toString().trim() ?? ""

    const title = get("title")
    const startRaw = get("start_at")
    const endRaw = get("end_at")
    if (!title || !startRaw) {
      errorCount++
      continue
    }
    const start = toISOSafe(startRaw)
    const end = endRaw ? toISOSafe(endRaw) : null
    if (!start) {
      errorCount++
      continue
    }
    const allDay = parseBool(get("all_day"))
    const finalEnd =
      end ?? (allDay ? new Date(new Date(start).getTime() + 24 * 3600 * 1000).toISOString() : new Date(new Date(start).getTime() + 3600 * 1000).toISOString())

    events.push({
      calendar_id: cal.id,
      title,
      start_at: start,
      end_at: finalEnd,
      all_day: allDay,
      location: get("location") || null,
      description: get("description") || null,
      priority: normalizePriority(get("priority")),
      movable: get("movable").toLowerCase() === "locked" ? "locked" : "movable",
      category: get("category") || null,
      timezone: get("timezone") || "Europe/Paris",
      is_system: false,
    })
  }

  if (events.length > 0) {
    // Insert in chunks of 500 to stay below typical PG payload limits.
    for (let i = 0; i < events.length; i += 500) {
      const chunk = events.slice(i, i + 500)
      const { error: evErr } = await sb.from("events").insert(chunk)
      if (evErr) throw evErr
    }
  }

  // 4. Mark import committed
  await sb
    .from("imports")
    .update({
      status: events.length > 0 ? "committed" : "failed",
      row_count: input.rows.length,
      error_count: errorCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", imp.id)

  // 5. Re-run conflict detection across the next 12 months.
  const conflictsDetected = await rebuildConflicts()

  revalidatePath("/app")
  revalidatePath("/app/calendar")
  revalidatePath("/app/conflicts")
  revalidatePath("/app/imports")

  return {
    calendarId: cal.id,
    importId: imp.id,
    eventCount: events.length,
    errorCount,
    conflictsDetected,
  }
}

export async function deleteCalendar(calendarId: string): Promise<void> {
  const sb = createServerClient()
  const { data: cal } = await sb.from("calendars").select("is_system").eq("id", calendarId).maybeSingle()
  if (cal?.is_system) throw new Error("Impossible de supprimer un calendrier système.")
  const { error } = await sb.from("calendars").delete().eq("id", calendarId)
  if (error) throw error
  await rebuildConflicts()
  revalidatePath("/app")
  revalidatePath("/app/calendar")
  revalidatePath("/app/conflicts")
  revalidatePath("/app/imports")
}

export async function toggleCalendar(calendarId: string, enabled: boolean): Promise<void> {
  const sb = createServerClient()
  const { error } = await sb.from("calendars").update({ is_enabled: enabled }).eq("id", calendarId)
  if (error) throw error
  revalidatePath("/app/calendar")
}

// Recompute open conflicts from scratch over the relevant horizon.
export async function rebuildConflicts(): Promise<number> {
  const sb = createServerClient()
  const settings = await getSettings()

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
  const end = new Date(now.getFullYear() + 1, now.getMonth() + 2, 1).toISOString()

  const events = await listEventsBetween(start, end)
  // Filter out events from disabled calendars.
  const { data: cals } = await sb.from("calendars").select("id, is_enabled")
  const enabled = new Set((cals ?? []).filter((c) => c.is_enabled).map((c) => c.id))
  const visible = events.filter((e) => enabled.has(e.calendar_id))

  const detected = detectConflicts(visible, {
    holidayMode: settings.holiday_mode,
    workingHours: settings.working_hours,
    defaultBufferMinutes: settings.default_buffer_minutes,
  })

  // Clear existing open conflicts; keep resolved/ignored history.
  await sb.from("conflicts").delete().eq("status", "open")

  if (detected.length > 0) {
    const rows = detected.map((d) => ({
      event_ids: d.event_ids,
      type: d.type,
      severity: d.severity,
      status: "open",
      explanation: d.reason,
      score_impact: d.score_impact,
    }))
    const { error } = await sb.from("conflicts").insert(rows)
    if (error) throw error
  }

  return detected.length
}

function toISOSafe(raw: string): string | null {
  if (!raw) return null
  // Reuse the loose parser logic inline to avoid importing client helpers here.
  const direct = new Date(raw)
  if (!Number.isNaN(direct.getTime())) return direct.toISOString()
  const fr = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (fr) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = fr
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`
    const dt = new Date(iso)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString()
  }
  return null
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  return ["true", "1", "yes", "y", "oui", "vrai"].includes(v)
}

function normalizePriority(raw: string): "low" | "medium" | "high" | "critical" {
  const v = raw.trim().toLowerCase()
  if (["critical", "critique", "top"].includes(v)) return "critical"
  if (["high", "haute", "élevée", "elevee"].includes(v)) return "high"
  if (["low", "basse", "faible"].includes(v)) return "low"
  return "medium"
}
