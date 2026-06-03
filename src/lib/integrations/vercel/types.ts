import type { Activity } from "@/lib/domain";
import type { GeneratedSignal } from "@/lib/signals/engine";

/**
 * Normalized Vercel deployment metadata (metadata only — no source code, no
 * build logs, no environment variable values, no secrets). Produced by the live
 * client or the mock provider.
 */
export type DeploymentState = "ready" | "building" | "queued" | "canceled" | "failed" | "unknown";

export type DeploymentEnvironment = "production" | "preview";

/** A single deployment's metadata. */
export interface DeploymentMeta {
  state: DeploymentState;
  environment: DeploymentEnvironment;
  createdIso: string;
  /** Build/deploy duration in seconds, when known. */
  durationSeconds?: number;
  /** Public deployment URL (no secrets). */
  url?: string;
}

/** Per-Vercel-project deployment snapshot (newest deployment first in `recent`). */
export interface DeploymentSnapshot {
  vercelProject: string;
  connected: boolean;
  /** Latest deployment's state (the "current" deployment). */
  state: DeploymentState;
  /** Recent deployments, newest first (bounded — awareness, not history). */
  recent: DeploymentMeta[];
  /** Set when the project couldn't be reached (live mode). */
  error?: string;
}

/** Lightweight deployment health shown on the Studio cards (3 levels). */
export type DeploymentHealth = "Healthy" | "Warning" | "Critical";

/** Lightweight per-project Vercel status shown on the Studio cards + Focus. */
export interface VercelProjectStatus {
  projectId: string;
  connected: boolean;
  vercelProjects: string[];
  /** Aggregate latest deployment state across the project's Vercel projects. */
  state: DeploymentState;
  /** Most recent deployment timestamp (any outcome). */
  lastDeployIso?: string;
  /** Most recent successful (ready) deployment. */
  lastReadyIso?: string;
  /** Most recent failed deployment. */
  lastFailedIso?: string;
  /** Consecutive failures at the head of the recent timeline. */
  consecutiveFailures: number;
  /** Latest production deployment URL, when known. */
  url?: string;
  health: DeploymentHealth;
  /** "Production ready" | "Deploy failed" | "No recent deploys" | "Not connected" */
  label: string;
}

/** What the Vercel provider returns to the data pipeline. */
export interface VercelResult {
  mode: "live" | "mock" | "off";
  /** Vercel-sourced activity merged into the feed (integration = "vercel"). */
  events: Activity[];
  /** Vercel-derived operational signals merged into the Signals Engine output. */
  signals: GeneratedSignal[];
  /** Per-project status for the Studio cards + health momentum/execution/risk. */
  statuses: Record<string, VercelProjectStatus>;
}
