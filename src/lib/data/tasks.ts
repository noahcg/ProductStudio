import type { Task, TaskStatus } from "../domain";

/**
 * Mutable in-memory task store (mock mode). Realistic, milestone-related tasks
 * for each project — no generic placeholders. The write functions in
 * `mock-source.ts` mutate this array so task CRUD works without a database.
 *
 * Completed tasks carry a spread of dates (relative to the studio clock,
 * 2026-06-07) so the Weekly Founder Review can derive realistic "this week"
 * deltas: a few projects advanced this week, others were quiet.
 */
type Seed = [title: string, status: TaskStatus, completedAt?: string];

function build(projectId: string, milestoneId: string, seeds: Seed[]): Task[] {
  return seeds.map(([title, status, completedAt], i) => ({
    id: `${milestoneId}-t${i + 1}`,
    projectId,
    milestoneId,
    title,
    status,
    createdAt: "2026-05-10T12:00:00",
    completedAt: status === "completed" ? completedAt ?? "2026-05-20T12:00:00" : undefined,
    source: { label: "Seed data", type: "import" },
  }));
}

// Home Cooked — Family Sharing MVP (≈83%: 10 done [3 this week], 1 in progress, 1 todo)
const homeCooked = build("home-cooked", "m-home-cooked", [
  ["Design sharing permission model", "completed", "2026-05-12T12:00:00"],
  ["Sharing data model & migrations", "completed", "2026-05-14T12:00:00"],
  ["Build invite workflow", "completed", "2026-05-16T12:00:00"],
  ["Invite acceptance flow", "completed", "2026-05-19T12:00:00"],
  ["Generate & store share links", "completed", "2026-05-22T12:00:00"],
  ["Shared cookbook read access", "completed", "2026-05-26T12:00:00"],
  ["Permission roles (owner / editor / viewer)", "completed", "2026-05-28T12:00:00"],
  ["Sharing settings UI", "completed", "2026-06-02T12:00:00"],
  ["Activity feed for shared edits", "completed", "2026-06-04T12:00:00"],
  ["Revoke & expire share links", "completed", "2026-06-06T12:00:00"],
  ["Email acceptance flow", "todo"],
  ["Permission edge-case tests", "in_progress"],
]);

// WardrobeHarmony — Closet Import (≈50%: 5 done [0 this week], 1 in progress, 4 todo)
const wardrobe = build("wardrobe-harmony", "m-wardrobe-harmony", [
  ["CSV import parser", "completed", "2026-05-12T12:00:00"],
  ["Photo upload pipeline", "completed", "2026-05-15T12:00:00"],
  ["Color extraction from photos", "completed", "2026-05-18T12:00:00"],
  ["Map items to wardrobe schema", "completed", "2026-05-21T12:00:00"],
  ["Dedupe imported items", "completed", "2026-05-24T12:00:00"],
  ["Colorblind-safe palette tagging", "in_progress"],
  ["Handle unsupported file formats", "todo"],
  ["Bulk-edit imported items", "todo"],
  ["Import progress UI", "todo"],
  ["Import error reporting", "todo"],
]);

// PersonalTrainer — Client Scheduling (planning; ≈25%: 2 done [0 this week — stale], 1 in progress, 5 todo)
const trainer = build("personal-trainer", "m-personal-trainer", [
  ["Define scheduling data model", "completed", "2026-05-14T12:00:00"],
  ["Trainer availability calendar", "completed", "2026-05-16T12:00:00"],
  ["Client booking flow", "in_progress"],
  ["Recurring sessions", "todo"],
  ["Timezone handling", "todo"],
  ["Cancellation & reschedule rules", "todo"],
  ["Session reminders & notifications", "todo"],
  ["Calendar sync research", "todo"],
]);

// Cascade Lounge — Spring Content Drop (content; ≈37%: 3 done [1 this week], 1 in progress, 4 todo)
const cascade = build("cascade-lounge", "m-cascade-lounge", [
  ["Plan spring content calendar", "completed", "2026-05-20T12:00:00"],
  ["Shoot lifestyle photography", "completed", "2026-05-27T12:00:00"],
  ["Draft six feature articles", "completed", "2026-06-03T12:00:00"],
  ["Edit & proof articles", "in_progress"],
  ["Source product partnerships", "todo"],
  ["Design landing-page modules", "todo"],
  ["Schedule social teasers", "todo"],
  ["Newsletter announcement", "todo"],
]);

export const tasks: Task[] = [...homeCooked, ...wardrobe, ...trainer, ...cascade];
