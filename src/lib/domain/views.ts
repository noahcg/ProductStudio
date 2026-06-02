/**
 * Derived / view / studio-support types.
 *
 * These are NOT owned domain entities — they are compositions and aggregates
 * the UI renders, derived from the entities in this folder.
 */
import type { ProjectId, AlertId } from "./ids";
import type { MilestonePriority } from "./milestone";
import type { Task } from "./task";

/**
 * Composed view: a project's active milestone plus its tasks. Not stored —
 * derived from a Milestone and its Tasks. Drives the "Current Focus" panel and
 * the Focus screen.
 */
export interface Focus {
  projectId: ProjectId;
  title: string;
  priority: MilestonePriority;
  summary: string;
  progress: number;
  tasks: Task[];
}

export type AlertKind = "stale" | "domain" | "blocker" | "budget";

/**
 * A "needs attention" item. Conceptually derived from signals / domains /
 * staleness; modeled as data for now to back the Needs Attention surface.
 */
export interface Alert {
  id: AlertId;
  projectId?: ProjectId;
  kind: AlertKind;
  title: string;
  detail: string;
  meta?: string;
  /** structured numeric metric (e.g. days until renewal) for logic */
  metricDays?: number;
  cta: string;
}

/** Money aggregates. */
export interface SpendCategory {
  label: string;
  amount: number;
  color: string;
}

export interface Spend {
  categories: SpendCategory[];
  total: number;
}

export interface SpendTrendPoint {
  month: string;
  amount: number;
}

/**
 * The single studio owner's display info. NOT an account/auth/user model —
 * Product Studio is single-user; this is just the owner's name and badge count
 * for the header and greeting.
 */
export interface Profile {
  name: string;
  fullName: string;
  unreadNotifications: number;
}

/** Headline counters on the Studio stat row. */
export interface StudioStats {
  projects: number;
  active: number;
  needsAttention: number;
  monthlySpend: number;
}

/** "You shipped N updates across M products this week." */
export interface WeeklySummary {
  updates: number;
  products: number;
}
