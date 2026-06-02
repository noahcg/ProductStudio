import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Project,
  Milestone,
  Task,
  RoadmapItem,
  Decision,
  Activity,
  Signal,
  Integration,
  Expense,
  Domain,
  SpendTrendPoint,
} from "../domain";
import { daysUntil } from "../utils";
import type { DataSource } from "./source";

/**
 * Database-backed data source. Maps Supabase rows (Phase 2.3 schema) into the
 * Phase 2.2 domain models.
 *
 * Key detail: the domain entity `id` is the project/milestone **slug**, and
 * child entities reference their parent by slug — preserving every cross-
 * reference the UI relies on (e.g. `/focus?project=home-cooked`). Slugs are
 * pulled via PostgREST nested selects (`project:projects(slug)`).
 */
type Row = Record<string, unknown>;

function s(v: unknown): string {
  return (v ?? "") as string;
}
function opt(v: unknown): string | undefined {
  return v == null ? undefined : (v as string);
}
function nested(row: Row, key: string): string | undefined {
  const rel = row[key] as { slug?: string } | null | undefined;
  return rel?.slug;
}

function mapProject(r: Row): Project {
  return {
    id: s(r.slug),
    name: s(r.name),
    tagline: s(r.tagline),
    status: r.status as Project["status"],
    progress: Number(r.progress ?? 0),
    nextMilestone: s(r.next_milestone),
    openTasks: Number(r.open_tasks ?? 0),
    blockers: Number(r.blockers ?? 0),
    lastActivityIso: s(r.last_activity_at),
    accent: r.accent as Project["accent"],
    icon: r.icon as Project["icon"],
    repo: opt(r.repo),
    domain: opt(r.primary_domain),
  };
}

function mapMilestone(r: Row): Milestone {
  return {
    id: s(r.slug),
    projectId: nested(r, "project") ?? "",
    title: s(r.title),
    summary: s(r.summary),
    priority: r.priority as Milestone["priority"],
    progress: Number(r.progress ?? 0),
    status: r.status as Milestone["status"],
  };
}

function mapTask(r: Row): Task {
  return {
    id: s(r.id),
    projectId: nested(r, "project") ?? "",
    milestoneId: nested(r, "milestone"),
    label: s(r.label),
    state: r.state as Task["state"],
    estimate: opt(r.estimate),
  };
}

function mapRoadmap(r: Row): RoadmapItem {
  return {
    id: s(r.id),
    projectId: nested(r, "project") ?? "",
    milestoneId: nested(r, "milestone"),
    title: s(r.title),
    column: r.column_key as RoadmapItem["column"],
    effort: r.effort as RoadmapItem["effort"],
    tag: opt(r.tag),
  };
}

function mapDecision(r: Row): Decision {
  return {
    id: s(r.id),
    projectId: nested(r, "project"),
    title: s(r.title),
    status: r.status as Decision["status"],
    dateIso: s(r.dated_at),
    rationale: s(r.rationale),
    options: (r.options as string[] | null) ?? undefined,
    chosen: opt(r.chosen),
  };
}

function mapActivity(r: Row): Activity {
  return {
    id: s(r.id),
    projectId: nested(r, "project"),
    integration: (opt(r.integration_key) as Activity["integration"]) ?? undefined,
    kind: r.kind as Activity["kind"],
    title: s(r.title),
    whenIso: s(r.occurred_at),
    ok: (r.ok as boolean | null) ?? undefined,
  };
}

function mapSignal(r: Row): Signal {
  return {
    id: s(r.id),
    projectId: nested(r, "project"),
    integration: r.integration_key as Signal["integration"],
    service: s(r.service),
    detail: s(r.detail),
    level: r.level as Signal["level"],
  };
}

function mapExpense(r: Row): Expense {
  return {
    id: s(r.id),
    projectId: nested(r, "project"),
    integration: (opt(r.integration_key) as Expense["integration"]) ?? undefined,
    service: s(r.service),
    category: r.category as Expense["category"],
    amount: Number(r.amount ?? 0),
  };
}

function mapDomain(r: Row): Domain {
  return {
    id: s(r.id),
    projectId: nested(r, "project") ?? "",
    name: s(r.name),
    registrar: opt(r.registrar),
    integration: (opt(r.integration_key) as Domain["integration"]) ?? undefined,
    expiresInDays: r.expires_at ? daysUntil(s(r.expires_at)) : undefined,
    status: r.status as Domain["status"],
  };
}

function mapIntegration(r: Row): Integration {
  return {
    key: r.key as Integration["key"],
    name: s(r.name),
    category: r.category as Integration["category"],
    connected: Boolean(r.connected),
    detail: s(r.detail),
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function supabaseSource(sb: SupabaseClient): DataSource {
  async function rows(
    table: string,
    select: string,
    order: { column: string; ascending?: boolean }
  ): Promise<Row[]> {
    const { data, error } = await sb
      .from(table)
      .select(select)
      .order(order.column, { ascending: order.ascending ?? true });
    if (error) throw error;
    return (data ?? []) as unknown as Row[];
  }

  return {
    kind: "supabase",

    async projects() {
      return (await rows("projects", "*", { column: "position" })).map(mapProject);
    },
    async milestones() {
      return (await rows("milestones", "*, project:projects(slug)", { column: "slug" })).map(mapMilestone);
    },
    async tasks() {
      return (
        await rows("tasks", "*, project:projects(slug), milestone:milestones(slug)", { column: "position" })
      ).map(mapTask);
    },
    async roadmap() {
      return (
        await rows("roadmap_items", "*, project:projects(slug), milestone:milestones(slug)", { column: "position" })
      ).map(mapRoadmap);
    },
    async decisions() {
      return (await rows("decisions", "*, project:projects(slug)", { column: "position" })).map(mapDecision);
    },
    async activity() {
      return (
        await rows("activity_items", "*, project:projects(slug)", { column: "occurred_at", ascending: false })
      ).map(mapActivity);
    },
    async signals() {
      return (await rows("signals", "*, project:projects(slug)", { column: "position" })).map(mapSignal);
    },
    async integrations() {
      return (await rows("integrations", "*", { column: "position" })).map(mapIntegration);
    },
    async expenses() {
      return (await rows("expenses", "*, project:projects(slug)", { column: "position" })).map(mapExpense);
    },
    async domains() {
      return (await rows("domains", "*, project:projects(slug)", { column: "name" })).map(mapDomain);
    },

    async spendTrend(): Promise<SpendTrendPoint[]> {
      const { data, error } = await sb
        .from("expense_snapshots")
        .select("amount, period_start")
        .order("period_start", { ascending: true });
      if (error) throw error;

      // Sum the (possibly itemized) rows per period into one trend point.
      const totals = new Map<string, number>();
      for (const r of (data ?? []) as unknown as Row[]) {
        const period = s(r.period_start);
        totals.set(period, (totals.get(period) ?? 0) + Number(r.amount ?? 0));
      }
      return [...totals.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([period, amount]) => ({
          month: MONTHS[parseInt(period.slice(5, 7), 10) - 1] ?? period,
          amount: Math.round(amount * 100) / 100,
        }));
    },
  };
}
