# Phase 2.11 — GitHub Integration

> **Status:** Complete. GitHub is wired in as an **integration source** — it
> augments the activity feed, signals, and health/focus momentum, but is **never
> the source of truth**. Projects, milestones, roadmaps, decisions, and focus
> remain owned by Product Studio. No redesign, no new navigation.

## What shipped

A GitHub integration layer (`src/lib/integrations/github/`):
- **`config.ts`** — project→repository mapping (multiple repos per project),
  mode/token resolution, thresholds.
- **`client.ts`** — live GitHub REST client via a Personal Access Token
  (metadata only: commits, pull requests; no source code, no commit contents).
- **`mock.ts`** — deterministic dev/demo data so the integration works without a
  token (what runs here).
- **`provider.ts`** — selects live/mock/off, normalizes repos into activity
  events, signals, and per-project status; `React.cache`d per request.

Full architecture, setup, rate limits, and security notes are in
[`docs/integrations/GITHUB.md`](../integrations/GITHUB.md).

## How it connects (no source-of-truth changes)

The repo `pipeline()` runs the GitHub provider once and threads its output
through the existing Signals → Health → Focus chain:
- **Activity feed** — GitHub PR events (`Opened PR`, `Merged PR`) merge into
  `getActivity()` (integration = `github`), appearing in Recent Activity and the
  Signals activity stream. Commit pushes stay in the base feed; `commitsThisWeek`
  drives status/health.
- **Signals** — GitHub signals (`github_no_activity`, `github_stale_pr`,
  `github_repo_disconnected`, `github_api_failure`) merge into
  `getGeneratedSignals()`.
- **Health** — GitHub status influences **Momentum** (recent pushes reduce idle;
  commit count shown as a reason) and **Execution** (small capped commit bonus).
  Never Planning/Decisions/Roadmap.
- **Focus** — consumes GitHub indirectly via Health + the GitHub signals;
  bounded so it never overrides critical signals, active milestones, or manual
  priorities.
- **Studio** — a lightweight one-line GitHub status on each project card
  ("Active this week" / "2 open PRs" / "No activity"). Not GitHub-heavy.

Added a `pr` activity kind (+ `GitPullRequest` icon).

## Configuration
`GITHUB_TOKEN` (server-only PAT) and optional `GITHUB_MODE` (`live|mock|off`).
Default: live when a token is set, else mock. See `.env.example`.

## Files
**New:** `src/lib/integrations/github/{config,types,client,mock,provider}.ts`,
`src/components/signals/severity.tsx` (reused), `docs/integrations/GITHUB.md`,
this summary.
**Changed:** `src/lib/signals/engine.ts` (+GitHub signal types/source),
`src/lib/health/engine.ts` (+GitHub momentum/execution), `src/lib/focus/engine.ts`
(+`github` input), `src/lib/data/index.ts` (pipeline + `getActivity` merge +
`getGitHubStatuses`), `src/components/studio/project-card.tsx`, `src/app/page.tsx`,
`src/components/studio/recent-activity.tsx`, `src/lib/domain/activity.ts`,
`src/components/icons.tsx`, `.env.example`.
**Untouched:** projects/milestones/roadmaps/decisions/focus ownership; navigation; theme.

## Validation (live, mock mode)

| # | Check | Result |
|---|---|---|
| 1 | GitHub activity appears in activity feed | ✅ Opened/Merged PR events in Recent Activity |
| 2 | Signals are generated | ✅ `no recent GitHub activity` (PT), `stale open PR` (WardrobeHarmony) |
| 3 | Health consumes GitHub activity | ✅ momentum reason "6 commits this week"; execution bonus |
| 4 | Focus consumes GitHub signals | ✅ via Health + Signals category (Focus reasons include Health) |
| 5 | Existing UI remains intact | ✅ all six screens 200; atmosphere + features unchanged |
| 6 | No GitHub data becomes source of truth | ✅ roadmaps/decisions/milestones still render from the studio source |

Deterministic in mock mode; live mode reads real GitHub and degrades gracefully
on error.

## Known limitations / future
- Mock mode emits **PR events** to the feed (commit pushes already exist in the
  base feed); live mode emits commit + PR events.
- GitHub data is **not persisted** — recomputed per request (and `fetch`-cached
  5 min in live mode). A future pass could sync into `activity_items`.
- Webhooks (push-based) and issue events could be added; current client polls
  commits + PRs on read.
- "Repository disconnected" / "API failure" signals only fire in live mode.
