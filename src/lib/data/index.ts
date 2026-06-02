/**
 * Product Studio data layer (repository seam).
 *
 * Phase 2.4: backed by Supabase when configured, otherwise by local mock
 * fixtures (see `source.ts` / `mock-source.ts` / `supabase-source.ts`). Every
 * accessor keeps the exact signature the UI already imports, so components are
 * untouched. Cross-entity views (focus, spend aggregate, studio stats) are
 * derived here on top of the active source.
 *
 * Derived studio chrome with no table — `getAlerts`, `getProfile`,
 * `getWeeklySummary` — remains backed by fixtures by design (single-user;
 * alerts are a derived "needs attention" view). These are documented in the
 * schema reference as intentionally untabled.
 */
import type {
  Project,
  Milestone,
  Task,
  Domain,
  Focus,
  Decision,
  DecisionInput,
  RoadmapItem,
  Signal,
  Integration,
  Activity,
  Alert,
  Expense,
  SpendCategoryName,
  SpendTrendPoint,
  Spend,
  Profile,
  WeeklySummary,
  StudioStats,
} from "../domain";
import { categoryColor } from "../constants/palette";
import { topRecommendation } from "../recommend";
import { withSource, activeSource } from "./source";
import { alerts } from "./alerts";
import { profile, weeklySummary } from "./profile";

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

// ---- Projects ----

export async function getProjects(): Promise<Project[]> {
  return withSource((s) => s.projects());
}

export async function getProject(id?: string): Promise<Project | undefined> {
  return withSource(async (s) => (await s.projects()).find((p) => p.id === id));
}

/** Convenience map for screens that resolve many project references at once. */
export async function getProjectMap(): Promise<Map<string, Project>> {
  return withSource(async (s) => new Map((await s.projects()).map((p) => [p.id, p])));
}

// ---- Milestones (owned by projects) ----

export async function getMilestones(): Promise<Milestone[]> {
  return withSource((s) => s.milestones());
}

export async function getMilestonesForProject(projectId: string): Promise<Milestone[]> {
  return withSource(async (s) => (await s.milestones()).filter((m) => m.projectId === projectId));
}

// ---- Tasks (owned by projects / milestones) ----

export async function getTasks(): Promise<Task[]> {
  return withSource((s) => s.tasks());
}

export async function getTasksForMilestone(milestoneId: string): Promise<Task[]> {
  return withSource(async (s) => (await s.tasks()).filter((t) => t.milestoneId === milestoneId));
}

// ---- Domains (owned by projects) ----

export async function getDomains(): Promise<Domain[]> {
  return withSource((s) => s.domains());
}

// ---- Focus (derived view: top project's active milestone + its tasks) ----

const EMPTY_FOCUS: Focus = {
  projectId: "",
  title: "No active focus",
  priority: "Medium",
  summary: "",
  progress: 0,
  tasks: [],
};

export async function getFocus(): Promise<Focus> {
  return withSource(async (s) => {
    const [projects, milestones, tasks] = await Promise.all([s.projects(), s.milestones(), s.tasks()]);
    const top = topRecommendation(projects, alerts)?.project;
    if (!top) return EMPTY_FOCUS;

    const milestone = milestones.find((m) => m.projectId === top.id);
    if (!milestone) {
      return { ...EMPTY_FOCUS, projectId: top.id, title: top.name };
    }
    return {
      projectId: top.id,
      title: `${top.name} — ${milestone.title}`,
      priority: milestone.priority,
      summary: milestone.summary,
      progress: milestone.progress,
      tasks: tasks.filter((t) => t.milestoneId === milestone.id),
    };
  });
}

// ---- Decisions ----

export async function getDecisions(): Promise<Decision[]> {
  return withSource((s) => s.decisions());
}

// Writes go to the active source only (no silent mock fallback — a failed DB
// write should surface so the UI can show an error).
export async function createDecision(input: DecisionInput): Promise<Decision> {
  return activeSource().createDecision(input);
}

export async function updateDecision(id: string, input: DecisionInput): Promise<Decision> {
  return activeSource().updateDecision(id, input);
}

export async function deleteDecision(id: string): Promise<void> {
  return activeSource().deleteDecision(id);
}

// ---- Roadmap ----

export async function getRoadmap(): Promise<RoadmapItem[]> {
  return withSource((s) => s.roadmap());
}

// ---- Signals / integrations / activity ----

export async function getSignals(): Promise<Signal[]> {
  return withSource((s) => s.signals());
}

export async function getIntegrations(): Promise<Integration[]> {
  return withSource((s) => s.integrations());
}

export async function getActivity(): Promise<Activity[]> {
  return withSource((s) => s.activity());
}

// ---- Alerts (derived "needs attention" view; no table — fixture by design) ----

export async function getAlerts(): Promise<Alert[]> {
  return alerts;
}

// ---- Money ----

const SPEND_CATEGORIES: { name: SpendCategoryName; color: string }[] = [
  { name: "Hosting", color: categoryColor.hosting },
  { name: "AI Tools", color: categoryColor.ai },
  { name: "Domains", color: categoryColor.domains },
];

export async function getExpenses(): Promise<Expense[]> {
  return withSource((s) => s.expenses());
}

export async function getSpend(): Promise<Spend> {
  return withSource(async (s) => {
    const expenses = await s.expenses();
    const categories = SPEND_CATEGORIES.map((c) => ({
      label: c.name,
      amount: round2(sum(expenses.filter((e) => e.category === c.name).map((e) => e.amount))),
      color: c.color,
    })).filter((c) => c.amount > 0);
    return { categories, total: round2(sum(expenses.map((e) => e.amount))) };
  });
}

export async function getSpendTrend(): Promise<SpendTrendPoint[]> {
  return withSource((s) => s.spendTrend());
}

// ---- Profile / studio summary (single-user chrome; no tables) ----

export async function getProfile(): Promise<Profile> {
  return profile;
}

export async function getWeeklySummary(): Promise<WeeklySummary> {
  return weeklySummary;
}

export async function getStudioStats(): Promise<StudioStats> {
  return withSource(async (s) => {
    const [projects, expenses] = await Promise.all([s.projects(), s.expenses()]);
    return {
      projects: projects.length,
      active: projects.filter((p) => p.status === "Active").length,
      needsAttention: alerts.filter((a) => a.kind === "stale" || a.kind === "blocker").length,
      monthlySpend: round2(sum(expenses.map((e) => e.amount))),
    };
  });
}
