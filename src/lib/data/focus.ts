import type { Focus, Task, Project } from "../domain";
import { projects } from "./projects";
import { milestones } from "./milestones";
import { tasks } from "./tasks";

/**
 * Compose the canonical "Current Focus" view (Home Cooked) from its
 * source-of-truth entities: the active milestone + that milestone's tasks.
 * Focus is a derived view, not a stored entity.
 */
function composeFocus(projectId: string): Focus {
  const project = projects.find((p) => p.id === projectId)!;
  const milestone = milestones.find((m) => m.projectId === projectId)!;
  const milestoneTasks = tasks.filter((t) => t.milestoneId === milestone.id);
  return {
    projectId: project.id,
    title: `${project.name} — ${milestone.title}`,
    priority: milestone.priority,
    summary: milestone.summary,
    progress: milestone.progress,
    tasks: milestoneTasks,
  };
}

/** The studio's headline focus. */
export const focus: Focus = composeFocus("home-cooked");

/**
 * Returns the focus view for any project: the hand-authored Home Cooked focus,
 * or a synthesized milestone checklist derived from the project's progress.
 *
 * Pure: receives the project list (and optional base focus) so it can run on
 * the client without importing the data-layer repo.
 */
export function focusForProject(
  projectId: string,
  projectList: Project[],
  base: Focus = focus
): Focus {
  if (projectId === base.projectId) return base;
  const project = projectList.find((p) => p.id === projectId);
  if (!project) return base;

  const generic: { label: string; threshold: number }[] = [
    { label: "Scope & success criteria", threshold: 10 },
    { label: "Design / wireframes", threshold: 30 },
    { label: "Core implementation", threshold: 55 },
    { label: "Integration & data wiring", threshold: 75 },
    { label: "QA & edge cases", threshold: 90 },
    { label: "Ship", threshold: 100 },
  ];

  const synthesized: Task[] = generic.map((g, i) => {
    let state: Task["state"] = "todo";
    if (project.progress >= g.threshold) state = "done";
    else if (generic[i - 1] && project.progress >= generic[i - 1].threshold) state = "active";
    return { id: `${projectId}-f${i}`, projectId, label: g.label, state };
  });

  return {
    projectId,
    title: `${project.name} — ${project.nextMilestone}`,
    priority: project.status === "Active" ? "High" : "Medium",
    summary: `Drive ${project.name} toward the "${project.nextMilestone}" milestone.`,
    progress: project.progress,
    tasks: synthesized,
  };
}
