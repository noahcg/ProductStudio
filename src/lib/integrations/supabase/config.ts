/**
 * Supabase monitoring configuration.
 *
 * Supabase is an integration source — NOT the source of truth. It only feeds the
 * activity feed, signals, and health/focus (operational readiness). Projects,
 * milestones, roadmaps, decisions, and focus remain owned by Product Studio.
 *
 * The question Supabase helps answer: "Can my products continue operating safely
 * and reliably?" — platform health, not a database administration tool.
 *
 * NOTE: this is the *monitoring* integration (Management API metrics). It is
 * unrelated to `src/lib/data/supabase-source.ts`, which is the Product Studio
 * data store seam.
 */

/** Project (slug) → connected Supabase project(s). One today; many supported. */
export const SUPABASE_PROJECT_MAP: Record<string, string[]> = {
  "home-cooked": ["home-cooked-db"],
  "wardrobe-harmony": ["wardrobe-harmony-db"],
  "personal-trainer": ["personal-trainer-db"],
  "cascade-lounge": ["cascade-lounge-db"],
};

export type SupabaseMode = "live" | "mock" | "off";

/**
 * Resolve the Supabase monitoring mode:
 *  - `SUPABASE_MONITOR_MODE` env wins if set (live | mock | off)
 *  - else `live` when a `SUPABASE_ACCESS_TOKEN` is present
 *  - else `mock` (deterministic dev/demo data so the integration is usable
 *    without a token; never real data)
 */
export function supabaseMode(): SupabaseMode {
  const explicit = process.env.SUPABASE_MONITOR_MODE as SupabaseMode | undefined;
  if (explicit === "live" || explicit === "mock" || explicit === "off") return explicit;
  return process.env.SUPABASE_ACCESS_TOKEN ? "live" : "mock";
}

export function supabaseToken(): string | undefined {
  return process.env.SUPABASE_ACCESS_TOKEN;
}

/** Supabase projects connected to a Product Studio project (empty if none mapped). */
export function supabaseProjectsForProject(projectId: string): string[] {
  return SUPABASE_PROJECT_MAP[projectId] ?? [];
}

/**
 * Usage thresholds (percent) for Supabase-derived signals (deterministic).
 * Bandwidth runs hotter before alerting (it resets monthly).
 */
export const SUPABASE_THRESHOLDS = {
  database: { watch: 70, warning: 85, critical: 95 },
  storage: { watch: 70, warning: 85, critical: 95 },
  bandwidth: { watch: 75, warning: 90, critical: 98 },
} as const;
