import type { Task } from "../domain";

/**
 * Live task rollup for a milestone (or any task set). The single source of
 * truth for "how much of this milestone is done" — used by the Focus Engine
 * and the milestone Tasks UI, so completing a task updates both.
 */
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  /** not completed (todo + in_progress) */
  remaining: number;
  /** completed / total, 0–100 (0 when there are no tasks) */
  progress: number;
}

export function taskStats(tasks: Task[]): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  return {
    total,
    completed,
    inProgress,
    todo,
    remaining: total - completed,
    progress: total ? Math.round((completed / total) * 100) : 0,
  };
}
