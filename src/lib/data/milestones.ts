import type { Milestone } from "../domain";

/**
 * Each project's current ("next") milestone — the one the Focus screen targets.
 * Owned by the project via `projectId`. Home Cooked's is the hand-authored
 * Family Sharing MVP; the others mirror each project's `nextMilestone`.
 */
export const milestones: Milestone[] = [
  {
    id: "m-home-cooked",
    projectId: "home-cooked",
    title: "Family Sharing MVP",
    summary: "Allow families to share cookbooks and recipes with custom permissions.",
    priority: "High",
    progress: 83,
    status: "active",
  },
  {
    id: "m-wardrobe-harmony",
    projectId: "wardrobe-harmony",
    title: "Closet Import",
    summary: 'Drive WardrobeHarmony toward the "Closet Import" milestone.',
    priority: "High",
    progress: 48,
    status: "active",
  },
  {
    id: "m-personal-trainer",
    projectId: "personal-trainer",
    title: "Client Scheduling",
    summary: 'Drive PersonalTrainer toward the "Client Scheduling" milestone.',
    priority: "Medium",
    progress: 21,
    status: "planned",
  },
  {
    id: "m-cascade-lounge",
    projectId: "cascade-lounge",
    title: "Spring Content Drop",
    summary: 'Drive Cascade Lounge toward the "Spring Content Drop" milestone.',
    priority: "Medium",
    progress: 35,
    status: "active",
  },
];
