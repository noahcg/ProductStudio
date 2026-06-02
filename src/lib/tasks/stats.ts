import type { Task } from "../domain";
import { now as studioNow } from "../clock";

/**
 * Live task rollup for a milestone (or any task set). The single source of
 * truth for "how much of this milestone is done" — used by the Focus Engine
 * and the milestone Tasks UI, so completing a task updates both.
 */
export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  todo: number;
  /** not completed (todo + in_progress + blocked) */
  remaining: number;
  /** not completed and past target_date */
  overdue: number;
  /** completed / total, 0–100 (0 when there are no tasks) */
  progress: number;
}

export function taskStats(tasks: Task[], now: Date = studioNow()): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.targetDate && new Date(t.targetDate) < now
  ).length;
  return {
    total,
    completed,
    inProgress,
    blocked,
    todo,
    remaining: total - completed,
    overdue,
    progress: total ? Math.round((completed / total) * 100) : 0,
  };
}
