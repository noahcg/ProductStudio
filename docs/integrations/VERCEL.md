# Vercel Integration

> Vercel is an **integration source**, never the source of truth. Product Studio
> remains authoritative for **projects, milestones, roadmaps, decisions, and
> focus**. Vercel only *augments* the activity feed, signals, and the
> momentum/execution/risk inputs to Health.
>
> The question it answers: **"Can my products actually be used right now?"** —
> deployment readiness, not a deployment dashboard. No build logs, no secrets.

## Architecture

```
Vercel projects (Vercel REST API, read-only, metadata only)
        ↓  client.ts (live)  /  mock.ts (dev)
   DeploymentSnapshot[]  (latest state + recent deployment metadata)
        ↓  provider.ts  (cached per request)
   VercelResult { events: Activity[], signals: GeneratedSignal[], statuses }
        ↓  data/index.ts pipeline
   ┌─ merged into the Activity feed (integration = "vercel")
   ├─ merged into the Signals Engine output (source = "vercel_integration")
   ├─ per-project status → Studio cards + Focus deployment panel
   └─ status → Health (Momentum + Execution + Risk) → Focus
```

Layers (`src/lib/integrations/vercel/`):
- **`config.ts`** — Vercel project mapping + mode/token resolution + thresholds.
- **`client.ts`** — live Vercel REST client (`/v6/deployments`). Recent
  deployment metadata; **metadata only** — no source, no build logs, no env
  variable values, no secrets.
- **`mock.ts`** — deterministic dev/demo data so the integration is usable
  without a token (never real data).
- **`provider.ts`** — selects live/mock/off, normalizes snapshots into activity
  events, signals, and per-project status. `React.cache`d per request so the
  feed, signals, health, and cards share one fetch.

## Project mapping

`VERCEL_PROJECT_MAP` in `config.ts` maps a project slug → one **or more** Vercel
projects:

```ts
export const VERCEL_PROJECT_MAP = {
  "home-cooked":      ["home-cooked-production"],
  "wardrobe-harmony": ["wardrobe-harmony-production"],
  "personal-trainer": ["personal-trainer-production"],
  "cascade-lounge":   ["cascade-lounge-production"],
};
```

Multiple Vercel projects per Product Studio project are supported (their recent
deployments are aggregated newest-first). A project with no mapping emits a
`vercel_not_configured` **info** signal and shows no deployment status on its card.

## Configuration

| Env var | Purpose |
|---|---|
| `VERCEL_ACCESS_TOKEN` | A Vercel access token with **read** access to the mapped projects' deployments. |
| `VERCEL_TEAM_ID` | Optional — the team/account id (`?teamId=`) when the projects live under a team. |
| `VERCEL_MODE` | Optional override: `live` \| `mock` \| `off`. Default: `live` when a token is set, else `mock`. |

**Setup**
1. Create a token at **Vercel → Account Settings → Tokens** (read scope is enough).
2. Add `VERCEL_ACCESS_TOKEN=...` (and `VERCEL_TEAM_ID=...` if applicable) to `.env.local`.
3. Restart. The app now reads live deployment metadata for the mapped projects.

Without a token the app uses deterministic **mock** Vercel data so every feature
(feed, signals, status, health influence) is demonstrable.

## What it collects

Recent deployment **metadata** only: deployment state, timestamp, environment
(production/preview), duration, and the public deployment URL. It does **not**
collect source code, build logs, environment variable values, or secrets.
Nothing is persisted — it is recomputed per request.

## Deployment state mapping

Vercel's deployment vocabulary is normalized into Product Studio types
(`client.ts` → `mapDeploymentState`):

| Vercel state | Product Studio `DeploymentState` |
|---|---|
| `READY` | `ready` |
| `ERROR` | `failed` |
| `BUILDING`, `INITIALIZING` | `building` |
| `QUEUED` | `queued` |
| `CANCELED` | `canceled` |
| *(anything else / missing)* | `unknown` |

## Signals generated

| Type | Severity | Condition |
|---|---|---|
| `vercel_deploy_repeated_failures` | critical | ≥3 failed deployments in a row |
| `vercel_deploy_failed` | warning | the latest deployment failed (and not yet critical) |
| `vercel_no_successful_deploy` | watch | no successful (`ready`) deployment in ≥14 days |
| `vercel_queue_backlog` | watch | a `queued`/`building` deployment stuck ≥30 min |
| `vercel_connection_failure` | warning | the Vercel projects couldn't be reached (live) |
| `vercel_not_configured` | info | no Vercel project mapped to the project |

These merge into the Signals Engine output (`source: "vercel_integration"`) and
appear in the **Deployment signals** group on the Signals screen. Thresholds live
in `VERCEL_THRESHOLDS` (`config.ts`).

## Deployment health (Studio cards)

A 3-level label derived from the worst signal for the project:

- **Critical** — repeated failures (≥3 in a row).
- **Warning** — a single failed deploy, no recent success, a stuck deploy, or a
  connection failure.
- **Healthy** — latest deployment is ready and recent.

Shown as a compact `🚀 Deployment <health>` line on the card (tinted only when
not Healthy) and as the **Deployment** panel on the Focus screen (current state,
last successful, last failed).

## Health & Focus influence

- **Health → Momentum**: a successful (`ready`) deployment counts as recent
  activity (the product shipped) — folded into the project's "last activity".
- **Health → Execution**: a small, capped nudge — `+4` for a healthy, ready
  production deploy; `−4` for a failing one. Never overrides task-based execution.
- **Health → Risk**: a broken deployment is a real, current risk — `−30` for
  critical (repeated failures), `−14` for a single failed deploy. Balanced so it
  **dents but never destroys** health (e.g. a critical deploy moved one seed
  project 82 → 72, still "Stable").
- **Never** influences Planning, Decisions, or Roadmap categories.
- **Focus**: consumes Vercel via Health (momentum/execution/risk + the
  deployment signals in the Signals category). When a project's deployment is
  **Critical**, Focus surfaces a reason ("Deployment failing (N in a row)") and
  steers the recommendation ("Resolve the failing deployment … before continuing
  milestone work"). It never overrides milestone progress — the Current Focus
  still ranks by execution.

## API limits

- Vercel REST requests are rate-limited per token; the client `fetch`es are
  cached with `revalidate: 300` (5 min) and the provider is `React.cache`d per
  request, so a page render issues at most a couple of calls per project.
- Any non-200 (auth, rate limit, missing project) → the snapshot degrades
  gracefully (`error` set) and surfaces a `vercel_connection_failure` signal;
  the rest of Product Studio continues unaffected.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Card shows no deployment status | No mapping for the project — add it to `VERCEL_PROJECT_MAP` (emits a `vercel_not_configured` info signal). |
| "Deployment status unavailable" / `vercel_connection_failure` | Bad/expired token, wrong project name, or missing `VERCEL_TEAM_ID` for team projects. |
| Live data not appearing | `VERCEL_ACCESS_TOKEN` not set (running in `mock`), or `VERCEL_MODE=mock/off`. Check `.env.local` and restart. |
| Stuck "Building/Queued" warning | A real queue backlog, or a deployment that never resolved — check Vercel. |

## Security notes

- The token is read from a **server-only** env var (`VERCEL_ACCESS_TOKEN`); it is
  never sent to the client (the Vercel layer is only imported by the server data
  layer).
- Use a **least-privilege, read-only** token.
- No build logs, environment variable values, or secrets are fetched or stored —
  deployment metadata only.
- The integration is **read-only**; it never triggers, promotes, or cancels
  deployments.
- Keep `.env.local` out of version control (already git-ignored).
