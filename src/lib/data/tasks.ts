import type { Task } from "../domain";

/**
 * First-class, project-owned tasks. Seeded for Home Cooked's Family Sharing
 * MVP milestone (the hand-authored focus). Other projects' Focus checklists are
 * synthesized on demand in `focus.ts` and are not persisted here.
 */
export const tasks: Task[] = [
  { id: "f1", projectId: "home-cooked", milestoneId: "m-home-cooked", label: "Design sharing permissions", state: "done" },
  { id: "f2", projectId: "home-cooked", milestoneId: "m-home-cooked", label: "Invite flow wireframes", state: "done" },
  { id: "f3", projectId: "home-cooked", milestoneId: "m-home-cooked", label: "Build share links backend", state: "done" },
  { id: "f4", projectId: "home-cooked", milestoneId: "m-home-cooked", label: "Update settings UI", state: "active", estimate: "~3h" },
  { id: "f5", projectId: "home-cooked", milestoneId: "m-home-cooked", label: "Permission edge-case tests", state: "todo", estimate: "~2h" },
  { id: "f6", projectId: "home-cooked", milestoneId: "m-home-cooked", label: "Ship behind feature flag", state: "todo", estimate: "~1h" },
];
