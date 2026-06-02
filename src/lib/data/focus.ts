import type { Focus, FocusTask, Project } from "../types";

/** Hand-authored current focus (Home Cooked). */
export const focus: Focus = {
  projectId: "home-cooked",
  title: "Home Cooked — Family Sharing MVP",
  priority: "High",
  summary: "Allow families to share cookbooks and recipes with custom permissions.",
  progress: 83,
  tasks: [
    { id: "f1", label: "Design sharing permissions", state: "done" },
    { id: "f2", label: "Invite flow wireframes", state: "done" },
    { id: "f3", label: "Build share links backend", state: "done" },
    { id: "f4", label: "Update settings UI", state: "active", estimate: "~3h" },
    { id: "f5", label: "Permission edge-case tests", state: "todo", estimate: "~2h" },
    { id: "f6", label: "Ship behind feature flag", state: "todo", estimate: "~1h" },
  ],
};

/**
 * Returns the rich, hand-authored focus for Home Cooked, or synthesizes a
 * believable milestone checklist for any other project from its progress.
 *
 * Pure: receives the project list (and optional base focus) so it can run on
 * the client without importing the data layer's repo.
 */
export function focusForProject(
  projectId: string,
  projects: Project[],
  base: Focus = focus
): Focus {
  if (projectId === base.projectId) return base;
  const project = projects.find((p) => p.id === projectId);
  if (!project) return base;

  const generic: { label: string; threshold: number }[] = [
    { label: "Scope & success criteria", threshold: 10 },
    { label: "Design / wireframes", threshold: 30 },
    { label: "Core implementation", threshold: 55 },
    { label: "Integration & data wiring", threshold: 75 },
    { label: "QA & edge cases", threshold: 90 },
    { label: "Ship", threshold: 100 },
  ];

  const tasks: FocusTask[] = generic.map((g, i) => {
    let state: FocusTask["state"] = "todo";
    if (project.progress >= g.threshold) state = "done";
    else if (generic[i - 1] && project.progress >= generic[i - 1].threshold) state = "active";
    return { id: `${projectId}-f${i}`, label: g.label, state };
  });

  return {
    projectId,
    title: `${project.name} — ${project.nextMilestone}`,
    priority: project.status === "Active" ? "High" : "Medium",
    summary: `Drive ${project.name} toward the "${project.nextMilestone}" milestone.`,
    progress: project.progress,
    tasks,
  };
}
