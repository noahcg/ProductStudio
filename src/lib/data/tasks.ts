import type { Task, TaskStatus, TaskPriority } from "../domain";

/**
 * Mutable in-memory task store (mock mode). Realistic, milestone-related tasks
 * for each project — no generic placeholders. The write functions in
 * `mock-source.ts` mutate this array so task CRUD works without a database.
 */
type Seed = [title: string, status: TaskStatus, priority: TaskPriority];

function build(projectId: string, milestoneId: string, seeds: Seed[], start: number): Task[] {
  return seeds.map(([title, status, priority], i) => ({
    id: `${milestoneId}-t${i + 1}`,
    projectId,
    milestoneId,
    title,
    status,
    priority,
    completedAt: status === "completed" ? "2026-06-01T12:00:00" : undefined,
    // a couple of near-term target dates to exercise overdue/upcoming display
    targetDate: undefined,
  }));
}

// Home Cooked — Family Sharing MVP (≈83% complete: 10 done, 1 blocked, 1 in progress)
const homeCooked = build("home-cooked", "m-home-cooked", [
  ["Design sharing permission model", "completed", "high"],
  ["Sharing data model & migrations", "completed", "high"],
  ["Build invite workflow", "completed", "high"],
  ["Invite acceptance flow", "completed", "medium"],
  ["Generate & store share links", "completed", "medium"],
  ["Shared cookbook read access", "completed", "high"],
  ["Permission roles (owner / editor / viewer)", "completed", "high"],
  ["Sharing settings UI", "completed", "medium"],
  ["Activity feed for shared edits", "completed", "low"],
  ["Revoke & expire share links", "completed", "medium"],
  ["Email acceptance flow", "blocked", "high"],
  ["Permission edge-case tests", "in_progress", "medium"],
], 1);

// WardrobeHarmony — Closet Import (≈50%: 5 done, 1 blocked, 1 in progress, 3 todo)
const wardrobe = build("wardrobe-harmony", "m-wardrobe-harmony", [
  ["CSV import parser", "completed", "high"],
  ["Photo upload pipeline", "completed", "high"],
  ["Color extraction from photos", "completed", "high"],
  ["Map items to wardrobe schema", "completed", "medium"],
  ["Dedupe imported items", "completed", "medium"],
  ["Colorblind-safe palette tagging", "in_progress", "high"],
  ["Handle unsupported file formats", "blocked", "medium"],
  ["Bulk-edit imported items", "todo", "medium"],
  ["Import progress UI", "todo", "medium"],
  ["Import error reporting", "todo", "low"],
], 1);

// PersonalTrainer — Client Scheduling (planning; ≈25%: 2 done, 1 in progress, 5 todo)
const trainer = build("personal-trainer", "m-personal-trainer", [
  ["Define scheduling data model", "completed", "high"],
  ["Trainer availability calendar", "completed", "high"],
  ["Client booking flow", "in_progress", "high"],
  ["Recurring sessions", "todo", "medium"],
  ["Timezone handling", "todo", "medium"],
  ["Cancellation & reschedule rules", "todo", "medium"],
  ["Session reminders & notifications", "todo", "low"],
  ["Calendar sync research", "todo", "low"],
], 1);

// Cascade Lounge — Spring Content Drop (content; ≈37%: 3 done, 1 in progress, 4 todo)
const cascade = build("cascade-lounge", "m-cascade-lounge", [
  ["Plan spring content calendar", "completed", "medium"],
  ["Shoot lifestyle photography", "completed", "high"],
  ["Draft six feature articles", "completed", "medium"],
  ["Edit & proof articles", "in_progress", "medium"],
  ["Source product partnerships", "todo", "medium"],
  ["Design landing-page modules", "todo", "medium"],
  ["Schedule social teasers", "todo", "low"],
  ["Newsletter announcement", "todo", "low"],
], 1);

export const tasks: Task[] = [...homeCooked, ...wardrobe, ...trainer, ...cascade];
