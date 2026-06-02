import type { TaskId, ProjectId, MilestoneId } from "./ids";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "completed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

/**
 * A unit of execution work. Tasks exist to help Product Studio understand
 * progress toward milestones — they always belong to a project and usually to a
 * milestone. (Not a generic task manager: no subtasks, comments, assignees.)
 */
export interface Task {
  id: TaskId;
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  targetDate?: string;
  completedAt?: string;
}

/** Fields accepted when creating/editing a task. */
export interface TaskInput {
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  targetDate?: string;
}
