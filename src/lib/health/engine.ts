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
import { taskStats } from "../tasks/stats";
import type { GeneratedSignal } from "../signals/engine";
import type { GitHubProjectStatus } from "../integrations/github/types";
import type { VercelProjectStatus } from "../integrations/vercel/types";

/**
 * The Project Health Engine — deterministic, no AI/LLM, no random values.
 *
 * Evaluates the overall condition of a project across six categories and
 * explains why. Health is an input into the Focus Engine: it helps surface what
 * deserves attention without overriding milestone progress.
 */
export interface HealthInput {
  projects: Project[];
  milestones: Milestone[];
  roadmap: RoadmapItem[];
  tasks: Task[];
  decisions: Decision[];
  activity: Activity[];
  signals: Signal[];
  /** Operational signals from the Signals Engine — the Signals category summarizes these. */
  generatedSignals?: GeneratedSignal[];
  /** GitHub status per project — influences Momentum + Execution only. */
  github?: Record<string, GitHubProjectStatus>;
  /** Vercel deployment status per project — influences Momentum + Execution + Risk. */
  vercel?: Record<string, VercelProjectStatus>;
}

export type HealthCategory = "momentum" | "execution" | "planning" | "focus" | "risk" | "signals";

export type HealthStatus = "Healthy" | "Stable" | "Attention Needed" | "At Risk";

export interface HealthReason {
  text: string;
  good: boolean;
}

export interface CategoryScore {
  category: HealthCategory;
  label: string;
  score: number; // 0–100
  reason: HealthReason;
}

export interface ProjectHealth {
  project: Project;
  score: number; // 0–100, weighted average
  status: HealthStatus;
  categories: CategoryScore[];
  /** Momentum / Risk surfaced for the Focus Engine. */
  momentum: number;
  risk: number;
  reasons: HealthReason[];
}

// Category weights (sum = 1.00).
export const WEIGHTS: Record<HealthCategory, number> = {
  momentum: 0.2,
  execution: 0.25,
  planning: 0.15,
  focus: 0.1,
  risk: 0.2,
  signals: 0.1,
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const plural = (n: number) => (n === 1 ? "" : "s");

function daysSince(iso: string, now: Date): number {
  return Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}
function latestIso(isos: (string | undefined)[]): string | undefined {
  return isos.reduce<string | undefined>(
    (max, iso) => (iso && (!max || new Date(iso) > new Date(max)) ? iso : max),
    undefined
  );
}

function statusFor(score: number): HealthStatus {
  if (score >= 90) return "Healthy";
  if (score >= 70) return "Stable";
  if (score >= 50) return "Attention Needed";
  return "At Risk";
}

function projectHealth(project: Project, input: HealthInput, now: Date): ProjectHealth {
  const projectTasks = input.tasks.filter((t) => t.projectId === project.id);
  const milestones = input.milestones.filter((m) => m.projectId === project.id);
  const milestone = milestones.find((m) => m.status === "active") ?? milestones[0];
  const milestoneTasks = milestone ? projectTasks.filter((t) => t.milestoneId === milestone.id) : projectTasks;
  const stats = taskStats(milestoneTasks, now);

  // ---- Momentum: recent activity + recent task completion ----
  // GitHub + Vercel activity feeds Momentum + Execution (never planning/decisions/roadmap).
  const gh = input.github?.[project.id];
  const vc = input.vercel?.[project.id];
  const projectActivity = input.activity.filter((a) => a.projectId === project.id);
  // A successful deployment counts as recent activity (the product shipped).
  const last = latestIso([...projectActivity.map((a) => a.whenIso), project.lastActivityIso, gh?.lastActivityIso, vc?.lastReadyIso]);
  const idle = last ? daysSince(last, now) : Infinity;
  const recentCompleted = projectTasks.filter(
    (t) => t.status === "completed" && t.completedAt && daysSince(t.completedAt, now) <= 7
  ).length;
  const activityScore = idle <= 2 ? 100 : idle <= 7 ? 75 : idle <= 13 ? 45 : idle <= 29 ? 20 : 5;
  const completionScore = recentCompleted >= 3 ? 100 : recentCompleted >= 1 ? 70 : 30;
  const momentum = Math.round(0.6 * activityScore + 0.4 * completionScore);
  const momentumReason: HealthReason =
    gh && gh.commitsThisWeek > 0
      ? { text: `${gh.commitsThisWeek} commit${plural(gh.commitsThisWeek)} this week`, good: true }
      : idle === Infinity
        ? { text: "No recorded activity", good: false }
        : idle >= 14
          ? { text: `No activity in ${idle} days`, good: false }
          : { text: `Recent activity (${relativeTime(last!, now)})`, good: true };

  // ---- Execution: task + milestone completion (+ small GitHub/Vercel shipping nudge) ----
  let execution: number;
  let executionReason: HealthReason;
  const ghBoost = gh ? Math.min(gh.commitsThisWeek, 6) : 0;
  // A healthy, successful production deploy slightly raises confidence; a failing
  // deploy slightly lowers it. Small + capped — tasks remain the driver. A stale
  // "ready" (Warning health, e.g. no recent deploy) earns no boost.
  const vcBoost = vc ? (vc.health === "Healthy" && vc.state === "ready" ? 4 : vc.state === "failed" ? -4 : 0) : 0;
  const shipBoost = ghBoost + vcBoost;
  if (stats.total) {
    execution = clamp(stats.progress - Math.max(0, stats.remaining - 6) * 4 + shipBoost);
    executionReason =
      stats.progress >= 50
        ? { text: `${stats.completed}/${stats.total} tasks complete (${stats.progress}%)`, good: true }
        : { text: `${stats.progress}% complete, ${stats.remaining} task${plural(stats.remaining)} remaining`, good: false };
  } else {
    execution = clamp((milestone ? Math.min(milestone.progress, 50) : 10) + shipBoost);
    executionReason = { text: "No tasks tracked yet", good: false };
  }

  // ---- Planning: roadmap quality ----
  const nowCount = input.roadmap.filter((r) => r.projectId === project.id && r.column === "now").length;
  const nextCount = input.roadmap.filter((r) => r.projectId === project.id && r.column === "next").length;
  const laterCount = input.roadmap.filter((r) => r.projectId === project.id && r.column === "later").length;
  const roadmapTotal = nowCount + nextCount + laterCount;
  const planning = clamp(10 + (nowCount > 0 ? 45 : 0) + (nextCount > 0 ? 30 : 0) + (laterCount > 0 ? 15 : 0));
  const planningReason: HealthReason =
    roadmapTotal === 0
      ? { text: "Empty roadmap", good: false }
      : nowCount > 0 && nextCount > 0
        ? { text: "Now & Next items planned", good: true }
        : { text: `${roadmapTotal} roadmap item${plural(roadmapTotal)}`, good: nowCount > 0 };

  // ---- Focus: active milestone exists ----
  const hasActive = milestones.some((m) => m.status === "active");
  const focus = hasActive ? 100 : milestones.length ? 50 : 10;
  const focusReason: HealthReason = hasActive
    ? { text: "Active milestone exists", good: true }
    : { text: milestones.length ? "Milestone not active yet" : "No active milestone", good: false };

  // ---- Risk: blockers + overdue (+ deployment failures) ----
  const blocked = projectTasks.filter((t) => t.status === "blocked").length;
  const overdue = projectTasks.filter(
    (t) => t.status !== "completed" && t.targetDate && new Date(t.targetDate) < now
  ).length;
  // A broken deployment is a real, current risk to the product. Balanced so it
  // dents — but does not destroy — health: critical (repeated failures) > single.
  const deployRisk = vc?.health === "Critical" ? 30 : vc?.state === "failed" ? 14 : 0;
  const risk = clamp(100 - blocked * 18 - overdue * 15 - deployRisk);
  const riskReason: HealthReason =
    vc?.health === "Critical"
      ? { text: `${vc.consecutiveFailures} failed deployments`, good: false }
      : blocked > 0
        ? { text: `${blocked} blocked task${plural(blocked)}`, good: false }
        : overdue > 0
          ? { text: `${overdue} overdue task${plural(overdue)}`, good: false }
          : vc?.state === "failed"
            ? { text: "Last deployment failed", good: false }
            : { text: "No blockers", good: true };

  // ---- Signals: summarize the Signals Engine's operational signals ----
  const projectSignals = (input.generatedSignals ?? []).filter((s) => s.projectId === project.id);
  const watch = projectSignals.filter((s) => s.severity === "watch").length;
  const warning = projectSignals.filter((s) => s.severity === "warning").length;
  const critical = projectSignals.filter((s) => s.severity === "critical").length;
  const signalsScore = clamp(100 - watch * 5 - warning * 15 - critical * 30);
  const signalsReason: HealthReason =
    critical > 0
      ? { text: `${critical} critical signal${plural(critical)}`, good: false }
      : warning > 0
        ? { text: `${warning} warning signal${plural(warning)}`, good: false }
        : watch > 0
          ? { text: `${watch} signal${plural(watch)} to watch`, good: false }
          : { text: "No operational warnings", good: true };

  const categories: CategoryScore[] = [
    { category: "momentum", label: "Momentum", score: momentum, reason: momentumReason },
    { category: "execution", label: "Execution", score: execution, reason: executionReason },
    { category: "planning", label: "Planning", score: planning, reason: planningReason },
    { category: "focus", label: "Focus", score: focus, reason: focusReason },
    { category: "risk", label: "Risk", score: risk, reason: riskReason },
    { category: "signals", label: "Signals", score: signalsScore, reason: signalsReason },
  ];

  const score = Math.round(categories.reduce((sum, c) => sum + c.score * WEIGHTS[c.category], 0));

  return {
    project,
    score,
    status: statusFor(score),
    categories,
    momentum,
    risk,
    reasons: categories.map((c) => c.reason),
  };
}

export function computeHealth(input: HealthInput, now: Date = studioNow()): ProjectHealth[] {
  return input.projects.map((p) => projectHealth(p, input, now));
}

export function healthFor(input: HealthInput, projectId: string, now: Date = studioNow()): ProjectHealth | undefined {
  const project = input.projects.find((p) => p.id === projectId);
  return project ? projectHealth(project, input, now) : undefined;
}
