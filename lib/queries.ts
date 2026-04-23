import "server-only"
import { createServerClient } from "@/lib/supabase/server"
import type { Calendar, Conflict, Event, Import, UserSettings } from "./types"

export async function getSettings(): Promise<UserSettings> {
  const sb = createServerClient()
  const { data, error } = await sb.from("user_settings").select("*").limit(1).maybeSingle()
  if (error) throw error
  if (!data) throw new Error("No user_settings row found. Run the seed migration.")
  return data as UserSettings
}

export async function listCalendars(): Promise<Calendar[]> {
  const sb = createServerClient()
  const { data, error } = await sb.from("calendars").select("*").order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as Calendar[]
}

export async function listEventsBetween(startIso: string, endIso: string): Promise<Event[]> {
  const sb = createServerClient()
  // Overlap filter: event.start < range.end AND event.end > range.start
  const { data, error } = await sb
    .from("events")
    .select("*")
    .lt("start_at", endIso)
    .gt("end_at", startIso)
    .order("start_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as Event[]
}

export async function listEventsByCalendar(calendarId: string): Promise<Event[]> {
  const sb = createServerClient()
  const { data, error } = await sb
    .from("events")
    .select("*")
    .eq("calendar_id", calendarId)
    .order("start_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as Event[]
}

export async function listImports(): Promise<(Import & { calendar_name: string | null })[]> {
  const sb = createServerClient()
  const { data, error } = await sb
    .from("imports")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as Import[]
  const ids = Array.from(new Set(rows.map((i) => i.calendar_id)))
  const calMap = new Map<string, string>()
  if (ids.length > 0) {
    const { data: cals } = await sb.from("calendars").select("id, name").in("id", ids)
    for (const c of (cals ?? []) as { id: string; name: string }[]) calMap.set(c.id, c.name)
  }
  return rows.map((i) => ({ ...i, calendar_name: calMap.get(i.calendar_id) ?? null }))
}

export async function getImport(id: string): Promise<(Import & { calendar_name: string | null }) | null> {
  const sb = createServerClient()
  const { data, error } = await sb.from("imports").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as Import
  const { data: cal } = await sb.from("calendars").select("name").eq("id", row.calendar_id).maybeSingle()
  return { ...row, calendar_name: (cal as { name: string } | null)?.name ?? null }
}

export async function listOpenConflicts(): Promise<Conflict[]> {
  const sb = createServerClient()
  const { data, error } = await sb
    .from("conflicts")
    .select("*")
    .in("status", ["open"])
    .order("detected_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Conflict[]
}

export async function listAllConflicts(): Promise<Conflict[]> {
  const sb = createServerClient()
  const { data, error } = await sb
    .from("conflicts")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as Conflict[]
}

export async function getEventsByIds(ids: string[]): Promise<Event[]> {
  if (ids.length === 0) return []
  const sb = createServerClient()
  const { data, error } = await sb.from("events").select("*").in("id", ids)
  if (error) throw error
  return (data ?? []) as Event[]
}

export async function getCalendar(id: string): Promise<Calendar | null> {
  const sb = createServerClient()
  const { data, error } = await sb.from("calendars").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return (data as Calendar) ?? null
}
