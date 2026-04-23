import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Server-side Supabase client for Constellation Lite (single-user V1, no RLS).
// Uses the service role key so server actions can read/write freely.
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are not configured. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).",
    )
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  })
}
