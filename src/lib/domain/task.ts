import type { TaskId, ProjectId, MilestoneId } from "./ids";

export type TaskStatus = "todo" | "in_progress" | "completed";

export interface TaskSource {
  label: string;
  type?: "manual" | "meeting" | "automation" | "import";
  url?: string;
  externalId?: string;
  capturedAt?: string;
}

/**
 * A lightweight project-linked to-do. Product Studio is the system of record;
 * integrations only add source metadata so a task can trace back to a meeting,
 * note, or automation without being owned by that outside tool.
 */
export interface Task {
  id: TaskId;
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  source?: TaskSource;
}

/** Fields accepted when creating/editing a task. */
export interface TaskInput {
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  title: string;
  description?: string;
  status: TaskStatus;
  source?: TaskSource;
}
