import type { Activity } from "@/lib/domain";
import type { GeneratedSignal } from "@/lib/signals/engine";

/**
 * Normalized Supabase usage metadata (metadata only — no table contents, no user
 * data, no passwords, no secrets, no customer information). Produced by the live
 * client or the mock provider.
 */
export type SupabaseProjectState = "healthy" | "degraded" | "unavailable" | "unknown";

/** A single usage dimension. `usage` is a human label; `percent` drives signals. */
export interface UsageMetric {
  usage: string; // e.g. "4.2 GB"
  percent: number; // 0–100 of the plan limit
  growthRatePct?: number; // recent growth, for activity/awareness
}

/** Per-Supabase-project metrics snapshot. */
export interface SupabaseSnapshot {
  supabaseProject: string;
  connected: boolean;
  state: SupabaseProjectState;
  database?: UsageMetric;
  storage?: UsageMetric;
  bandwidth?: UsageMetric;
  authUsers?: number;
  authGrowthPct?: number;
  /** Set when the project couldn't be reached (live mode). */
  error?: string;
}

/** Lightweight operational health shown on the Studio cards (3 levels). */
export type SupabaseHealth = "Healthy" | "Warning" | "Critical";

/** Lightweight per-project Supabase status shown on the Studio cards + Focus. */
export interface SupabaseProjectStatus {
  projectId: string;
  connected: boolean;
  supabaseProjects: string[];
  state: SupabaseProjectState;
  database?: UsageMetric;
  storage?: UsageMetric;
  bandwidth?: UsageMetric;
  authUsers?: number;
  authGrowthPct?: number;
  health: SupabaseHealth;
  /** Short worst-issue phrase for the Focus reason/recommendation (e.g. "storage at 88%"). */
  headline?: string;
  /** "Healthy" | "Storage high" | "Unavailable" | "Not connected" */
  label: string;
}

/** What the Supabase provider returns to the data pipeline. */
export interface SupabaseResult {
  mode: "live" | "mock" | "off";
  /** Supabase-sourced activity merged into the feed (integration = "supabase"). */
  events: Activity[];
  /** Supabase-derived operational signals merged into the Signals Engine output. */
  signals: GeneratedSignal[];
  /** Per-project status for the Studio cards + health Risk + Focus. */
  statuses: Record<string, SupabaseProjectStatus>;
}
