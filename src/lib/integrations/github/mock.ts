import { now as studioNow } from "@/lib/clock";
import type { RepoSnapshot } from "./types";

/**
 * Deterministic mock GitHub data — a dev/demo stand-in for the live API so the
 * integration is usable without a token. NOT real data, and never the source of
 * truth (it only feeds activity/signals/health like the live client would).
 */
interface MockRepo {
  commitsThisWeek: number;
  lastPushDaysAgo: number;
  prs: { number: number; title: string; openedDaysAgo: number; merged?: boolean }[];
}

const MOCK: Record<string, MockRepo> = {
  "noahg/home-cooked": {
    commitsThisWeek: 6,
    lastPushDaysAgo: 0,
    prs: [
      { number: 48, title: "Shared cookbook permissions", openedDaysAgo: 1 },
      { number: 47, title: "Invite acceptance flow", openedDaysAgo: 2, merged: true },
    ],
  },
  "noahg/wardrobe-harmony": {
    commitsThisWeek: 1,
    lastPushDaysAgo: 8,
    prs: [
      { number: 18, title: "Color extraction tuning", openedDaysAgo: 9 },
      { number: 17, title: "CSV import edge cases", openedDaysAgo: 3 },
    ],
  },
  "noahg/personal-trainer": {
    commitsThisWeek: 0,
    lastPushDaysAgo: 20,
    prs: [],
  },
  "noahg/cascade-lounge": {
    commitsThisWeek: 0,
    lastPushDaysAgo: 12,
    prs: [],
  },
};

function isoDaysAgo(days: number): string {
  return new Date(studioNow().getTime() - days * 86_400_000).toISOString();
}

export function mockRepoSnapshot(repo: string): RepoSnapshot {
  const m = MOCK[repo];
  if (!m) {
    return { repo, connected: true, commitsThisWeek: 0, openPullRequests: [], events: [] };
  }

  // Only PR events feed the activity stream (commit pushes already exist in the
  // base feed; commitsThisWeek is used for status/health). Keeps the feed clean.
  const events: RepoSnapshot["events"] = [];
  for (const pr of m.prs) {
    events.push({
      kind: "pr",
      title: pr.merged ? `Merged PR #${pr.number}: ${pr.title}` : `Opened PR #${pr.number}: ${pr.title}`,
      whenIso: isoDaysAgo(pr.openedDaysAgo),
      ok: pr.merged,
    });
  }

  return {
    repo,
    connected: true,
    lastActivityIso: isoDaysAgo(m.lastPushDaysAgo),
    commitsThisWeek: m.commitsThisWeek,
    openPullRequests: m.prs
      .filter((p) => !p.merged)
      .map((p) => ({ number: p.number, title: p.title, openedIso: isoDaysAgo(p.openedDaysAgo) })),
    events,
  };
}
