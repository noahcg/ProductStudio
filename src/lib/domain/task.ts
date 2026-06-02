import type { TaskId, ProjectId, MilestoneId } from "./ids";

export type TaskState = "todo" | "active" | "done";

/**
 * A unit of work owned by a project, usually scoped to a milestone.
 * (Replaces the embedded `FocusTask` from Phase 2.1 — tasks are now a
 * first-class, project-owned entity.)
 */
export interface Task {
  id: TaskId;
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  label: string;
  state: TaskState;
  estimate?: string;
}
