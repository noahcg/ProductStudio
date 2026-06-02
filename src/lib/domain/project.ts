import type { ProjectId } from "./ids";

export type ProjectStatus = "Active" | "Planning" | "Content" | "Paused" | "Shipped";

export type ProjectAccent = "amber" | "violet" | "blue" | "orange" | "green" | "teal";

export type ProjectIcon = "chef" | "shirt" | "dumbbell" | "sofa";

/**
 * A Project is the aggregate root of the Product Studio domain. It OWNS its
 * milestones, tasks, roadmap items, decisions, activity, expenses, domains,
 * and signals — each of those references this project by `id`.
 *
 * A few fields here (`nextMilestone`, `openTasks`, `blockers`,
 * `lastActivityIso`, `domain`) are denormalized snapshots that the UI reads
 * directly today. Their authoritative sources are the owned child entities
 * (Milestone, Task, Activity, Domain); a later phase computes them rather than
 * storing them. They are kept for now so the existing UI is unchanged.
 */
export interface Project {
  id: ProjectId;
  name: string;
  tagline: string;
  status: ProjectStatus;
  /** progress toward the active milestone, 0–100 (denormalized) */
  progress: number;
  /** title of the active milestone (denormalized from Milestone) */
  nextMilestone: string;
  /** count of open tasks (denormalized from Task) */
  openTasks: number;
  /** count of blocking tasks (denormalized from Task) */
  blockers: number;
  /** timestamp of latest activity (denormalized from Activity) */
  lastActivityIso: string;
  accent: ProjectAccent;
  icon: ProjectIcon;
  /** GitHub repo slug — a reference into the GitHub integration (not ownership) */
  repo?: string;
  /** primary domain name (denormalized from the owned Domain entity) */
  domain?: string;
}
