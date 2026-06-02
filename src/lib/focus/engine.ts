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
import { taskStats, type TaskStats } from "../tasks/stats";
import { computeHealth, type ProjectHealth } from "../health/engine";

/**
 * The Focus Engine — deterministic, no AI/LLM.
 *
 * Given the studio's domain inputs it computes a focus score per project from
 * explicit positive/negative signals (now driven largely by task execution),
 * picks the single Current Focus project + milestone, and produces an
 * explainable recommendation. Same inputs + clock → identical output (pure;
 * stable tiebreak by project id).
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
  stats: TaskStats;
  score: number;
  tasksRemaining: number;
  lastActivityIso?: string;
  signals: FocusSignal[];
  reasons: string[];
  recommendation: string;
}

export interface FocusResult {
  current?: ProjectFocus;
  ranked: ProjectFocus[];
}

// ---- Scoring weights (deterministic, documented) ----
const W = {
  milestoneProgress: 0.4, // ×progress(0–100) → up to +40; nearing completion
  completedTask: 1.5, // per completed task
  completedTaskCap: 18,
  activeMilestone: 12,
  nowItem: 5,
  nowItemCap: 15,
  recentActivity: 10,
  statusActive: 10,
  statusPlanning: 3,
  blockedTask: -12, // per blocked task
  overdueTask: -10, // per overdue task
  remainingTask: -1.5, // per remaining task
  remainingCap: -15,
  staleProject: -18,
  warnSignal: -10,
  critSignal: -20,
  staleDays: 14,
  recentDays: 7,
  // Health Engine integration (balanced — must not override milestone progress).
  healthAttention: 0.15, // ×(100 − health score): lower health → more attention
  momentumBoost: 0.1, // ×(momentum − 50)
  riskBoost: 0.08, // ×(100 − risk score)
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

const plural = (n: number) => (n === 1 ? "" : "s");

function scoreProject(
  project: Project,
  input: FocusInput,
  now: Date,
  health?: ProjectHealth
): ProjectFocus {
  const signals: FocusSignal[] = [];
  const reasons: string[] = [];
  const add = (label: string, delta: number) =>
    signals.push({ label, delta, kind: delta >= 0 ? "positive" : "negative" });

  const projectMilestones = input.milestones.filter((m) => m.projectId === project.id);
  const milestone = projectMilestones.find((m) => m.status === "active") ?? projectMilestones[0];
  const milestoneTasks = milestone ? input.tasks.filter((t) => t.milestoneId === milestone.id) : [];
  const stats = taskStats(milestoneTasks, now);

  // Progress (task-derived; falls back to the milestone's stored estimate if it
  // has no tasks yet) — nearing completion is high-leverage.
  const progress = stats.total ? stats.progress : milestone?.progress ?? 0;

  // --- Positive ---
  if (milestone) {
    add(`Milestone ${progress}% complete`, Math.round(progress * W.milestoneProgress));
    reasons.push(`Milestone ${progress}% complete`);
    if (stats.total) reasons.push(`${stats.completed}/${stats.total} tasks complete`);
    if (milestone.status === "active") add("Active milestone", W.activeMilestone);
  } else {
    reasons.push("No active milestone");
  }
  if (stats.completed > 0) {
    add(`${stats.completed} task${plural(stats.completed)} completed`, Math.min(stats.completed * W.completedTask, W.completedTaskCap));
  }

  const nowCount = input.roadmap.filter((r) => r.projectId === project.id && r.column === "now").length;
  if (nowCount > 0) {
    add(`${nowCount} item${plural(nowCount)} in Now`, Math.min(nowCount * W.nowItem, W.nowItemCap));
  }

  const projectActivity = input.activity.filter((a) => a.projectId === project.id);
  const lastActivityIso = latestIso(
    [...projectActivity.map((a) => a.whenIso), project.lastActivityIso].filter(Boolean)
  );
  const idle = lastActivityIso ? daysSince(lastActivityIso, now) : Infinity;
  const recentCount = projectActivity.filter((a) => daysSince(a.whenIso, now) <= W.recentDays).length;
  if (recentCount > 0) add(`Recent activity (${recentCount} event${plural(recentCount)})`, W.recentActivity);
  if (lastActivityIso)
    reasons.push(idle >= W.staleDays ? `No activity for ${idle} days` : `Last activity ${relativeTime(lastActivityIso, now)}`);

  if (project.status === "Active") add("Active project", W.statusActive);
  else if (project.status === "Planning") add("In planning", W.statusPlanning);

  // --- Negative (task execution) ---
  if (stats.blocked > 0) {
    add(`${stats.blocked} blocked task${plural(stats.blocked)}`, W.blockedTask * stats.blocked);
    reasons.push(`${stats.blocked} blocked task${plural(stats.blocked)}`);
  } else if (stats.total) {
    reasons.push("No blocked tasks");
  }
  if (stats.overdue > 0) {
    add(`${stats.overdue} overdue task${plural(stats.overdue)}`, W.overdueTask * stats.overdue);
    reasons.push(`${stats.overdue} overdue task${plural(stats.overdue)}`);
  }
  if (stats.remaining > 0) {
    add(`${stats.remaining} task${plural(stats.remaining)} remaining`, Math.max(stats.remaining * W.remainingTask, W.remainingCap));
    reasons.push(`${stats.remaining} task${plural(stats.remaining)} remaining`);
  }

  if (idle >= W.staleDays) add(`No activity for ${idle} days`, W.staleProject);

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

  const openDecisions = input.decisions.filter(
    (d) => d.projectId === project.id && d.status !== "Decided"
  ).length;
  if (openDecisions > 0) reasons.push(`${openDecisions} open decision${plural(openDecisions)}`);

  // --- Project Health (balanced input; does not override milestone progress) ---
  if (health) {
    if (health.score < 90) add(`Needs attention (health ${health.score})`, Math.round((100 - health.score) * W.healthAttention));
    if (health.momentum !== 50) add(`Momentum ${health.momentum}/100`, Math.round((health.momentum - 50) * W.momentumBoost));
    if (health.risk < 100) add(`Risk present`, Math.round((100 - health.risk) * W.riskBoost));
    reasons.push(`Health ${health.score}/100 — ${health.status}`);
  }

  const score = Math.round(signals.reduce((sum, sig) => sum + sig.delta, 0));
  const recommendation = recommend(project, milestone, stats, nextUp(project, milestone, input));

  return { project, milestone, stats, score, tasksRemaining: stats.remaining, lastActivityIso, signals, reasons, recommendation };
}

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

function recommend(project: Project, milestone: Milestone | undefined, stats: TaskStats, next?: string): string {
  if (!milestone) return `Pick a milestone for ${project.name} to focus on.`;
  if (stats.blocked > 0) return `Unblock ${stats.blocked} task${plural(stats.blocked)} on ${milestone.title}, then finish it.`;
  if (stats.remaining > 0) return `Finish ${milestone.title} (${stats.remaining} task${plural(stats.remaining)} left)${next ? ` before starting ${next}` : ""}.`;
  return `Ship ${milestone.title}${next ? `, then pick up ${next}` : ""}.`;
}

export function computeFocus(input: FocusInput, now: Date = studioNow()): FocusResult {
  const healthById = new Map(computeHealth(input, now).map((h) => [h.project.id, h]));
  const ranked = input.projects
    .map((p) => scoreProject(p, input, now, healthById.get(p.id)))
    .sort((a, b) => b.score - a.score || a.project.id.localeCompare(b.project.id));
  return { current: ranked[0], ranked };
}
