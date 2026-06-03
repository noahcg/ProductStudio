# Supabase Monitoring

> Supabase is an **integration source**, never the source of truth. Product Studio
> remains authoritative for **projects, milestones, roadmaps, decisions, and
> focus**. Supabase only *augments* the activity feed, signals, and the Risk
> input to Health.
>
> The question it answers: **"Can my products continue operating safely and
> reliably?"** — platform health, not a database administration tool. No table
> contents, no user data, no secrets.

> **Not the data store.** This is the *monitoring* integration
> (`src/lib/integrations/supabase/`), unrelated to
> `src/lib/data/supabase-source.ts` (the Product Studio data-store seam).

## Architecture

Supabase mirrors the GitHub/Vercel integrations exactly:

```
Supabase Management API (read-only, metadata only)
  → client.ts (live) / mock.ts (deterministic dev)
  → provider.ts  (React.cache per request)
  → SupabaseResult { events, signals, statuses }
  → data/index.ts pipeline → Activity feed + Signals Engine + Health + Focus + UI
```

Layers (`src/lib/integrations/supabase/`):
- **`config.ts`** — `SUPABASE_PROJECT_MAP`, mode/token resolution, usage thresholds.
- **`client.ts`** — live Management API client. Project status + best-effort
  usage; **metadata only** — no table contents, user data, passwords, or secrets.
- **`mock.ts`** — deterministic dev/demo data so the integration is usable
  without a token (never real data).
- **`provider.ts`** — selects live/mock/off, normalizes snapshots into activity
  events, signals, and per-project status. `React.cache`d per request.

## Project mapping

`SUPABASE_PROJECT_MAP` in `config.ts` maps a project slug → Supabase project(s):

```ts
export const SUPABASE_PROJECT_MAP = {
  "home-cooked":      ["home-cooked-db"],
  "wardrobe-harmony": ["wardrobe-harmony-db"],
  "personal-trainer": ["personal-trainer-db"],
  "cascade-lounge":   ["cascade-lounge-db"],
};
```

One Supabase project per Product Studio project today; **many** is supported
(worst state + peak usage are aggregated). A project with no mapping emits a
`supabase_not_configured` **info** signal and shows no status on its card.

## Configuration

| Env var | Purpose |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | A Supabase **personal access token** (Account → Access Tokens) with read access to the org's projects. |
| `SUPABASE_MONITOR_MODE` | Optional override: `live` \| `mock` \| `off`. Default: `live` when a token is set, else `mock`. |

**Setup**
1. Create a token at **Supabase → Account → Access Tokens**.
2. Add `SUPABASE_ACCESS_TOKEN=...` to `.env.local`.
3. Restart. The app now reads live project status (and best-effort usage) for the
   mapped projects.

Without a token the app uses deterministic **mock** Supabase data so every
feature (feed, signals, status, health influence) is demonstrable.

## What it collects

Project **status** and usage **metadata** only: database/storage/bandwidth usage
percentages, auth user counts, and growth. It does **not** collect table
contents, user data, passwords, secrets, or customer information. Nothing is
persisted — it is recomputed per request.

## Project status mapping

Supabase's project status vocabulary is normalized (`client.ts` → `mapProjectState`):

| Supabase status | Product Studio state |
|---|---|
| `ACTIVE_HEALTHY` | `healthy` |
| `ACTIVE_UNHEALTHY`, `COMING_UP`, `GOING_DOWN`, `RESTORING`, `UPGRADING` | `degraded` |
| `INACTIVE`, `PAUSED`, `REMOVED`, `INIT_FAILED`, `RESTORE_FAILED` | `unavailable` |
| *(anything else / missing)* | `unknown` |

## Metric thresholds

Usage percentages of the plan limit (`SUPABASE_THRESHOLDS` in `config.ts`):

| Metric | Watch | Warning | Critical |
|---|---|---|---|
| Database | ≥70% | ≥85% | ≥95% |
| Storage | ≥70% | ≥85% | ≥95% |
| Bandwidth | ≥75% | ≥90% | ≥98% |

## Signals generated

| Type | Severity | Condition |
|---|---|---|
| `supabase_database_usage` | watch / warning / critical | DB usage crosses 70 / 85 / 95% |
| `supabase_storage_usage` | watch / warning / critical | storage crosses 70 / 85 / 95% |
| `supabase_bandwidth_usage` | watch / warning / critical | bandwidth crosses 75 / 90 / 98% |
| `supabase_project_degraded` | warning | project reporting degraded health |
| `supabase_project_unavailable` | critical | project unavailable |
| `supabase_connection_failure` | warning | metrics could not be retrieved |
| `supabase_not_configured` | info | no Supabase project mapped |

These merge into the Signals Engine output (`source: "supabase_integration"`)
and appear in the **Supabase signals** group on the Signals screen.

## Operational health (Studio cards)

A 3-level label derived from the worst signal: **Critical** (unavailable, or any
metric ≥ critical), **Warning** (degraded, or any metric ≥ watch), **Healthy**
(all within limits). Shown as a compact `🗄 Supabase <health>` line (tinted only
when not Healthy) and as the **Supabase** panel on the Focus screen (project
status + database/storage/bandwidth meters).

## Health & Focus influence

- **Health → Risk** (operational health): a balanced penalty — `−35` unavailable,
  `−25` critical metric, `−15` degraded, `−10` warning metric. Plus the Supabase
  signals feed the Signals health category. **Dents but never destroys** health
  (e.g. an unavailable project moved one seed project's risk 82→47, still
  "Stable"). Never touches Momentum/Planning/Execution/Decisions/Roadmap.
- **Focus**: consumes Supabase via Health (risk + signals). When a project's
  Supabase health is **Critical**, Focus surfaces a reason ("Supabase database at
  96%") and steers the recommendation ("Resolve the Supabase issue (…) before
  adding major new features"). It never overrides milestone progress.

## API limits

- Management API requests are rate-limited per token; the client `fetch`es are
  cached with `revalidate: 300` (5 min) and the provider is `React.cache`d per
  request, so a page render issues at most a couple of calls per project.
- Any non-200 (auth, rate limit, project not found) → the snapshot degrades
  gracefully (`error` set) and surfaces a `supabase_connection_failure` signal;
  the rest of Product Studio continues unaffected.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Card shows no Supabase status | No mapping for the project — add it to `SUPABASE_PROJECT_MAP` (emits a `supabase_not_configured` info signal). |
| "Supabase metrics unavailable" / `supabase_connection_failure` | Bad/expired token, or the mapped name doesn't match a project name/ref. |
| Status shows but meters are "—" | Usage isn't exposed on this plan/endpoint — status-only monitoring (graceful). |
| Live data not appearing | `SUPABASE_ACCESS_TOKEN` not set (running in `mock`), or `SUPABASE_MONITOR_MODE=mock/off`. Check `.env.local` and restart. |

## Security notes

- The token is read from a **server-only** env var (`SUPABASE_ACCESS_TOKEN`); it
  is never sent to the client (the Supabase layer is only imported by the server
  data layer).
- Use a **least-privilege** token.
- No table contents, user data, passwords, secrets, or customer information are
  fetched or stored — status + usage metadata only.
- The integration is **read-only**; it never modifies the database, runs queries,
  or changes project settings.
- Keep `.env.local` out of version control (already git-ignored).
