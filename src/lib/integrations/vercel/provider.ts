import { cache } from "react";
import type { Activity, Project } from "@/lib/domain";
import type { GeneratedSignal } from "@/lib/signals/engine";
import { now as studioNow } from "@/lib/clock";
import { vercelMode, vercelProjectsForProject, VERCEL_THRESHOLDS } from "./config";
import { mockDeploymentSnapshot } from "./mock";
import { liveDeploymentSnapshot } from "./client";
import type {
  DeploymentMeta,
  DeploymentSnapshot,
  DeploymentHealth,
  VercelProjectStatus,
  VercelResult,
} from "./types";

const minutesSince = (iso: string) => (studioNow().getTime() - new Date(iso).getTime()) / 60_000;
const daysSince = (iso: string) => Math.round(minutesSince(iso) / (60 * 24));

/** Number of failures at the head of the (newest-first) timeline. */
function leadingFailures(recent: DeploymentMeta[]): number {
  let n = 0;
  for (const d of recent) {
    if (d.state === "failed") n++;
    else break;
  }
  return n;
}

function deployHealth(consecutiveFailures: number, hasWarning: boolean): DeploymentHealth {
  if (consecutiveFailures >= VERCEL_THRESHOLDS.repeatedFailures) return "Critical";
  if (hasWarning) return "Warning";
  return "Healthy";
}

function statusLabel(s: {
  connected: boolean;
  error?: boolean;
  consecutiveFailures: number;
  state: VercelProjectStatus["state"];
  env?: string;
}): string {
  if (!s.connected) return "Not connected";
  if (s.error) return "Connection error";
  if (s.consecutiveFailures >= VERCEL_THRESHOLDS.repeatedFailures) return "Repeated failures";
  switch (s.state) {
    case "failed":
      return "Deploy failed";
    case "building":
      return "Building";
    case "queued":
      return "Queued";
    case "canceled":
      return "Deploy canceled";
    case "ready":
      return s.env === "production" ? "Production ready" : "Preview ready";
    default:
      return "No recent deploys";
  }
}

function eventTitle(d: DeploymentMeta): string {
  switch (d.state) {
    case "ready":
      return d.environment === "production" ? "Production deployment succeeded" : "Preview deployment completed";
    case "failed":
      return "Deployment failed";
    case "canceled":
      return "Deployment canceled";
    case "building":
      return "Deployment building";
    case "queued":
      return "Deployment queued";
    default:
      return "Deployment updated";
  }
}

/**
 * The Vercel provider — fetches deployment metadata (live or mock), maps it into
 * Product Studio's activity feed + signals, and derives a per-project
 * deployment status. Vercel never owns domain data; this only augments
 * activity/signals/health ("can my products be used right now?").
 *
 * Cached per request so the multiple readers (feed, signals, health, cards)
 * share one fetch.
 */
export const getVercel = cache(async (projects: Project[]): Promise<VercelResult> => {
  const mode = vercelMode();
  if (mode === "off") {
    return { mode, events: [], signals: [], statuses: {} };
  }

  const createdAt = studioNow().toISOString();
  const events: Activity[] = [];
  const signals: GeneratedSignal[] = [];
  const statuses: Record<string, VercelProjectStatus> = {};

  const sig = (
    type: GeneratedSignal["type"],
    severity: GeneratedSignal["severity"],
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
      source: "vercel_integration",
      createdAt,
      metadata,
    });

  try {
    for (const project of projects) {
      const vercelProjects = vercelProjectsForProject(project.id);

      // Missing mapping → INFO, no deployment status surfaced on the card.
      if (vercelProjects.length === 0) {
        statuses[project.id] = {
          projectId: project.id,
          connected: false,
          vercelProjects: [],
          state: "unknown",
          consecutiveFailures: 0,
          health: "Healthy",
          label: "Not connected",
        };
        sig(
          "vercel_not_configured",
          "info",
          project.id,
          `${project.name} has no Vercel project`,
          "No Vercel project is configured, so deployment health is unknown.",
          "Map a Vercel project to track deployment readiness.",
          {}
        );
        continue;
      }

      const snapshots: DeploymentSnapshot[] = await Promise.all(
        vercelProjects.map((p) =>
          mode === "live" ? liveDeploymentSnapshot(p) : Promise.resolve(mockDeploymentSnapshot(p))
        )
      );

      const errored = snapshots.filter((s) => s.error);
      const reachable = snapshots.filter((s) => !s.error);

      // All Vercel projects unreachable → connection failure (WARNING).
      if (reachable.length === 0) {
        statuses[project.id] = {
          projectId: project.id,
          connected: false,
          vercelProjects,
          state: "unknown",
          consecutiveFailures: 0,
          health: "Warning",
          label: "Connection error",
        };
        sig(
          "vercel_connection_failure",
          "warning",
          project.id,
          `${project.name} deployment status unavailable`,
          "Unable to retrieve deployment information from Vercel.",
          "Check the access token and Vercel project names.",
          { vercelProjects, error: errored[0]?.error }
        );
        continue;
      }

      // Aggregate recent deployments across the project's Vercel projects.
      const recent = reachable
        .flatMap((s) => s.recent)
        .sort((a, b) => (a.createdIso < b.createdIso ? 1 : -1));
      const latest = recent[0];
      const latestReady = recent.find((d) => d.state === "ready");
      const latestFailed = recent.find((d) => d.state === "failed");
      const consecutiveFailures = leadingFailures(recent);
      const state = latest?.state ?? "unknown";

      // Emit the latest deployment per project into the feed (one event — the
      // current outcome — keeps the feed from being deployment-dominated).
      if (latest) {
        events.push({
          id: `vc-${project.id}-${latest.createdIso}`,
          projectId: project.id,
          integration: "vercel",
          kind: "deploy",
          title: eventTitle(latest),
          whenIso: latest.createdIso,
          ok: latest.state === "ready",
        });
      }

      // --- Signals ---
      let hasWarning = false;
      if (consecutiveFailures >= VERCEL_THRESHOLDS.repeatedFailures) {
        sig(
          "vercel_deploy_repeated_failures",
          "critical",
          project.id,
          `${project.name} has ${consecutiveFailures} failed deployments in a row`,
          `The last ${consecutiveFailures} deployments failed.`,
          "Investigate the build pipeline immediately — the product may be undeployable.",
          { consecutiveFailures }
        );
      } else if (state === "failed") {
        hasWarning = true;
        sig(
          "vercel_deploy_failed",
          "warning",
          project.id,
          `${project.name} deployment failed`,
          "The most recent deployment failed.",
          "Review the deployment logs in Vercel and redeploy.",
          { lastFailedIso: latestFailed?.createdIso }
        );
      }

      const noRecentSuccess = !latestReady || daysSince(latestReady.createdIso) >= VERCEL_THRESHOLDS.noSuccessDays;
      if (noRecentSuccess) {
        hasWarning = true;
        const days = latestReady ? daysSince(latestReady.createdIso) : undefined;
        sig(
          "vercel_no_successful_deploy",
          "watch",
          project.id,
          `${project.name} has no recent successful deployment`,
          days != null
            ? `No successful deployment in ${days} days.`
            : "No successful deployment on record.",
          "Verify the deployment pipeline is healthy.",
          { lastReadyIso: latestReady?.createdIso, days }
        );
      }

      const backlogged = recent.find(
        (d) => (d.state === "queued" || d.state === "building") && minutesSince(d.createdIso) >= VERCEL_THRESHOLDS.queueBacklogMinutes
      );
      if (backlogged) {
        hasWarning = true;
        sig(
          "vercel_queue_backlog",
          "watch",
          project.id,
          `${project.name} has a stuck deployment`,
          `A deployment has remained ${backlogged.state} for ${Math.round(minutesSince(backlogged.createdIso))} minutes.`,
          "Check Vercel for a stuck build or queue backlog.",
          { state: backlogged.state }
        );
      }

      const env = latest?.environment;
      const health = deployHealth(consecutiveFailures, hasWarning);
      statuses[project.id] = {
        projectId: project.id,
        connected: true,
        vercelProjects,
        state,
        lastDeployIso: latest?.createdIso,
        lastReadyIso: latestReady?.createdIso,
        lastFailedIso: latestFailed?.createdIso,
        consecutiveFailures,
        url: recent.find((d) => d.environment === "production")?.url,
        health,
        label: statusLabel({ connected: true, consecutiveFailures, state, env }),
      };
    }

    return { mode, events, signals, statuses };
  } catch (err) {
    // Catastrophic failure (beyond per-project errors): degrade to no Vercel
    // data and surface a single studio-level signal. Never throws to callers.
    return {
      mode,
      events: [],
      signals: [
        {
          id: "vercel_connection_failure:studio",
          projectId: undefined,
          type: "vercel_connection_failure",
          severity: "warning",
          title: "Vercel integration error",
          description: `The Vercel integration failed: ${(err as Error)?.message ?? "unknown error"}.`,
          recommendation: "Check the access token and network. Product Studio continues without deployment data.",
          source: "vercel_integration",
          createdAt,
        },
      ],
      statuses: {},
    };
  }
});
