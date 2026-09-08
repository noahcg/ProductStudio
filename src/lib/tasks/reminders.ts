import type { Task } from "../domain";
import { dateKey } from "./schedule";

export function taskReminder(task: Task, now: Date) {
  if (!task.scheduledDate || task.status === "completed") return null;
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12));
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const overdue = task.scheduledDate < today || (task.scheduledDate === today && Boolean(task.scheduledTime && task.scheduledTime < clock));
  const kind = overdue ? "Overdue" : task.scheduledDate === today ? "Today" : task.scheduledDate === tomorrow ? "Tomorrow" : "Upcoming";
  const date = new Date(`${task.scheduledDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(task.scheduledDate.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" as const } : {}) });
  return { kind, label: `${kind} · ${date} · ${task.scheduledTime ?? "All day"}`, rank: overdue ? 0 : kind === "Today" ? 1 : 2 };
}

export function openTasksByReminder(tasks: Task[], now: Date): Task[] {
  return tasks.filter((task) => task.status !== "completed").sort((a, b) => {
    const rank = (taskReminder(a, now)?.rank ?? 3) - (taskReminder(b, now)?.rank ?? 3);
    return rank || (a.scheduledDate ?? "9999").localeCompare(b.scheduledDate ?? "9999") ||
      (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "") || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  });
}
