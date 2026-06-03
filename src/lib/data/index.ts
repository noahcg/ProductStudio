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
  TaskInput,
  TaskStatus,
  Domain,
  Focus,
  Decision,
  DecisionInput,
  RoadmapItem,
  RoadmapInput,
  RoadmapPlacement,
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
import { computeFocus, type FocusInput, type FocusResult } from "../focus/engine";
import { computeHealth, type ProjectHealth } from "../health/engine";
import { computeSignals, type GeneratedSignal } from "../signals/engine";
import { getGitHub } from "../integrations/github/provider";
import type { GitHubProjectStatus } from "../integrations/github/types";
import { getVercel } from "../integrations/vercel/provider";
import type { VercelProjectStatus, DeploymentHealth } from "../integrations/vercel/types";
import { getSupabase } from "../integrations/supabase/provider";
import type { SupabaseProjectStatus, SupabaseHealth } from "../integrations/supabase/types";
import { computeDomainSignals, domainHealthByProject, type DomainHealth } from "../domains/monitor";
import { generateWeeklyReview } from "../review/engine";
import type { WeeklyReview, StoredReview, ReviewPeriodKey } from "../review/types";
import { withSource, activeSource } from "./source";
import type { DataSource } from "./source";
import { alerts } from "./alerts";
import { profile, weeklySummary } from "./profile";
import { storedReviews } from "./reviews";

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

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  return withSource(async (s) => (await s.tasks()).filter((t) => t.projectId === projectId));
}

export async function createTask(input: TaskInput): Promise<Task> {
  return activeSource().createTask(input);
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  return activeSource().updateTask(id, input);
}

export async function deleteTask(id: string): Promise<void> {
  return activeSource().deleteTask(id);
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return activeSource().setTaskStatus(id, status);
}

// ---- Domains (owned by projects) ----

export async function getDomains(): Promise<Domain[]> {
  return withSource((s) => s.domains());
}

export async function getDomainsForProject(projectId: string): Promise<Domain[]> {
  return withSource(async (s) => (await s.domains()).filter((d) => d.projectId === projectId));
}

/** Per-project worst domain health, for the Studio cards. */
export async function getDomainHealthByProject(): Promise<Record<string, DomainHealth>> {
  return withSource(async (s) => domainHealthByProject(await s.domains()));
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

/**
 * Gather every input the Signals → Health → Focus pipeline needs, then run the
 * Signals Engine once so its output feeds Health and Focus.
 */
async function pipeline(
  s: DataSource
): Promise<FocusInput & { generatedSignals: GeneratedSignal[] }> {
  const [projects, milestones, roadmap, tasks, decisions, baseActivity, signals, expenses, domains] =
    await Promise.all([
      s.projects(),
      s.milestones(),
      s.roadmap(),
      s.tasks(),
      s.decisions(),
      s.activity(),
      s.signals(),
      s.expenses(),
      s.domains(),
    ]);

  // Integrations: augment the activity feed, signals, and health. Integrations
  // are never the source of truth for the domain entities above.
  const [github, vercel, supabase] = await Promise.all([
    getGitHub(projects),
    getVercel(projects),
    getSupabase(projects),
  ]);
  const activity = mergeActivity(baseActivity, [...github.events, ...vercel.events, ...supabase.events]);
  const generatedSignals = [
    ...computeSignals({ projects, milestones, roadmap, tasks, decisions, activity, expenses }),
    ...computeDomainSignals(domains), // domain monitoring
    ...github.signals,
    ...vercel.signals, // vercel deployment monitoring
    ...supabase.signals, // supabase operational monitoring
  ];

  return {
    projects,
    milestones,
    roadmap,
    tasks,
    decisions,
    activity,
    signals,
    generatedSignals,
    github: github.statuses,
    vercel: vercel.statuses,
    supabase: supabase.statuses,
  };
}

/** Merge integration-sourced activity into the feed (newest first, deduped). */
function mergeActivity(base: Activity[], extra: Activity[]): Activity[] {
  const byId = new Map<string, Activity>();
  for (const a of [...base, ...extra]) byId.set(a.id, a);
  return [...byId.values()].sort((a, b) => (a.whenIso < b.whenIso ? 1 : -1));
}

/** Operational signals generated from Product Studio's own data + integrations. */
export async function getGeneratedSignals(): Promise<GeneratedSignal[]> {
  return withSource(async (s) => (await pipeline(s)).generatedSignals);
}

/** Lightweight per-project GitHub status for the Studio cards. */
export async function getGitHubStatuses(): Promise<Record<string, GitHubProjectStatus>> {
  return withSource(async (s) => getGitHub(await s.projects()).then((g) => g.statuses));
}

/** Lightweight per-project Vercel deployment status for the Studio cards. */
export async function getVercelStatuses(): Promise<Record<string, VercelProjectStatus>> {
  return withSource(async (s) => getVercel(await s.projects()).then((v) => v.statuses));
}

/** Per-project deployment health (Healthy/Warning/Critical) for the Studio cards. */
export async function getDeploymentHealthByProject(): Promise<Record<string, DeploymentHealth>> {
  return withSource(async (s) => {
    const { statuses } = await getVercel(await s.projects());
    const out: Record<string, DeploymentHealth> = {};
    for (const [projectId, st] of Object.entries(statuses)) {
      if (st.connected) out[projectId] = st.health;
    }
    return out;
  });
}

/** Lightweight per-project Supabase operational status for the Studio cards + Focus. */
export async function getSupabaseStatuses(): Promise<Record<string, SupabaseProjectStatus>> {
  return withSource(async (s) => getSupabase(await s.projects()).then((sb) => sb.statuses));
}

/** Per-project Supabase health (Healthy/Warning/Critical) for the Studio cards. */
export async function getSupabaseHealthByProject(): Promise<Record<string, SupabaseHealth>> {
  return withSource(async (s) => {
    const { statuses } = await getSupabase(await s.projects());
    const out: Record<string, SupabaseHealth> = {};
    for (const [projectId, st] of Object.entries(statuses)) {
      if (st.connected) out[projectId] = st.health;
    }
    return out;
  });
}

// ---- Weekly Founder Review (deterministic synthesis; no AI) ----

/**
 * Generate the current Weekly Founder Review from existing Product Studio data
 * (the full Signals → Health pipeline + integrations). Deterministic: same data
 * + clock → identical review. Default period is the last 7 days.
 */
export async function getWeeklyReview(periodKey: ReviewPeriodKey = "7d"): Promise<WeeklyReview> {
  return withSource(async (s) => generateWeeklyReview(await pipeline(s), periodKey));
}

/**
 * Previously-generated reviews (history). Mock mode returns the stored fixture;
 * Supabase mode would read the `reviews` table. The current review is generated
 * live by `getWeeklyReview`.
 */
export async function getReviewHistory(): Promise<StoredReview[]> {
  return storedReviews;
}

/** Full Focus Engine result — current focus, ranking, scores, reasons. */
export async function getFocusResult(): Promise<FocusResult> {
  return withSource(async (s) => computeFocus(await pipeline(s)));
}

/** Project Health Engine result — per-project score, status, category breakdown. */
export async function getProjectHealth(): Promise<ProjectHealth[]> {
  return withSource(async (s) => computeHealth(await pipeline(s)));
}

/** The Current Focus, shaped as the Focus view the Studio/Focus panels render. */
export async function getFocus(): Promise<Focus> {
  return withSource(async (s) => {
    const input = await pipeline(s);
    const cur = computeFocus(input).current;
    if (!cur) return EMPTY_FOCUS;
    if (!cur.milestone) return { ...EMPTY_FOCUS, projectId: cur.project.id, title: cur.project.name };
    return {
      projectId: cur.project.id,
      title: `${cur.project.name} — ${cur.milestone.title}`,
      priority: cur.milestone.priority,
      summary: cur.milestone.summary,
      progress: cur.milestone.progress,
      tasks: input.tasks.filter((t) => t.milestoneId === cur.milestone!.id),
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

export async function createRoadmapItem(input: RoadmapInput): Promise<RoadmapItem> {
  return activeSource().createRoadmapItem(input);
}

export async function updateRoadmapItem(id: string, input: RoadmapInput): Promise<RoadmapItem> {
  return activeSource().updateRoadmapItem(id, input);
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  return activeSource().deleteRoadmapItem(id);
}

export async function setRoadmapPlacement(placements: RoadmapPlacement[]): Promise<void> {
  return activeSource().setRoadmapPlacement(placements);
}

// ---- Signals / integrations / activity ----

export async function getSignals(): Promise<Signal[]> {
  return withSource((s) => s.signals());
}

export async function getIntegrations(): Promise<Integration[]> {
  return withSource((s) => s.integrations());
}

export async function getActivity(): Promise<Activity[]> {
  return withSource(async (s) => {
    const projects = await s.projects();
    const [base, github, vercel, supabase] = await Promise.all([
      s.activity(),
      getGitHub(projects),
      getVercel(projects),
      getSupabase(projects),
    ]);
    return mergeActivity(base, [...github.events, ...vercel.events, ...supabase.events]);
  });
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
