import type { Task, TaskStatus, TaskPriority } from "../domain";

/**
 * Mutable in-memory task store (mock mode). Realistic, milestone-related tasks
 * for each project — no generic placeholders. The write functions in
 * `mock-source.ts` mutate this array so task CRUD works without a database.
 *
 * Completed tasks carry a spread of `completedAt` dates (relative to the studio
 * clock, 2026-06-07) so the Weekly Founder Review can derive realistic
 * "this week" deltas: a few projects advanced this week, others were quiet.
 */
type Seed = [title: string, status: TaskStatus, priority: TaskPriority, completedAt?: string];

function build(projectId: string, milestoneId: string, seeds: Seed[]): Task[] {
  return seeds.map(([title, status, priority, completedAt], i) => ({
    id: `${milestoneId}-t${i + 1}`,
    projectId,
    milestoneId,
    title,
    status,
    priority,
    completedAt: status === "completed" ? completedAt ?? "2026-05-20T12:00:00" : undefined,
    targetDate: undefined,
  }));
}

// Home Cooked — Family Sharing MVP (≈83%: 10 done [3 this week], 1 blocked, 1 in progress)
const homeCooked = build("home-cooked", "m-home-cooked", [
  ["Design sharing permission model", "completed", "high", "2026-05-12T12:00:00"],
  ["Sharing data model & migrations", "completed", "high", "2026-05-14T12:00:00"],
  ["Build invite workflow", "completed", "high", "2026-05-16T12:00:00"],
  ["Invite acceptance flow", "completed", "medium", "2026-05-19T12:00:00"],
  ["Generate & store share links", "completed", "medium", "2026-05-22T12:00:00"],
  ["Shared cookbook read access", "completed", "high", "2026-05-26T12:00:00"],
  ["Permission roles (owner / editor / viewer)", "completed", "high", "2026-05-28T12:00:00"],
  ["Sharing settings UI", "completed", "medium", "2026-06-02T12:00:00"],
  ["Activity feed for shared edits", "completed", "low", "2026-06-04T12:00:00"],
  ["Revoke & expire share links", "completed", "medium", "2026-06-06T12:00:00"],
  ["Email acceptance flow", "blocked", "high"],
  ["Permission edge-case tests", "in_progress", "medium"],
]);

// WardrobeHarmony — Closet Import (≈50%: 5 done [0 this week — declining], 1 blocked, 1 in progress, 3 todo)
const wardrobe = build("wardrobe-harmony", "m-wardrobe-harmony", [
  ["CSV import parser", "completed", "high", "2026-05-12T12:00:00"],
  ["Photo upload pipeline", "completed", "high", "2026-05-15T12:00:00"],
  ["Color extraction from photos", "completed", "high", "2026-05-18T12:00:00"],
  ["Map items to wardrobe schema", "completed", "medium", "2026-05-21T12:00:00"],
  ["Dedupe imported items", "completed", "medium", "2026-05-24T12:00:00"],
  ["Colorblind-safe palette tagging", "in_progress", "high"],
  ["Handle unsupported file formats", "blocked", "medium"],
  ["Bulk-edit imported items", "todo", "medium"],
  ["Import progress UI", "todo", "medium"],
  ["Import error reporting", "todo", "low"],
]);

// PersonalTrainer — Client Scheduling (planning; ≈25%: 2 done [0 this week — stale], 1 in progress, 5 todo)
const trainer = build("personal-trainer", "m-personal-trainer", [
  ["Define scheduling data model", "completed", "high", "2026-05-14T12:00:00"],
  ["Trainer availability calendar", "completed", "high", "2026-05-16T12:00:00"],
  ["Client booking flow", "in_progress", "high"],
  ["Recurring sessions", "todo", "medium"],
  ["Timezone handling", "todo", "medium"],
  ["Cancellation & reschedule rules", "todo", "medium"],
  ["Session reminders & notifications", "todo", "low"],
  ["Calendar sync research", "todo", "low"],
]);

// Cascade Lounge — Spring Content Drop (content; ≈37%: 3 done [1 this week], 1 in progress, 4 todo)
const cascade = build("cascade-lounge", "m-cascade-lounge", [
  ["Plan spring content calendar", "completed", "medium", "2026-05-20T12:00:00"],
  ["Shoot lifestyle photography", "completed", "high", "2026-05-27T12:00:00"],
  ["Draft six feature articles", "completed", "medium", "2026-06-03T12:00:00"],
  ["Edit & proof articles", "in_progress", "medium"],
  ["Source product partnerships", "todo", "medium"],
  ["Design landing-page modules", "todo", "medium"],
  ["Schedule social teasers", "todo", "low"],
  ["Newsletter announcement", "todo", "low"],
]);

export const tasks: Task[] = [...homeCooked, ...wardrobe, ...trainer, ...cascade];
