import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for the data layer.
 *
 * Returns `null` when Supabase env vars are absent, so the repository can fall
 * back to local mock fixtures (e.g. in this dev environment, CI, or before the
 * database is provisioned). This module is imported only by the server-side
 * data layer — the keys are never exposed to the client.
 *
 * Single-user / no auth: a plain anon client with sessions disabled is enough
 * (RLS is intentionally off for now per the Phase 2.3 schema).
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    cached = null;
    return null;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
