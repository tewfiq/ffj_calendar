"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { getEventsByIds } from "@/lib/queries"
import { explainConflictFr } from "@/lib/openrouter"
import { rebuildConflicts } from "@/app/actions/imports"
import type { ConflictStatus } from "@/lib/types"

export async function runConflictDetection(): Promise<number> {
  const count = await rebuildConflicts()
  revalidatePath("/app/conflicts")
  revalidatePath("/app")
  return count
}

export async function updateConflictStatus(id: string, status: ConflictStatus): Promise<void> {
  const sb = createServerClient()
  const { error } = await sb.from("conflicts").update({ status }).eq("id", id)
  if (error) throw error
  revalidatePath("/app/conflicts")
  revalidatePath("/app")
}

export async function explainConflict(conflictId: string): Promise<string> {
  const sb = createServerClient()
  const { data: conflict, error } = await sb.from("conflicts").select("*").eq("id", conflictId).maybeSingle()
  if (error) throw error
  if (!conflict) throw new Error("Conflit introuvable.")

  const events = await getEventsByIds(conflict.event_ids as string[])
  const { data: cals } = await sb
    .from("calendars")
    .select("id, name")
    .in("id", events.map((e) => e.calendar_id))
  const calMap = new Map((cals ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))

  const explanation = await explainConflictFr({
    type: conflict.type,
    summary: conflict.explanation ?? "",
    events: events.map((e) => ({
      title: e.title,
      start_at: e.start_at,
      end_at: e.end_at,
      calendar: calMap.get(e.calendar_id) ?? "—",
    })),
  })

  await sb.from("conflicts").update({ explanation }).eq("id", conflictId)
  revalidatePath("/app/conflicts")
  return explanation
}
