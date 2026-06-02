import type { MilestoneId, ProjectId } from "./ids";

export type MilestonePriority = "High" | "Medium" | "Low";

export type MilestoneStatus = "active" | "planned" | "shipped";

/**
 * A Milestone is a project's meaningful deliverable ("Family Sharing MVP").
 * Owned by exactly one project. Tasks belong to a milestone; the Studio's
 * "Current Focus" is a project's active milestone plus its tasks.
 */
export interface Milestone {
  id: MilestoneId;
  projectId: ProjectId;
  title: string;
  summary: string;
  priority: MilestonePriority;
  /** 0–100; will be derived from task completion in a later phase */
  progress: number;
  status: MilestoneStatus;
}
