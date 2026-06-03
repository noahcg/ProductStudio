# GitHub Integration

> GitHub is an **integration source**, never the source of truth. Product Studio
> remains authoritative for **projects, milestones, roadmaps, decisions, and
> focus**. GitHub only *augments* the activity feed, signals, and the
> momentum/execution inputs to Health.

## Architecture

```
Repositories (GitHub REST API, read-only, metadata only)
        ↓  client.ts (live)  /  mock.ts (dev)
   RepoSnapshot[]  (commits-this-week, open PRs, recent events)
        ↓  provider.ts  (cached per request)
   GitHubResult { events: Activity[], signals: GeneratedSignal[], statuses }
        ↓  data/index.ts pipeline
   ┌─ merged into the Activity feed (integration = "github")
   ├─ merged into the Signals Engine output
   ├─ per-project status → Studio cards
   └─ status → Health (Momentum + Execution) → Focus
```

Layers (`src/lib/integrations/github/`):
- **`config.ts`** — repository mapping + mode/token resolution + thresholds.
- **`client.ts`** — live GitHub REST client (PAT). Commits (last 7 days), pulls;
  metadata only — no source code, no commit contents/diffs.
- **`mock.ts`** — deterministic dev/demo data so the integration is usable
  without a token (never real data).
- **`provider.ts`** — selects live/mock/off, normalizes snapshots into activity
  events, signals, and per-project status. `React.cache`d per request so the
  feed, signals, health, and cards share one fetch.

## Repository mapping

`REPO_MAP` in `config.ts` maps a project slug → one **or more** repos:

```ts
export const REPO_MAP = {
  "home-cooked":      ["noahg/home-cooked"],
  "wardrobe-harmony": ["noahg/wardrobe-harmony"],
  "personal-trainer": ["noahg/personal-trainer"],
  "cascade-lounge":   ["noahg/cascade-lounge"],
};
```

Multiple repositories per project are supported (their commits/PRs/status are
aggregated). A project with no mapping shows "Not connected" and contributes
nothing.

## Configuration

| Env var | Purpose |
|---|---|
| `GITHUB_TOKEN` | A classic or fine-grained PAT with **read** access to the mapped repos. |
| `GITHUB_MODE` | Optional override: `live` \| `mock` \| `off`. Default: `live` when a token is set, else `mock`. |

**Setup**
1. Create a PAT (fine-grained: *Contents: read*, *Pull requests: read*, *Metadata: read*).
2. Add `GITHUB_TOKEN=...` to `.env.local`.
3. Restart. The app now reads live activity for the mapped repos.

Without a token the app uses deterministic **mock** GitHub data so every feature
(feed, signals, status, health influence) is demonstrable.

## What it collects

Commits (count in the last 7 days + latest timestamp), pull requests (number,
title, open/merged, timestamps), and derived repository activity timestamps.
**Only metadata** — no source code is imported, no commit contents are stored,
nothing is persisted (it is recomputed per request).

## Signals generated

| Type | Severity | Condition |
|---|---|---|
| `github_no_activity` | warning | no repo activity in ≥14 days |
| `github_stale_pr` | watch | an open PR older than 7 days |
| `github_repo_disconnected` | warning | a mapped repo couldn't be reached (live) |
| `github_api_failure` | warning | the GitHub request failed (live) |

These merge into the Signals Engine output (`source: "github_integration"`).

## Health & Focus influence

- **Health → Momentum**: GitHub's latest activity is folded into the project's
  "last activity" (recent pushes reduce idle); commit count surfaces as a reason.
- **Health → Execution**: a small, capped bonus from commits this week
  (`+min(commitsThisWeek, 6)`). Never overrides task-based execution.
- **Never** influences Planning, Decisions, or Roadmap categories.
- **Focus**: consumes GitHub indirectly (via Health momentum/execution and the
  GitHub signals in the Signals category). It never overrides critical signals,
  active milestones, or manual priorities — the GitHub contribution is bounded.

## Rate limits

- Authenticated REST requests: **5,000/hour** per token.
- The client requests are `fetch`-cached with `revalidate: 300` (5 min), and the
  provider is `React.cache`d per request, so a page render issues at most a
  couple of calls per repo. Comfortably within limits for a single-user studio.
- 403/secondary-rate-limit or any non-200 → the snapshot degrades gracefully
  (`error` set) and surfaces a `github_repo_disconnected` signal.

## Security notes

- The PAT is read from a **server-only** env var (`GITHUB_TOKEN`); it is never
  sent to the client (the GitHub layer is only imported by the server data layer).
- Use a **least-privilege, read-only** token; scope it to the mapped repos with
  a fine-grained PAT.
- No code or commit contents are fetched or stored — metadata only.
- The integration is **read-only**; it never writes to GitHub.
- Keep `.env.local` out of version control (already git-ignored).
