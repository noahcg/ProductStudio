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
import { taskStats } from "../tasks/stats";
import { computeHealth, type ProjectHealth } from "../health/engine";
import type { GeneratedSignal, SignalSeverity } from "../signals/engine";
import type { GitHubProjectStatus } from "../integrations/github/types";
import type { VercelProjectStatus } from "../integrations/vercel/types";
import type { SupabaseProjectStatus } from "../integrations/supabase/types";
import type {
  WeeklyReview,
  ReviewPeriodKey,
  ChangeDirection,
  ProjectReview,
  HealthChange,
  MilestoneProgress,
  DecisionSummaryItem,
  SignalSummaryGroup,
  MomentumPoint,
  FocusRecommendation,
} from "./types";

/**
 * The Weekly Founder Review engine — deterministic, NO AI / NO LLM.
 *
 * It connects the granular systems (activity, signals, health, focus) into a
 * single chief-of-staff narrative: what happened this period and what to focus
 * on next. Same inputs + clock → identical review.
 *
 * "Previous" state (for health/progress deltas) is reconstructed deterministically
 * by re-running the pure Health Engine *as of* the period start, with this
 * period's task completions / activity / decisions rolled back. No historical
 * snapshots are required, and the comparison isolates the work done this period
 * (integration status + signals are held constant across both points).
 */
export interface ReviewInput {
  projects: Project[];
  milestones: Milestone[];
  roadmap: RoadmapItem[];
  tasks: Task[];
  decisions: Decision[];
  activity: Activity[];
  signals: Signal[];
  generatedSignals: GeneratedSignal[];
  github?: Record<string, GitHubProjectStatus>;
  vercel?: Record<string, VercelProjectStatus>;
  supabase?: Record<string, SupabaseProjectStatus>;
}

const DAY = 86_400_000;
const periodDays = (key: ReviewPeriodKey) => (key === "30d" ? 30 : 7);
const plural = (n: number) => (n === 1 ? "" : "s");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function direction(delta: number): ChangeDirection {
  if (delta > 2) return "improved";
  if (delta < -2) return "declined";
  return "stable";
}

function daysSince(iso: string | undefined, now: number): number {
  return iso ? Math.round((now - new Date(iso).getTime()) / DAY) : Infinity;
}

function activeMilestoneFor(input: ReviewInput, projectId: string): Milestone | undefined {
  const ms = input.milestones.filter((m) => m.projectId === projectId);
  return ms.find((m) => m.status === "active") ?? ms[0];
}

function progressOf(milestone: Milestone | undefined, tasks: Task[], now: Date): number {
  if (!milestone) return 0;
  const mt = tasks.filter((t) => t.milestoneId === milestone.id);
  const stats = taskStats(mt, now);
  return stats.total ? stats.progress : milestone.progress;
}

export function generateWeeklyReview(
  input: ReviewInput,
  periodKey: ReviewPeriodKey = "7d",
  now: Date = studioNow()
): WeeklyReview {
  const nowMs = now.getTime();
  const startMs = nowMs - periodDays(periodKey) * DAY;
  const start = new Date(startMs);
  const inWindow = (iso?: string) => !!iso && new Date(iso).getTime() >= startMs && new Date(iso).getTime() <= nowMs;
  const beforeWindow = (iso?: string) => !!iso && new Date(iso).getTime() < startMs;

  // --- As-of reconstruction of the period start (roll back this period's work) ---
  const previousTasks: Task[] = input.tasks.map((t) =>
    t.status === "completed" && inWindow(t.completedAt)
      ? { ...t, status: "todo" as const, completedAt: undefined }
      : t
  );
  const previousActivity = input.activity.filter((a) => beforeWindow(a.whenIso));
  const previousDecisions = input.decisions.filter((d) => beforeWindow(d.dateIso));

  const currentHealth = computeHealth(input, now);
  const previousHealth = computeHealth(
    { ...input, tasks: previousTasks, activity: previousActivity, decisions: previousDecisions },
    start
  );
  const curById = new Map(currentHealth.map((h) => [h.project.id, h]));
  const prevById = new Map(previousHealth.map((h) => [h.project.id, h]));

  const momentumReasonText = (h?: ProjectHealth) =>
    h?.categories.find((c) => c.category === "momentum")?.reason.text ?? "No recent activity";

  // --- Per-project reviews + health changes + milestone progress ---
  const projects: ProjectReview[] = [];
  const healthChanges: HealthChange[] = [];
  const milestones: MilestoneProgress[] = [];
  const momentumPoints: MomentumPoint[] = [];

  for (const p of input.projects) {
    const cur = curById.get(p.id);
    const prev = prevById.get(p.id);
    const healthCurrent = cur?.score ?? 0;
    const healthPrevious = prev?.score ?? healthCurrent;
    const healthDelta = healthCurrent - healthPrevious;

    const milestone = activeMilestoneFor(input, p.id);
    const milestoneProgressCurrent = progressOf(milestone, input.tasks, now);
    const milestoneProgressPrevious = progressOf(milestone, previousTasks, start);
    const milestoneProgressDelta = milestoneProgressCurrent - milestoneProgressPrevious;

    const tasksCompleted = input.tasks.filter(
      (t) => t.projectId === p.id && t.status === "completed" && inWindow(t.completedAt)
    ).length;
    const newDecisions = input.decisions.filter((d) => d.projectId === p.id && inWindow(d.dateIso)).length;
    const signalCount = (input.generatedSignals ?? []).filter(
      (s) => s.projectId === p.id && (s.severity === "warning" || s.severity === "critical")
    ).length;

    const hasActiveMilestone = input.milestones.some((m) => m.projectId === p.id && m.status === "active");
    const status = verdict(healthCurrent, healthDelta, signalCount, tasksCompleted, hasActiveMilestone);

    projects.push({
      projectId: p.id,
      projectName: p.name,
      healthPrevious,
      healthCurrent,
      healthDelta,
      healthDirection: direction(healthDelta),
      tasksCompleted,
      milestoneTitle: milestone?.title,
      milestoneProgressPrevious,
      milestoneProgressCurrent,
      milestoneProgressDelta,
      newDecisions,
      signalCount,
      status,
    });

    healthChanges.push({
      projectId: p.id,
      projectName: p.name,
      previous: healthPrevious,
      current: healthCurrent,
      delta: healthDelta,
      direction: direction(healthDelta),
    });

    if (milestone) {
      milestones.push({
        projectId: p.id,
        projectName: p.name,
        title: milestone.title,
        previous: milestoneProgressPrevious,
        current: milestoneProgressCurrent,
        delta: milestoneProgressDelta,
      });
    }

    momentumPoints.push({
      projectId: p.id,
      projectName: p.name,
      score: cur?.momentum ?? 0,
      reason: momentumReasonText(cur),
    });
  }

  // --- Task summary (created/reopened aren't time-stamped in the data → 0) ---
  const tasks = {
    completed: projects.reduce((n, pr) => n + pr.tasksCompleted, 0),
    created: 0,
    blocked: input.tasks.filter((t) => t.status === "blocked").length,
    reopened: 0,
  };

  // --- Roadmap summary (no per-item change history → composition + empty moves) ---
  const roadmap = {
    now: input.roadmap.filter((r) => r.column === "now").length,
    next: input.roadmap.filter((r) => r.column === "next").length,
    later: input.roadmap.filter((r) => r.column === "later").length,
    movements: [] as string[],
  };

  // --- Decision summary (new this period) ---
  const projectName = (id?: string) => input.projects.find((p) => p.id === id)?.name ?? "Studio";
  const decisions: DecisionSummaryItem[] = input.decisions
    .filter((d) => inWindow(d.dateIso))
    .sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1))
    .map((d) => ({ projectName: projectName(d.projectId), title: d.title, status: d.status, isNew: true }));

  // --- Signals summary (grouped by severity; meaningful items only, capped) ---
  const signals = summarizeSignals(input.generatedSignals ?? [], projectName);

  // --- Activity summary ---
  const commits = input.github
    ? Object.values(input.github).reduce((n, g) => n + (g.commitsThisWeek ?? 0), 0)
    : input.activity.filter((a) => a.kind === "commit" && inWindow(a.whenIso)).length;
  const deployments = input.activity.filter((a) => a.kind === "deploy" && inWindow(a.whenIso)).length;
  const milestoneUpdates = milestones.filter((m) => m.delta !== 0).length;
  const activity = {
    commits,
    deployments,
    milestoneUpdates,
    total: input.activity.filter((a) => inWindow(a.whenIso)).length,
  };

  // --- Momentum analysis ---
  const sortedMomentum = [...momentumPoints].sort((a, b) => b.score - a.score || a.projectId.localeCompare(b.projectId));
  const strongest = sortedMomentum[0];
  const weakest = sortedMomentum[sortedMomentum.length - 1];

  // --- Recommendation (exactly one) ---
  const recommendation = recommend(input, projects, curById, nowMs);

  // --- Quiet-week detection ---
  const warningCount = (input.generatedSignals ?? []).filter(
    (s) => s.severity === "warning" || s.severity === "critical"
  ).length;
  const quiet =
    tasks.completed === 0 &&
    decisions.length === 0 &&
    milestones.every((m) => m.delta === 0) &&
    warningCount === 0;

  // --- Executive summary (chief-of-staff voice) ---
  const executiveSummary = quiet
    ? ["Quiet week.", "No major changes were recorded across the portfolio."]
    : buildExecutiveSummary(projects, milestones, warningCount);

  const periodStartIso = start.toISOString();
  const periodEndIso = now.toISOString();

  return {
    id: `review-${periodStartIso.slice(0, 10)}-${periodEndIso.slice(0, 10)}`,
    periodKey,
    periodStartIso,
    periodEndIso,
    generatedAtIso: now.toISOString(),
    executiveSummary,
    recommendation,
    projects,
    healthChanges,
    tasks,
    milestones,
    roadmap,
    decisions,
    signals,
    activity,
    momentum: { strongest, weakest },
    quiet,
  };
}

function verdict(
  health: number,
  delta: number,
  signalCount: number,
  tasksCompleted: number,
  hasActiveMilestone: boolean
): string {
  if (!hasActiveMilestone) return "No active milestone.";
  if (health < 50 || (delta < -2 && signalCount > 0)) return "Attention recommended.";
  if (delta < -2) return "Cooling off.";
  if (delta > 2 || tasksCompleted > 0) return "Healthy momentum.";
  return "Steady.";
}

function summarizeSignals(
  generated: GeneratedSignal[],
  projectName: (id?: string) => string
): SignalSummaryGroup[] {
  const order: SignalSeverity[] = ["critical", "warning", "watch", "info"];
  const itemCap: Record<SignalSeverity, number> = { critical: 6, warning: 5, watch: 3, info: 2 };
  const groups: SignalSummaryGroup[] = [];
  for (const severity of order) {
    const all = generated.filter((s) => s.severity === severity);
    if (all.length === 0) continue;
    groups.push({
      severity,
      count: all.length,
      items: all.slice(0, itemCap[severity]).map((s) => ({
        projectName: s.projectId ? projectName(s.projectId) : undefined,
        title: s.title,
      })),
    });
  }
  return groups;
}

function buildExecutiveSummary(
  projects: ProjectReview[],
  milestones: MilestoneProgress[],
  warningCount: number
): string[] {
  const out: string[] = [];

  const primary = [...projects].sort(
    (a, b) => b.tasksCompleted - a.tasksCompleted || b.healthDelta - a.healthDelta
  )[0];
  if (primary && primary.tasksCompleted > 0) {
    out.push(`This week focused primarily on ${primary.projectName}.`);
  } else {
    out.push("Work was spread thin this week, with no single project taking the lead.");
  }

  const topMilestone = [...milestones].sort((a, b) => b.delta - a.delta)[0];
  if (topMilestone && topMilestone.delta > 0) {
    out.push(
      `${topMilestone.title} progressed from ${topMilestone.previous}% to ${topMilestone.current}%.`
    );
  }

  const decline = [...projects].sort((a, b) => a.healthDelta - b.healthDelta)[0];
  if (decline && decline.healthDelta < -2) {
    out.push(`${decline.projectName} showed declining momentum.`);
  }

  out.push(
    warningCount > 0
      ? `${warningCount === 1 ? "One" : warningCount} operational warning${plural(warningCount)} require${warningCount === 1 ? "s" : ""} attention.`
      : "No operational warnings need attention."
  );

  return out;
}

/**
 * The recommendation engine — exactly one "Recommended Focus". Unlike the Focus
 * Engine (which surfaces the highest-leverage place to ship), this surfaces the
 * project that most needs *intervention*: declining health, no active milestone,
 * inactivity, or critical operational signals. Deterministic; ties break by id.
 */
function recommend(
  input: ReviewInput,
  projects: ProjectReview[],
  curById: Map<string, ProjectHealth>,
  nowMs: number
): FocusRecommendation {
  let best: { projectId: string; projectName: string; score: number; reasons: string[] } | undefined;

  for (const pr of projects) {
    const reasons: string[] = [];
    let score = (100 - pr.healthCurrent) * 0.5;

    const hasActiveMilestone = input.milestones.some(
      (m) => m.projectId === pr.projectId && m.status === "active"
    );
    if (!hasActiveMilestone) {
      score += 35;
      reasons.push("no active milestone");
    }

    if (pr.healthDelta < -2) {
      score += 25 + Math.min(Math.abs(pr.healthDelta), 20);
      reasons.push("declining health score");
    }

    // Idle: newest of project activity, project last-activity, GitHub, Vercel.
    const p = input.projects.find((x) => x.id === pr.projectId);
    const idleIsos = [
      ...input.activity.filter((a) => a.projectId === pr.projectId).map((a) => a.whenIso),
      p?.lastActivityIso,
      input.github?.[pr.projectId]?.lastActivityIso,
      input.vercel?.[pr.projectId]?.lastReadyIso,
    ].filter(Boolean) as string[];
    const newest = idleIsos.sort().slice(-1)[0];
    const idle = daysSince(newest, nowMs);
    if (idle >= 14) {
      score += 30;
      reasons.push(`no activity in ${idle} days`);
    } else if (idle >= 7) {
      score += 12;
      reasons.push("slowing activity");
    }

    const criticalSignals = (input.generatedSignals ?? []).filter(
      (s) => s.projectId === pr.projectId && s.severity === "critical"
    ).length;
    if (criticalSignals > 0) {
      score += Math.min(criticalSignals * 18, 40);
      reasons.push(`${criticalSignals} critical signal${plural(criticalSignals)}`);
    }

    if (!best || score > best.score || (score === best.score && pr.projectId < best.projectId)) {
      best = { projectId: pr.projectId, projectName: pr.projectName, score, reasons };
    }
  }

  if (!best) {
    return { projectId: "", projectName: "Studio", reason: "Focus on advancing an active milestone." };
  }

  const reason =
    best.reasons.length > 0
      ? cap(best.reasons.join(", ")) + "."
      : "Advance the active milestone to keep momentum.";
  return { projectId: best.projectId, projectName: best.projectName, reason };
}
