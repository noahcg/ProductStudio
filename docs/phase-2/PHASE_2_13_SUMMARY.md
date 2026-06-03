# Phase 2.13 — Vercel Integration

> Adds **Vercel** as a first-class infrastructure integration so Product Studio
> can answer *"Can my products actually be used right now?"* — deployment
> readiness flowing through the established **Awareness → Signals → Health →
> Focus** pipeline. Vercel is an operational signal source, **not** the source of
> truth, and this is **not** a deployment dashboard.

See [`docs/integrations/VERCEL.md`](../integrations/VERCEL.md) for setup,
project mapping, state mapping, API limits, and troubleshooting.

## Architecture

Vercel mirrors the GitHub integration exactly (`src/lib/integrations/vercel/`):

```
Vercel REST API (read-only, metadata only)
  → client.ts (live) / mock.ts (deterministic dev)
  → provider.ts  (React.cache per request)
  → VercelResult { events, signals, statuses }
  → data/index.ts pipeline → Activity feed + Signals Engine + Health + Focus + UI
```

- **`config.ts`** — `VERCEL_PROJECT_MAP` (project → one or many Vercel projects),
  mode/token resolution (`VERCEL_ACCESS_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_MODE`),
  and `VERCEL_THRESHOLDS`.
- **`types.ts`** — `DeploymentState`, `DeploymentMeta`, `DeploymentSnapshot`,
  `DeploymentHealth` (Healthy/Warning/Critical), `VercelProjectStatus`,
  `VercelResult`.
- **`client.ts`** — live `/v6/deployments` client; metadata only (no source,
  logs, env values, or secrets). `mapDeploymentState` normalizes Vercel's
  vocabulary (READY/ERROR/BUILDING/QUEUED/CANCELED/…).
- **`mock.ts`** — deterministic deployments per project so the integration is
  fully demonstrable without a token.
- **`provider.ts`** — aggregates snapshots, emits the latest deployment as an
  activity event, generates signals, and derives per-project deployment health.

## Signal generation

Deployment signals enter the **Signals Engine output** (`source:
"vercel_integration"`) — exactly like GitHub and Domain signals, never bypassing it:

| Type | Severity | Condition |
|---|---|---|
| `vercel_deploy_repeated_failures` | critical | ≥3 failed deploys in a row |
| `vercel_deploy_failed` | warning | latest deploy failed |
| `vercel_no_successful_deploy` | watch | no `ready` deploy in ≥14 days |
| `vercel_queue_backlog` | watch | `queued`/`building` stuck ≥30 min |
| `vercel_connection_failure` | warning | Vercel unreachable |
| `vercel_not_configured` | info | no Vercel project mapped |

## Health integration

Deployment status influences **Momentum, Execution, and Risk** only (never
Planning/Decisions/Roadmap), with balanced weighting:

- **Momentum** — a successful deploy counts as recent activity (the product shipped).
- **Execution** — `+4` for a healthy ready production deploy, `−4` for a failing
  one (small + capped; tasks remain the driver).
- **Risk** — `−30` for critical (repeated failures), `−14` for a single failed
  deploy. **Dents but never destroys** health.

Plus the deployment signals feed the existing Signals health category. A
deployment problem does not instantly destroy project health.

## Focus integration

Focus consumes deployment status via Health (momentum/execution/risk + the
deployment signals in the Signals category). When a project's deployment is
**Critical**, Focus adds an explainable reason and steers the recommendation —
without overriding milestone progress.

## Studio + Signals + Focus surfaces

- **Studio cards** — compact `🚀 Deployment <Healthy|Warning|Critical>` line
  (tinted only when not Healthy). Layout otherwise unchanged.
- **Signals screen** — a dedicated **Deployment signals** group.
- **Focus screen** — a **Deployment** panel: current state, last successful, last
  failed (compact, no history overload).
- **Activity feed** — "Production deployment succeeded" / "Deployment failed"
  events (integration = `vercel`), one per project to avoid feed domination.

## Seed behavior (mock, studio clock 2026-06-07)

| Project | Latest | Result |
|---|---|---|
| Home Cooked | production ready ~2h ago | **Healthy** |
| WardrobeHarmony | 3 failed deploys in a row | **Critical** (`repeated_failures`) |
| PersonalTrainer | last success ~18d ago | **Warning** (`no_successful_deploy`) |
| Cascade Lounge | production ready ~3d ago | **Healthy** |

Health impact verified (without → with Vercel): Home Cooked 92→93, WardrobeHarmony
82→72 (risk 82→52, still "Stable"), PersonalTrainer 67→67, Cascade Lounge 75→76.
Current Focus stays Home Cooked; WardrobeHarmony's focus recommendation becomes
*"Resolve the failing deployment for WardrobeHarmony before continuing milestone work."*

## Validation — all 13 points PASS

Verified via `npm run build` (clean), standalone engine tests (`tsx`), and live
HTTP checks against `npm run start`.

1. **Vercel → project mapping** — `VERCEL_PROJECT_MAP`, one-or-many, aggregated. ✅
2. **Deployment activity in feed** — "Production deployment succeeded"/"Deployment failed" render. ✅
3. **Deployment signals generated** — 2 fire on the seed (WH critical, PT watch). ✅
4. **Signals Engine consumes them** — present in generated signals (`source: "vercel_integration"`). ✅
5. **Health Engine consumes them** — WardrobeHarmony 82→72 (risk 82→52); Home Cooked/Cascade +1. ✅
6. **Focus Engine consumes them** — deployment-aware reason + recommendation; Home Cooked still current. ✅
7. **Studio screen visually unchanged** — one compact deployment line added; 200. ✅
8. **Signals screen displays deployment warnings** — dedicated Deployment signals group. ✅
9. **GitHub integration still works** — no-activity + stale-PR signals still present. ✅
10. **Domain Monitoring still works** — Domain signals group + SSL/auto-renew signals intact. ✅
11. **Decisions still work** — `/decisions` renders "row-level security" (200). ✅
12. **Roadmaps still work** — `/roadmaps` renders "Family Sharing MVP" (200). ✅
13. **Tasks still work** — `/focus` renders Tasks + Add task + Deployment panel (200). ✅

## Known limitations

- **Live path is unverified without a token.** Mock mode is fully validated;
  real `/v6/deployments` responses, team-scoped projects, and rate-limit/403
  handling can only be confirmed with a real `VERCEL_ACCESS_TOKEN`. The code
  paths exist and degrade gracefully by construction.
- **No persistence.** Deployment data is recomputed per request (`fetch`-cached
  5 min in live mode); there is no deployment history store or webhook ingestion.
- **Queue-backlog & connection-failure signals are rule-only on the seed** (the
  mock has no stuck/unreachable deployments) — demonstrable via config, like
  GitHub's disconnected/api-failure signals.
- **Awareness, not control** — read-only by design; Product Studio never
  triggers, promotes, or cancels deployments, and never exposes logs or secrets.

## Constraints honored

No deployment dashboard · no build logs · no secrets/env values · no
infrastructure-heavy UI · no new navigation · no architecture change. Awareness →
Signals → Health → Focus.

## Next

Phase 2.14 — Supabase Monitoring (database/storage/bandwidth usage → Signals →
Health → Focus, following the same GitHub/Domains/Vercel architecture).
