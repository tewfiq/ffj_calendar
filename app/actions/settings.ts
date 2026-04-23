"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase/server"
import { rebuildConflicts } from "@/app/actions/imports"
import type { HolidayMode, SchoolZone } from "@/lib/types"

export async function updateSettings(input: {
  school_zone: SchoolZone
  holiday_mode: HolidayMode
  default_buffer_minutes: number
}): Promise<void> {
  const sb = createServerClient()
  const { data: existing } = await sb.from("user_settings").select("id").limit(1).maybeSingle()
  if (!existing) {
    throw new Error("No user_settings row.")
  }
  const { error } = await sb
    .from("user_settings")
    .update({
      school_zone: input.school_zone,
      holiday_mode: input.holiday_mode,
      default_buffer_minutes: input.default_buffer_minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
  if (error) throw error
  await rebuildConflicts()
  revalidatePath("/app")
  revalidatePath("/app/calendar")
  revalidatePath("/app/conflicts")
  revalidatePath("/app/settings")
}
