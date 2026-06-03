import { cache } from "react";
import type { Activity, Project } from "@/lib/domain";
import type { GeneratedSignal } from "@/lib/signals/engine";
import { now as studioNow } from "@/lib/clock";
import { githubMode, reposForProject, GITHUB_THRESHOLDS } from "./config";
import { mockRepoSnapshot } from "./mock";
import { liveRepoSnapshot } from "./client";
import type { RepoSnapshot, GitHubProjectStatus, GitHubResult } from "./types";

const daysSince = (iso: string) =>
  Math.round((studioNow().getTime() - new Date(iso).getTime()) / 86_400_000);
const latestIso = (isos: (string | undefined)[]) =>
  isos.filter(Boolean).reduce<string | undefined>((m, i) => (!m || new Date(i!) > new Date(m) ? i! : m), undefined);

function statusLabel(s: { connected: boolean; error?: boolean; idle: number; openPRs: number; commitsThisWeek: number }): string {
  if (!s.connected) return "Not connected";
  if (s.error) return "Connection error";
  if (s.commitsThisWeek > 0 && s.idle <= 7) return "Active this week";
  if (s.openPRs > 0) return `${s.openPRs} open PR${s.openPRs === 1 ? "" : "s"}`;
  if (s.idle >= GITHUB_THRESHOLDS.noActivityDays) return "No activity";
  return "Quiet";
}

/**
 * The GitHub provider — fetches repo activity (live or mock), maps it into
 * Product Studio's activity feed + signals, and derives a per-project status.
 * GitHub never owns domain data; this only augments activity/signals/health.
 *
 * Cached per request so the multiple readers (feed, signals, health, cards)
 * share one fetch.
 */
export const getGitHub = cache(async (projects: Project[]): Promise<GitHubResult> => {
  const mode = githubMode();
  if (mode === "off") {
    return { mode, events: [], signals: [], statuses: {} };
  }

  const createdAt = studioNow().toISOString();
  const events: Activity[] = [];
  const signals: GeneratedSignal[] = [];
  const statuses: Record<string, GitHubProjectStatus> = {};

  const sig = (
    type: GeneratedSignal["type"],
    severity: GeneratedSignal["severity"],
    projectId: string | undefined,
    title: string,
    description: string,
    recommendation: string,
    metadata?: Record<string, unknown>
  ) =>
    signals.push({ id: `${type}:${projectId ?? "studio"}`, projectId, type, severity, title, description, recommendation, source: "github_integration", createdAt, metadata });

  try {
    for (const project of projects) {
    const repos = reposForProject(project.id);
    if (repos.length === 0) {
      statuses[project.id] = { projectId: project.id, connected: false, repos: [], commitsThisWeek: 0, openPRs: 0, label: "Not connected" };
      continue;
    }

    const snapshots: RepoSnapshot[] = await Promise.all(
      repos.map((r) => (mode === "live" ? liveRepoSnapshot(r) : Promise.resolve(mockRepoSnapshot(r))))
    );

    const errored = snapshots.filter((s) => s.error);
    const reachable = snapshots.filter((s) => !s.error);

    // Merge events into the feed.
    for (const snap of reachable) {
      for (const e of snap.events) {
        events.push({
          id: `gh-${project.id}-${snap.repo}-${e.kind}-${e.whenIso}`,
          projectId: project.id,
          integration: "github",
          kind: e.kind,
          title: e.title,
          whenIso: e.whenIso,
          ok: e.ok,
        });
      }
    }

    const commitsThisWeek = reachable.reduce((n, s) => n + s.commitsThisWeek, 0);
    const openPRsList = reachable.flatMap((s) => s.openPullRequests);
    const lastActivityIso = latestIso(reachable.map((s) => s.lastActivityIso));
    const idle = lastActivityIso ? daysSince(lastActivityIso) : Infinity;
    const oldestOpenPrDays = openPRsList.length
      ? Math.max(...openPRsList.map((p) => daysSince(p.openedIso)))
      : undefined;
    const connected = reachable.length > 0;

    statuses[project.id] = {
      projectId: project.id,
      connected,
      repos,
      lastActivityIso,
      commitsThisWeek,
      openPRs: openPRsList.length,
      oldestOpenPrDays,
      label: statusLabel({ connected, error: errored.length > 0 && reachable.length === 0, idle: idle === Infinity ? 999 : idle, openPRs: openPRsList.length, commitsThisWeek }),
    };

    // --- Signals ---
    if (connected && idle >= GITHUB_THRESHOLDS.noActivityDays) {
      sig("github_no_activity", "warning", project.id, `${project.name} has no recent GitHub activity`, `No repository activity in ${idle} day${idle === 1 ? "" : "s"}.`, "Push work in progress or check the repo is still active.", { idleDays: idle, repos });
    }
    if (oldestOpenPrDays != null && oldestOpenPrDays > GITHUB_THRESHOLDS.stalePrDays) {
      sig("github_stale_pr", "watch", project.id, `${project.name} has a stale open PR`, `An open pull request has been open for ${oldestOpenPrDays} days.`, "Review and merge or close the pull request.", { oldestOpenPrDays, openPRs: openPRsList.length });
    }
    for (const e of errored) {
      sig("github_repo_disconnected", "warning", project.id, `${e.repo} is disconnected`, `Could not reach the repository (${e.error}).`, "Check the repo name and that the token has access.", { repo: e.repo });
    }
    }

    return { mode, events, signals, statuses };
  } catch (err) {
    // Catastrophic failure (beyond per-repo errors): degrade to no GitHub data
    // and surface a single studio-level signal. Never throws to callers.
    return {
      mode,
      events: [],
      signals: [
        {
          id: "github_api_failure:studio",
          projectId: undefined,
          type: "github_api_failure",
          severity: "warning",
          title: "GitHub integration error",
          description: `The GitHub integration failed: ${(err as Error)?.message ?? "unknown error"}.`,
          recommendation: "Check the token, repo access, and network. Product Studio continues without GitHub data.",
          source: "github_integration",
          createdAt,
        },
      ],
      statuses: {},
    };
  }
});
