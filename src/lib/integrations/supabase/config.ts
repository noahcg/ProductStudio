import type { Product, Project } from "@/lib/domain";

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

/** Resolve a project through its product's non-secret Supabase settings. */
export function supabaseConnectionForProject(project: Project, products: Product[]) {
  const ref = products.find((product) => product.id === project.productId)?.integrations.supabaseProjectRef;
  return ref ? [ref] : [];
}

export type SupabaseMode = "live" | "off";

/**
 * Resolve the Supabase monitoring mode:
 *  - `SUPABASE_MONITOR_MODE` env wins if set (live | off)
 *  - else `live` when a `SUPABASE_ACCESS_TOKEN` is present
 *  - else `off` so no operational data is invented before the integration is connected
 */
export function supabaseMode(): SupabaseMode {
  const explicit = process.env.SUPABASE_MONITOR_MODE as SupabaseMode | undefined;
  if (explicit === "live" || explicit === "off") return explicit;
  return process.env.SUPABASE_ACCESS_TOKEN ? "live" : "off";
}

export function supabaseToken(): string | undefined {
  return process.env.SUPABASE_ACCESS_TOKEN;
}

/** Supabase projects connected to a Product Studio project (empty if none mapped). */
/**
 * Usage thresholds (percent) for Supabase-derived signals (deterministic).
 * Bandwidth runs hotter before alerting (it resets monthly).
 */
export const SUPABASE_THRESHOLDS = {
  database: { watch: 70, warning: 85, critical: 95 },
  storage: { watch: 70, warning: 85, critical: 95 },
  bandwidth: { watch: 75, warning: 90, critical: 98 },
} as const;
