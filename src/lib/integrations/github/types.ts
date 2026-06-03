import type { Activity } from "@/lib/domain";
import type { GeneratedSignal } from "@/lib/signals/engine";

/**
 * Normalized GitHub data per repository (metadata only — no source code, no
 * commit contents). Produced by the live client or the mock provider.
 */
export interface RepoSnapshot {
  repo: string; // "owner/name"
  connected: boolean;
  lastActivityIso?: string;
  commitsThisWeek: number;
  /** open pull requests (metadata only) */
  openPullRequests: { number: number; title: string; openedIso: string }[];
  /** recent events to surface in the activity feed */
  events: { kind: "commit" | "pr"; title: string; whenIso: string; ok?: boolean }[];
  /** set when the repo couldn't be reached (live mode) */
  error?: string;
}

/** Lightweight per-project GitHub status shown on the Studio cards. */
export interface GitHubProjectStatus {
  projectId: string;
  connected: boolean;
  repos: string[];
  lastActivityIso?: string;
  commitsThisWeek: number;
  openPRs: number;
  oldestOpenPrDays?: number;
  /** "Active this week" | "3 Open PRs" | "No activity" | "Not connected" */
  label: string;
}

/** What the GitHub provider returns to the data pipeline. */
export interface GitHubResult {
  mode: "live" | "mock" | "off";
  /** GitHub-sourced activity merged into the feed (integration = "github"). */
  events: Activity[];
  /** GitHub-derived operational signals merged into the Signals Engine output. */
  signals: GeneratedSignal[];
  /** Per-project status for the Studio cards + health momentum/execution. */
  statuses: Record<string, GitHubProjectStatus>;
}
