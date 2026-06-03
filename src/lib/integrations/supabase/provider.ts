import { cache } from "react";
import type { Activity, Project } from "@/lib/domain";
import type { GeneratedSignal, SignalSeverity } from "@/lib/signals/engine";
import { now as studioNow } from "@/lib/clock";
import { supabaseMode, supabaseProjectsForProject, SUPABASE_THRESHOLDS } from "./config";
import { mockSupabaseSnapshot } from "./mock";
import { liveSupabaseSnapshot } from "./client";
import type {
  SupabaseSnapshot,
  SupabaseProjectState,
  SupabaseHealth,
  SupabaseProjectStatus,
  SupabaseResult,
  UsageMetric,
} from "./types";

type MetricKind = "database" | "storage" | "bandwidth";
const METRIC_LABEL: Record<MetricKind, string> = {
  database: "Database",
  storage: "Storage",
  bandwidth: "Bandwidth",
};
const METRIC_TYPE: Record<MetricKind, GeneratedSignal["type"]> = {
  database: "supabase_database_usage",
  storage: "supabase_storage_usage",
  bandwidth: "supabase_bandwidth_usage",
};

const STATE_RANK: Record<SupabaseProjectState, number> = {
  unavailable: 3,
  degraded: 2,
  unknown: 1,
  healthy: 0,
};

/** Severity for a usage percent against a {watch,warning,critical} threshold set. */
function metricSeverity(percent: number, t: { watch: number; warning: number; critical: number }): SignalSeverity | undefined {
  if (percent >= t.critical) return "critical";
  if (percent >= t.warning) return "warning";
  if (percent >= t.watch) return "watch";
  return undefined;
}

/** Pick the higher-percent metric across snapshots (supports many Supabase projects). */
function maxMetric(metrics: (UsageMetric | undefined)[]): UsageMetric | undefined {
  return metrics.filter((m): m is UsageMetric => !!m).sort((a, b) => b.percent - a.percent)[0];
}

function healthFrom(hasCritical: boolean, hasWarning: boolean): SupabaseHealth {
  if (hasCritical) return "Critical";
  if (hasWarning) return "Warning";
  return "Healthy";
}

function statusLabel(state: SupabaseProjectState, headline?: string): string {
  if (state === "unavailable") return "Unavailable";
  if (state === "degraded") return "Degraded";
  if (headline) return headline[0].toUpperCase() + headline.slice(1);
  return "Healthy";
}

/**
 * The Supabase monitoring provider — fetches usage metadata (live or mock), maps
 * it into Product Studio's activity feed + signals, and derives a per-project
 * operational status. Supabase never owns domain data; this only augments
 * activity/signals/health ("can my products operate safely and reliably?").
 *
 * Cached per request so the multiple readers (feed, signals, health, cards)
 * share one fetch.
 */
export const getSupabase = cache(async (projects: Project[]): Promise<SupabaseResult> => {
  const mode = supabaseMode();
  if (mode === "off") {
    return { mode, events: [], signals: [], statuses: {} };
  }

  const createdAt = studioNow().toISOString();
  const events: Activity[] = [];
  const signals: GeneratedSignal[] = [];
  const statuses: Record<string, SupabaseProjectStatus> = {};

  const sig = (
    type: GeneratedSignal["type"],
    severity: SignalSeverity,
    projectId: string | undefined,
    title: string,
    description: string,
    recommendation: string,
    metadata?: Record<string, unknown>
  ) =>
    signals.push({
      id: `${type}:${projectId ?? "studio"}`,
      projectId,
      type,
      severity,
      title,
      description,
      recommendation,
      source: "supabase_integration",
      createdAt,
      metadata,
    });

  try {
    for (const project of projects) {
      const supabaseProjects = supabaseProjectsForProject(project.id);

      // Missing mapping → INFO, no operational status surfaced on the card.
      if (supabaseProjects.length === 0) {
        statuses[project.id] = {
          projectId: project.id,
          connected: false,
          supabaseProjects: [],
          state: "unknown",
          health: "Healthy",
          label: "Not connected",
        };
        sig(
          "supabase_not_configured",
          "info",
          project.id,
          `${project.name} has no Supabase project`,
          "No Supabase project is configured, so platform health is unknown.",
          "Map a Supabase project to track operational health.",
          {}
        );
        continue;
      }

      const snapshots: SupabaseSnapshot[] = await Promise.all(
        supabaseProjects.map((p) =>
          mode === "live" ? liveSupabaseSnapshot(p) : Promise.resolve(mockSupabaseSnapshot(p))
        )
      );

      const errored = snapshots.filter((s) => s.error);
      const reachable = snapshots.filter((s) => !s.error);

      // All Supabase projects unreachable → connection failure (WARNING).
      if (reachable.length === 0) {
        statuses[project.id] = {
          projectId: project.id,
          connected: false,
          supabaseProjects,
          state: "unknown",
          health: "Warning",
          label: "Connection error",
        };
        sig(
          "supabase_connection_failure",
          "warning",
          project.id,
          `${project.name} Supabase metrics unavailable`,
          "Unable to retrieve Supabase metrics.",
          "Check the access token and Supabase project names.",
          { supabaseProjects, error: errored[0]?.error }
        );
        continue;
      }

      // Aggregate across the project's Supabase projects (worst state, peak usage).
      const state = reachable
        .map((s) => s.state)
        .sort((a, b) => STATE_RANK[b] - STATE_RANK[a])[0];
      const database = maxMetric(reachable.map((s) => s.database));
      const storage = maxMetric(reachable.map((s) => s.storage));
      const bandwidth = maxMetric(reachable.map((s) => s.bandwidth));
      const authUsers = reachable.reduce((n, s) => n + (s.authUsers ?? 0), 0) || undefined;
      const authGrowthPct = maxMetric(
        reachable.map((s) => (s.authGrowthPct != null ? { usage: "", percent: s.authGrowthPct } : undefined))
      )?.percent;

      let hasCritical = false;
      let hasWarning = false;
      let headline: string | undefined;
      const noteIssue = (sev: SignalSeverity, text: string) => {
        if (sev === "critical") hasCritical = true;
        else if (sev === "warning" || sev === "watch") hasWarning = true;
        // Keep the most severe headline.
        if (sev === "critical" || !headline) headline = text;
      };

      if (state === "unavailable") {
        hasCritical = true;
        headline = "project unavailable";
        sig(
          "supabase_project_unavailable",
          "critical",
          project.id,
          `${project.name} Supabase project is unavailable`,
          "The Supabase project is reporting an unavailable status.",
          "Investigate immediately — the product may be unable to operate.",
          { state }
        );
      } else {
        if (state === "degraded") {
          noteIssue("warning", "project degraded");
          sig(
            "supabase_project_degraded",
            "warning",
            project.id,
            `${project.name} Supabase project is degraded`,
            "The Supabase project is reporting degraded health.",
            "Check the Supabase status page and recent changes.",
            { state }
          );
        }

        const metrics: [MetricKind, UsageMetric | undefined][] = [
          ["database", database],
          ["storage", storage],
          ["bandwidth", bandwidth],
        ];
        for (const [kind, metric] of metrics) {
          if (!metric) continue;
          const sev = metricSeverity(metric.percent, SUPABASE_THRESHOLDS[kind]);
          if (!sev) continue;
          const label = METRIC_LABEL[kind];
          const title =
            sev === "critical"
              ? `${project.name} ${label.toLowerCase()} capacity nearly exhausted (${metric.percent}%)`
              : sev === "warning"
                ? `${project.name} ${label.toLowerCase()} usage is very high (${metric.percent}%)`
                : `${project.name} ${label.toLowerCase()} usage is high (${metric.percent}%)`;
          const recommendation =
            sev === "critical"
              ? `Free ${label.toLowerCase()} or upgrade the plan now — capacity is nearly exhausted.`
              : sev === "warning"
                ? `Free ${label.toLowerCase()} or plan an upgrade soon.`
                : `Keep an eye on ${label.toLowerCase()} growth.`;
          sig(METRIC_TYPE[kind], sev, project.id, title, `${label} usage is at ${metric.percent}% of the plan limit.`, recommendation, {
            kind,
            percent: metric.percent,
          });
          noteIssue(sev, `${kind} at ${metric.percent}%`);
        }
      }

      // --- Activity (one notable event per project; keeps the feed clean) ---
      if (state === "unavailable") {
        events.push({
          id: `sb-${project.id}-unavailable`,
          projectId: project.id,
          integration: "supabase",
          kind: "infra",
          title: "Supabase project unavailable",
          whenIso: createdAt,
          ok: false,
        });
      } else if (state === "degraded") {
        events.push({
          id: `sb-${project.id}-degraded`,
          projectId: project.id,
          integration: "supabase",
          kind: "infra",
          title: "Supabase project health degraded",
          whenIso: createdAt,
          ok: false,
        });
      } else {
        const worst = [
          ["Database", database] as const,
          ["Storage", storage] as const,
          ["Bandwidth", bandwidth] as const,
        ]
          .filter(([, m]) => m && m.percent >= SUPABASE_THRESHOLDS.database.watch)
          .sort((a, b) => (b[1]!.percent - a[1]!.percent))[0];
        if (worst) {
          events.push({
            id: `sb-${project.id}-${worst[0].toLowerCase()}`,
            projectId: project.id,
            integration: "supabase",
            kind: "infra",
            title: `${worst[0]} usage reached ${worst[1]!.percent}%`,
            whenIso: createdAt,
            ok: true,
          });
        }
      }

      const health: SupabaseHealth = healthFrom(hasCritical, hasWarning);
      statuses[project.id] = {
        projectId: project.id,
        connected: true,
        supabaseProjects,
        state,
        database,
        storage,
        bandwidth,
        authUsers,
        authGrowthPct,
        health,
        headline,
        label: statusLabel(state, headline),
      };
    }

    return { mode, events, signals, statuses };
  } catch (err) {
    // Catastrophic failure (beyond per-project errors): degrade to no Supabase
    // data and surface a single studio-level signal. Never throws to callers.
    return {
      mode,
      events: [],
      signals: [
        {
          id: "supabase_connection_failure:studio",
          projectId: undefined,
          type: "supabase_connection_failure",
          severity: "warning",
          title: "Supabase integration error",
          description: `The Supabase integration failed: ${(err as Error)?.message ?? "unknown error"}.`,
          recommendation: "Check the access token and network. Product Studio continues without Supabase data.",
          source: "supabase_integration",
          createdAt,
        },
      ],
      statuses: {},
    };
  }
});
