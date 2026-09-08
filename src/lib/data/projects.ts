import type { Project } from "../domain";

/**
 * The clean starting workspace. Product Studio begins with the one active
 * product and no invented progress, activity, or planning data.
 */
export const projects: Project[] = [
  {
    id: "home-cooked",
    productId: "home-cooked",
    name: "Launch MVP",
    tagline: "",
    status: "Active",
    progress: 0,
    nextMilestone: "",
    openTasks: 0,
    blockers: 0,
    lastActivityIso: "",
    accent: "amber",
    icon: "chef",
    repo: "noahg/home-cooked",
    domain: "tryhomecooked.com",
  },
];
