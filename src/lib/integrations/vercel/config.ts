import type { Product, Project } from "@/lib/domain";

/**
 * Vercel integration configuration.
 *
 * Vercel is an integration source — NOT the source of truth. It only feeds the
 * activity feed, signals, and health/focus (deployment readiness). Projects,
 * milestones, roadmaps, decisions, and focus remain owned by Product Studio.
 *
 * The question Vercel helps answer: "Can my products actually be used right
 * now?" — deployment health, not a deployment dashboard.
 */

/** Resolve a project through its product's non-secret Vercel settings. */
export function vercelConnectionForProject(project: Project, products: Product[]) {
  const settings = products.find((product) => product.id === project.productId)?.integrations;
  return {
    projects: settings?.vercelProject ? [settings.vercelProject] : [],
    teamSlug: settings?.vercelTeamSlug,
  };
}

export type VercelMode = "live" | "off";

/**
 * Resolve the Vercel mode:
 *  - `VERCEL_MODE` env wins if set (live | off)
 *  - else `live` when a `VERCEL_ACCESS_TOKEN` is present
 *  - else `off` so no deployment data is invented before the integration is connected
 */
export function vercelMode(): VercelMode {
  const explicit = process.env.VERCEL_MODE as VercelMode | undefined;
  if (explicit === "live" || explicit === "off") return explicit;
  return process.env.VERCEL_ACCESS_TOKEN ? "live" : "off";
}

export function vercelToken(): string | undefined {
  return process.env.VERCEL_ACCESS_TOKEN;
}

/** Optional Vercel team/account id for the REST API (`?teamId=`). */
export function vercelTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID;
}

/** Vercel projects connected to a Product Studio project (empty if none mapped). */
// Thresholds for Vercel-derived signals (deterministic).
export const VERCEL_THRESHOLDS = {
  repeatedFailures: 3, // critical: N consecutive failed deployments
  noSuccessDays: 14, // watch: no successful (ready) deployment in N days
  queueBacklogMinutes: 30, // watch: a deployment queued/building longer than N minutes
} as const;
