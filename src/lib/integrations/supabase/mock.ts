import type { SupabaseSnapshot } from "./types";

/**
 * Deterministic mock Supabase data — a dev/demo stand-in for the live Management
 * API so the integration is usable without a token. NOT real data, and never the
 * source of truth (it only feeds activity/signals/health like the live client).
 *
 * Crafted to exercise the signal tiers + states:
 *  - home-cooked-db     : storage 88% (warning) + bandwidth 76% (watch) → Warning
 *  - wardrobe-harmony-db: project unavailable                          → Critical
 *  - personal-trainer-db: database 96% (critical)                      → Critical
 *  - cascade-lounge-db  : everything low, healthy                      → Healthy
 *
 * Percentages are of the plan limit; usage strings are illustrative only.
 */
const MOCK: Record<string, SupabaseSnapshot> = {
  "home-cooked-db": {
    supabaseProject: "home-cooked-db",
    connected: true,
    state: "healthy",
    database: { usage: "0.41 GB", percent: 65, growthRatePct: 6 },
    storage: { usage: "4.4 GB", percent: 88, growthRatePct: 9 },
    bandwidth: { usage: "190 GB", percent: 76 },
    authUsers: 1240,
    authGrowthPct: 8,
  },
  "wardrobe-harmony-db": {
    supabaseProject: "wardrobe-harmony-db",
    connected: true,
    state: "unavailable",
  },
  "personal-trainer-db": {
    supabaseProject: "personal-trainer-db",
    connected: true,
    state: "healthy",
    database: { usage: "0.48 GB", percent: 96, growthRatePct: 14 },
    storage: { usage: "2.7 GB", percent: 54, growthRatePct: 4 },
    bandwidth: { usage: "120 GB", percent: 48 },
    authUsers: 310,
    authGrowthPct: 5,
  },
  "cascade-lounge-db": {
    supabaseProject: "cascade-lounge-db",
    connected: true,
    state: "healthy",
    database: { usage: "0.19 GB", percent: 38, growthRatePct: 2 },
    storage: { usage: "2.1 GB", percent: 41, growthRatePct: 3 },
    bandwidth: { usage: "82 GB", percent: 33 },
    authUsers: 92,
    authGrowthPct: 3,
  },
};

export function mockSupabaseSnapshot(supabaseProject: string): SupabaseSnapshot {
  return (
    MOCK[supabaseProject] ?? {
      supabaseProject,
      connected: true,
      state: "unknown",
    }
  );
}
