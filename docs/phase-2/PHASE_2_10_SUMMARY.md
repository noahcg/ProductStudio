# Phase 2.10 — Signals Engine

> **Status:** Complete. A deterministic Signals Engine generates operational
> signals (observations) from Product Studio's own data and feeds the pipeline
> **Product Data → Signals Engine → Health Engine → Focus Engine → UI**. No AI,
> no LLMs, no external integrations, no redesign.

## What it is

`src/lib/signals/engine.ts` — `computeSignals(input, now?)` over the studio's own
data (projects, milestones, roadmap, tasks, decisions, activity, expenses,
domains). Returns `GeneratedSignal[]`. Pure & deterministic (same inputs + clock
→ identical output; stable sort by severity → project → type).

Each signal carries exactly the requested fields:
`id, project_id, type, severity, title, description, recommendation, source
("signals_engine"), created_at, metadata`.

## Signal types & severities

Severity: `info` (context) · `watch` (worth noticing) · `warning` (attention
soon) · `critical` (action now).

| Group | Signals | Severity |
|---|---|---|
| **Momentum** | `project_inactivity` (≥14d), `project_dormant` (≥30d) | warning / critical |
| **Roadmap** | `roadmap_no_now`, `roadmap_too_many_now` (>4), `roadmap_no_next` | warning / watch |
| **Milestones** | `milestone_none_active`, `milestone_no_tasks` | warning / watch |
| **Tasks** | `tasks_blocked`, `tasks_critical_priority`, `tasks_overdue`, `tasks_too_many_open` (>12) | warning / watch |
| **Decisions** | `decisions_none`, `decisions_stale` (>90d) | info / watch |
| **Money** | `money_monthly_high` (>$40/$50), `money_ai_high` (>$12/$20), `domain_renewal` (<45/<30d) | watch / warning |

> Note: a "milestone target overdue" signal was intentionally omitted —
> milestones have no target-date field in the schema; task overdue covers the
> need. (Documented as a known limitation.)

## Architecture / integration

- **Signals → Health:** the Health Engine's **Signals category** now *summarizes*
  the generated signals (per project: `100 − 5·watch − 15·warning − 30·critical`)
  instead of the seeded service signals. Health literally summarizes signals.
- **Health → Focus:** unchanged — Focus already consumes health (which now
  reflects signals), so signals influence focus indirectly and deterministically.
- **Repo pipeline** (`src/lib/data/index.ts`): one `pipeline()` gathers the data,
  runs `computeSignals` **once**, and threads the result into both
  `computeHealth` and `computeFocus`. New accessor: `getGeneratedSignals()`.

## Current output (seed)

11 deterministic signals, e.g. (matching the brief's example):

```
WardrobeHarmony has no recent activity — warning
  "No activity has been recorded in 14 days."
  → Review the roadmap or schedule a small task to maintain momentum.
```

Others: PersonalTrainer dormant-leaning (29d), no active milestone, nothing in
Now; Cascade nothing in Now; Home Cooked & WardrobeHarmony blocked tasks;
AI/monthly spend watch; wardrobeharmony.com renewal approaching; WardrobeHarmony
no recorded decisions (info).

Health now reflects them: **Home 91 Healthy · WardrobeHarmony 78 Stable ·
Cascade 73 Stable · PersonalTrainer 63 Attention Needed** (Signals category
85 / 65 / 85 / 55). Focus still produces a single deterministic Current Focus
(Home Cooked).

## UI (additive, no redesign)

The **Signals screen** leads with a new **Generated signals** card listing each
observation — severity-colored dot, title, severity badge, project, description,
and recommendation. The existing Service health, Activity stream, Integrations,
and Open alerts sections are unchanged. The header count is driven by the number
of warning/critical signals. Studio cards reflect the signals through the
updated health scores.

## Files
**New:** `src/lib/signals/engine.ts`, `src/components/signals/severity.tsx`, this summary.
**Changed:** `src/lib/health/engine.ts` (Signals category ← generated signals),
`src/lib/focus/engine.ts` (`generatedSignals` input), `src/lib/data/index.ts`
(pipeline + `getGeneratedSignals`), `src/app/signals/page.tsx`.
**Untouched:** schema, navigation, Decisions/Roadmaps/Tasks/Money behavior.

## Validation
- **Deterministic** (run1 === run2) — verified.
- **Signals fire** correctly across all six groups (11 on the seed).
- **Health summarizes signals** — Signals category now derives from generated
  signals; scores adjusted accordingly.
- **Focus consumes** the pipeline; single deterministic Current Focus.
- **All screens** (Studio, Focus, Roadmaps, Decisions, Signals, Money) → 200,
  unchanged in behavior; atmosphere background intact.

## Known limitations / future
- Generated signals are **recomputed per request** (deterministic, not persisted
  or trended).
- The seeded service-health `Signal[]` and the generated signals coexist (infra
  health vs product observations); a future pass could unify them.
- Momentum uses the canonical `lastActivityIso` snapshot (consistent with the
  project cards); a future pass could reconcile it with the activity feed.
- Could surface top critical/warning signals on the Studio "Needs Attention"
  panel (kept as-is here to avoid redesign).
- No external integrations — by design.
