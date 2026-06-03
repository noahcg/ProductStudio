import { githubToken } from "./config";
import type { RepoSnapshot } from "./types";

/**
 * Live GitHub REST client (metadata only — no source code, no commit contents).
 *
 * Used when GITHUB_TOKEN is configured. Reads recent commits, open pull
 * requests, and recently-merged PRs for a repo. Failures degrade gracefully
 * (the snapshot is returned with `error` set), surfaced as a signal upstream.
 */
const API = "https://api.github.com";

async function gh<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    // Cache for a few minutes to respect rate limits.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

export async function liveRepoSnapshot(repo: string): Promise<RepoSnapshot> {
  const token = githubToken();
  if (!token) return { repo, connected: false, commitsThisWeek: 0, openPullRequests: [], events: [], error: "No token" };

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  try {
    const [commits, pulls] = await Promise.all([
      gh<Array<{ sha: string; commit: { author?: { date?: string }; message: string } }>>(
        `/repos/${repo}/commits?since=${weekAgo}&per_page=20`,
        token
      ),
      gh<Array<{ number: number; title: string; created_at: string; merged_at: string | null; state: string }>>(
        `/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=20`,
        token
      ),
    ]);

    const events: RepoSnapshot["events"] = [];
    if (commits.length > 0) {
      const last = commits[0].commit.author?.date;
      events.push({
        kind: "commit",
        title: `Pushed ${commits.length} commit${commits.length === 1 ? "" : "s"} to ${repo.split("/")[1]}`,
        whenIso: last ?? new Date().toISOString(),
      });
    }
    const openPRs = pulls.filter((p) => p.state === "open");
    for (const pr of pulls.slice(0, 5)) {
      events.push({
        kind: "pr",
        title: pr.merged_at ? `Merged PR #${pr.number}: ${pr.title}` : `Opened PR #${pr.number}: ${pr.title}`,
        whenIso: pr.merged_at ?? pr.created_at,
        ok: !!pr.merged_at,
      });
    }

    const lastActivityIso =
      commits[0]?.commit.author?.date ??
      pulls[0]?.merged_at ??
      pulls[0]?.created_at;

    return {
      repo,
      connected: true,
      lastActivityIso,
      commitsThisWeek: commits.length,
      openPullRequests: openPRs.map((p) => ({ number: p.number, title: p.title, openedIso: p.created_at })),
      events,
    };
  } catch (err) {
    return {
      repo,
      connected: false,
      commitsThisWeek: 0,
      openPullRequests: [],
      events: [],
      error: (err as Error)?.message ?? "GitHub request failed",
    };
  }
}
