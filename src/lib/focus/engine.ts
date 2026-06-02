import type {
  Project,
  Milestone,
  RoadmapItem,
  Task,
  Decision,
  Activity,
  Signal,
} from "../domain";
import { now as studioNow } from "../clock";
import { relativeTime } from "../utils";

/**
 * The Focus Engine — deterministic, no AI/LLM.
 *
 * Given the studio's domain inputs it computes a focus score per project from
 * explicit positive/negative signals, picks the single Current Focus project
 * and its milestone, and produces an explainable recommendation. Same inputs +
 * clock → identical output (pure; stable tiebreak by project id).
 */
export interface FocusInput {
  projects: Project[];
  milestones: Milestone[];
  roadmap: RoadmapItem[];
  tasks: Task[];
  decisions: Decision[];
  activity: Activity[];
  signals: Signal[];
}

export interface FocusSignal {
  label: string;
  delta: number;
  kind: "positive" | "negative";
}

export interface ProjectFocus {
  project: Project;
  milestone?: Milestone;
  score: number;
  tasksRemaining: number;
  lastActivityIso?: string;
  /** Signed score contributions (transparency). */
  signals: FocusSignal[];
  /** Human-readable reasons for the recommendation. */
  reasons: string[];
  recommendation: string;
}

export interface FocusResult {
  /** Exactly one Current Focus project (undefined only if there are no projects). */
  current?: ProjectFocus;
  ranked: ProjectFocus[];
}

// ---- Scoring weights (deterministic, documented) ----
const W = {
  milestoneProgress: 0.5, // ×progress(0–100) → up to +50; finish what's almost done
  activeMilestone: 15,
  nowItem: 6, // per roadmap item in Now
  nowItemCap: 18,
  recentActivity: 10, // any activity in the last 7 days
  statusActive: 12,
  statusPlanning: 4,
  blocker: -10, // per blocker
  staleProject: -20, // no activity for ≥14 days
  overdue: -15, // per overdue roadmap target date
  warnSignal: -10, // per project-scoped warning signal
  critSignal: -20, // per project-scoped critical signal
  staleDays: 14,
  recentDays: 7,
} as const;

function daysSince(iso: string, now: Date): number {
  return Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}

function latestIso(isos: string[]): string | undefined {
  return isos.reduce<string | undefined>(
    (max, iso) => (!max || new Date(iso) > new Date(max) ? iso : max),
    undefined
  );
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}

function scoreProject(project: Project, input: FocusInput, now: Date): ProjectFocus {
  const signals: FocusSignal[] = [];
  const reasons: string[] = [];
  const add = (label: string, delta: number) => {
    signals.push({ label, delta, kind: delta >= 0 ? "positive" : "negative" });
  };

  // Active milestone for this project (prefer one marked active).
  const projectMilestones = input.milestones.filter((m) => m.projectId === project.id);
  const milestone =
    projectMilestones.find((m) => m.status === "active") ?? projectMilestones[0];

  const milestoneTasks = milestone
    ? input.tasks.filter((t) => t.milestoneId === milestone.id)
    : [];
  const tasksRemaining = milestoneTasks.filter((t) => t.state !== "done").length;

  // --- Positive signals ---
  if (milestone) {
    add(`Milestone ${milestone.progress}% complete`, Math.round(milestone.progress * W.milestoneProgress));
    reasons.push(`Milestone ${milestone.progress}% complete`);
    if (milestone.status === "active") add("Active milestone", W.activeMilestone);
    if (milestoneTasks.length) reasons.push(`${tasksRemaining} task${plural(tasksRemaining)} remaining`);
  } else {
    reasons.push("No active milestone");
  }

  const nowCount = input.roadmap.filter((r) => r.projectId === project.id && r.column === "now").length;
  if (nowCount > 0) {
    add(`${nowCount} item${plural(nowCount)} in Now`, Math.min(nowCount * W.nowItem, W.nowItemCap));
    reasons.push(`${nowCount} item${plural(nowCount)} in Now`);
  }

  // Last activity = most recent of the activity feed + the project's snapshot.
  const projectActivity = input.activity.filter((a) => a.projectId === project.id);
  const lastActivityIso =
    latestIso([...projectActivity.map((a) => a.whenIso), project.lastActivityIso].filter(Boolean));
  const idle = lastActivityIso ? daysSince(lastActivityIso, now) : Infinity;
  const recentCount = projectActivity.filter((a) => daysSince(a.whenIso, now) <= W.recentDays).length;

  if (recentCount > 0) {
    add(`Recent activity (${recentCount} event${plural(recentCount)})`, W.recentActivity);
  }
  if (lastActivityIso) {
    reasons.push(idle >= W.staleDays ? `No activity for ${idle} days` : `Last activity ${relativeTime(lastActivityIso, now)}`);
  }

  // --- Project status ---
  if (project.status === "Active") add("Active project", W.statusActive);
  else if (project.status === "Planning") add("In planning", W.statusPlanning);

  // --- Negative signals ---
  if (project.blockers > 0) {
    add(`${project.blockers} blocker${plural(project.blockers)}`, W.blocker * project.blockers);
    reasons.push(`${project.blockers} blocker${plural(project.blockers)}`);
  } else {
    reasons.push("No blockers");
  }

  if (idle >= W.staleDays) add(`No activity for ${idle} days`, W.staleProject);

  const overdue = input.roadmap.filter(
    (r) => r.projectId === project.id && r.targetDate && new Date(r.targetDate) < now && r.status !== "done"
  ).length;
  if (overdue > 0) {
    add(`${overdue} overdue target date${plural(overdue)}`, W.overdue * overdue);
    reasons.push(`${overdue} overdue target date${plural(overdue)}`);
  }

  const projectSignals = input.signals.filter((s) => s.projectId === project.id);
  const warns = projectSignals.filter((s) => s.level === "warn").length;
  const crits = projectSignals.filter((s) => s.level === "down").length;
  if (warns > 0) {
    add(`${warns} warning signal${plural(warns)}`, W.warnSignal * warns);
    reasons.push(`${warns} warning signal${plural(warns)}`);
  }
  if (crits > 0) {
    add(`${crits} critical signal${plural(crits)}`, W.critSignal * crits);
    reasons.push(`${crits} critical signal${plural(crits)}`);
  }

  // Context only (not scored): open decisions awaiting a call.
  const openDecisions = input.decisions.filter(
    (d) => d.projectId === project.id && d.status !== "Decided"
  ).length;
  if (openDecisions > 0) reasons.push(`${openDecisions} open decision${plural(openDecisions)}`);

  const score = signals.reduce((sum, s) => sum + s.delta, 0);
  const recommendation = recommend(project, milestone, tasksRemaining, project.blockers, nextUp(project, milestone, input));

  return { project, milestone, score, tasksRemaining, lastActivityIso, signals, reasons, recommendation };
}

/** The next thing to pick up after the current milestone (for the recommendation). */
function nextUp(project: Project, milestone: Milestone | undefined, input: FocusInput): string | undefined {
  const next = input.roadmap
    .filter((r) => r.projectId === project.id && r.column === "next")
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (next) return next.title;
  const otherNow = input.roadmap
    .filter((r) => r.projectId === project.id && r.column === "now" && r.title !== milestone?.title)
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return otherNow?.title;
}

function recommend(
  project: Project,
  milestone: Milestone | undefined,
  remaining: number,
  blockers: number,
  next?: string
): string {
  if (!milestone) return `Pick a milestone for ${project.name} to focus on.`;
  if (blockers > 0) return `Clear ${blockers} blocker${plural(blockers)} on ${milestone.title}, then finish it.`;
  if (remaining > 0) return `Finish ${milestone.title}${next ? ` before starting ${next}` : ""}.`;
  return `Ship ${milestone.title}${next ? `, then pick up ${next}` : ""}.`;
}

export function computeFocus(input: FocusInput, now: Date = studioNow()): FocusResult {
  const ranked = input.projects
    .map((p) => scoreProject(p, input, now))
    .sort((a, b) => b.score - a.score || a.project.id.localeCompare(b.project.id));
  return { current: ranked[0], ranked };
}
