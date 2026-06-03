# Phase 2.14 — Supabase Monitoring

> Adds **Supabase** as a first-class infrastructure integration so Product Studio
> can answer *"Can my products continue operating safely and reliably?"* —
> platform health flowing through the established **Awareness → Signals → Health →
> Focus** pipeline. Supabase is an operational signal source, **not** the source
> of truth, and this is **not** a database administration tool.

See [`docs/integrations/SUPABASE_MONITORING.md`](../integrations/SUPABASE_MONITORING.md)
for setup, project mapping, status/threshold mapping, API limits, and troubleshooting.

## Architecture

Supabase mirrors the GitHub and Vercel integrations exactly
(`src/lib/integrations/supabase/`):

```
Supabase Management API (read-only, metadata only)
  → client.ts (live) / mock.ts (deterministic dev)
  → provider.ts  (React.cache per request)
  → SupabaseResult { events, signals, statuses }
  → data/index.ts pipeline → Activity feed + Signals Engine + Health + Focus + UI
```

- **`config.ts`** — `SUPABASE_PROJECT_MAP` (one or many), mode/token resolution
  (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_MONITOR_MODE`), and `SUPABASE_THRESHOLDS`.
- **`types.ts`** — `SupabaseProjectState` (healthy/degraded/unavailable/unknown),
  `UsageMetric`, `SupabaseSnapshot`, `SupabaseHealth` (Healthy/Warning/Critical),
  `SupabaseProjectStatus`, `SupabaseResult`.
- **`client.ts`** — live Management API client; metadata only (no table contents,
  user data, or secrets). `mapProjectState` normalizes Supabase's status vocabulary.
- **`mock.ts`** — deterministic metrics per project so the integration is fully
  demonstrable without a token.
- **`provider.ts`** — aggregates snapshots (worst state, peak usage), emits one
  notable activity event per project, generates signals, derives operational health.

> This is unrelated to `src/lib/data/supabase-source.ts` — that is the Product
> Studio data-store seam; this is read-only platform *monitoring*.

## Metric thresholds

| Metric | Watch | Warning | Critical |
|---|---|---|---|
| Database | ≥70% | ≥85% | ≥95% |
| Storage | ≥70% | ≥85% | ≥95% |
| Bandwidth | ≥75% | ≥90% | ≥98% |

Project status: `degraded` → warning, `unavailable` → critical.

## Signal generation

All Supabase observations become signals (`source: "supabase_integration"`) —
never bypassing the Signals Engine, exactly like GitHub, Domain, and Vercel:

`supabase_database_usage` · `supabase_storage_usage` · `supabase_bandwidth_usage`
(watch/warning/critical) · `supabase_project_degraded` (warning) ·
`supabase_project_unavailable` (critical) · `supabase_connection_failure`
(warning) · `supabase_not_configured` (info).

## Health integration

Supabase platform health influences **Risk** (operational health) only — never
Momentum/Execution/Planning/Decisions/Roadmap — with balanced weighting:

- `−35` unavailable · `−25` critical metric · `−15` degraded · `−10` warning metric.
- Plus the Supabase signals feed the existing Signals health category.

**Dents but never destroys** health. A deployment/infra problem does not instantly
tank a project.

## Focus integration

Focus consumes Supabase via Health (risk + the Supabase signals in the Signals
category). When a project's Supabase health is **Critical**, Focus adds an
explainable reason and steers the recommendation — without overriding milestone
progress.

## Studio + Signals + Focus surfaces

- **Studio cards** — compact `🗄 Supabase <Healthy|Warning|Critical>` line (tinted
  only when not Healthy). Layout otherwise unchanged.
- **Signals screen** — a dedicated **Supabase signals** group.
- **Focus screen** — a **Supabase** panel: project status + database/storage/
  bandwidth meters (compact, no charts).
- **Activity feed** — "Storage usage reached 88%" / "Supabase project unavailable"
  events (integration = `supabase`), one notable event per project.

## Seed behavior (mock, studio clock 2026-06-07)

| Project | State | Notable | Result |
|---|---|---|---|
| Home Cooked | healthy | storage 88% (warning), bandwidth 76% (watch) | **Warning** |
| WardrobeHarmony | **unavailable** | — | **Critical** |
| PersonalTrainer | healthy | database 96% (critical) | **Critical** |
| Cascade Lounge | healthy | all low | **Healthy** |

Health impact verified (without → with Supabase): Home Cooked 92→88, WardrobeHarmony
risk 82→47 (still "Stable"), PersonalTrainer 67→59 (still "Attention Needed"),
Cascade Lounge 75→75 (unchanged control). Current Focus stays Home Cooked;
PersonalTrainer's focus recommendation becomes *"Resolve the Supabase issue
(database at 96%) for PersonalTrainer before adding major new features."*

## Validation — all 15 points PASS

Verified via `npm run build` (clean), a standalone engine test (`tsx`), and live
HTTP checks against `npm run start`.

1. **Supabase → project mapping** — `SUPABASE_PROJECT_MAP`, one-or-many, aggregated. ✅
2. **Usage metrics collected** — database/storage/bandwidth percentages per project. ✅
3. **Activity items generated** — "usage reached 88/96%", "project unavailable". ✅
4. **Signals generated** — 4 projects → critical/warning/watch/info as designed. ✅
5. **Signals Engine consumes them** — present in generated signals (`supabase_integration`). ✅
6. **Health Engine consumes them** — HC 92→88, WH risk 82→47, PT 67→59; Cascade unchanged. ✅
7. **Focus Engine consumes them** — supabase-aware reason + recommendation; HC still current. ✅
8. **Studio screen visually unchanged** — one compact Supabase line added; 200. ✅
9. **Signals screen displays Supabase warnings** — dedicated Supabase signals group. ✅
10. **GitHub integration still works** — no-activity + stale-PR signals present. ✅
11. **Domain Monitoring still works** — Domain signals + SSL/auto-renew intact. ✅
12. **Vercel integration still works** — Deployment signals + repeated-failures intact. ✅
13. **Decisions still work** — `/decisions` renders "row-level security" (200). ✅
14. **Roadmaps still work** — `/roadmaps` renders "Family Sharing MVP" (200). ✅
15. **Tasks still work** — `/focus` renders Tasks + Add task + Supabase panel (200). ✅

## Known limitations

- **Live path is unverified without a token.** Mock mode is fully validated; real
  Management API responses, plan-specific usage shapes, and rate-limit/403
  handling can only be confirmed with a real `SUPABASE_ACCESS_TOKEN`. The code
  paths exist and degrade gracefully by construction.
- **Usage is best-effort in live mode.** Supabase's usage endpoints vary by plan;
  the client reads defensively and falls back to **status-only** monitoring
  (meters show "—") when usage isn't exposed. No raw data is retained.
- **No persistence.** Metrics are recomputed per request (`fetch`-cached 5 min in
  live mode); there is no usage-history store or webhook ingestion. Growth rates
  are illustrative in mock mode.
- **Awareness, not administration** — read-only by design; Product Studio never
  queries the database, modifies settings, or exposes data/secrets.

## Constraints honored

No Supabase admin tool · no customer data · no database contents · no secrets ·
no infrastructure-heavy screens · no new navigation · no architecture change.
Awareness → Signals → Health → Focus.

## Next

Phase 2.15 — Weekly Founder Review: synthesize weekly summaries, momentum/
milestone progress, health changes, new risks, and recommended focus from the
signals/health/focus the GitHub/Domains/Vercel/Supabase integrations now feed.
