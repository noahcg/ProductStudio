# Phase 2.9 — Project Health Engine

> **Status:** Complete. A deterministic Project Health Engine evaluates each
> project's overall condition (0–100) across six categories and **explains why**.
> Health is a balanced input into the Focus Engine, shown on Studio cards and in
> a project Health Summary. No AI/LLMs, no external integrations, no redesign;
> existing Product Studio data only.

## What it is

`src/lib/health/engine.ts` — `computeHealth(input, now?)` over the studio's
domain inputs (projects, milestones, tasks, roadmap, decisions, activity,
signals). Returns a `ProjectHealth[]`: per project a `score` (0–100), a
`status`, six `categories` (each with a 0–100 score + a ✓/⚠ reason), plus
`momentum`/`risk` surfaced for the Focus Engine. Pure & deterministic — same
inputs + clock → identical output.

## Scoring model

Each category is scored 0–100; the overall score is their **weighted average**.

| Category | Weight | Measures | Positive ↑ | Negative ↓ |
|---|---|---|---|---|
| **Momentum** | 0.20 | recent activity + recent task completion | activity within 7 days; recent completions | inactivity |
| **Execution** | 0.25 | task + milestone completion | task-derived progress; tasks completed | many remaining |
| **Planning** | 0.15 | roadmap quality | Now & Next items exist | empty roadmap |
| **Focus** | 0.10 | active milestone exists | active milestone | none active |
| **Risk** | 0.20 | blockers / overdue | few blockers | blocked / overdue tasks |
| **Signals** | 0.10 | warnings / criticals | healthy | warnings / criticals |

**Category formulas** (deterministic):
- Momentum = `0.6·activityScore + 0.4·completionScore`, where activityScore is
  banded by idle days (≤2→100, ≤7→75, ≤13→45, ≤29→20, else 5) and completionScore
  by tasks completed in the last 7 days (≥3→100, ≥1→70, else 30).
- Execution = task-derived `progress − max(0, remaining−6)·4`; falls back to
  `min(milestone.progress, 50)` (has milestone, no tasks) or `10`.
- Planning = `10 + 45·(now>0) + 30·(next>0) + 15·(later>0)`.
- Focus = active milestone `100` / has milestone `50` / none `10`.
- Risk = `100 − 18·blocked − 15·overdue`.
- Signals = `100 − 20·warnings − 40·criticals`.

**Status ranges:** 90–100 Healthy · 70–89 Stable · 50–69 Attention Needed · 0–49 At Risk.

## Calculation examples (current seed)

**Home Cooked → 92 Healthy** (matches the brief)
`0.20·100 + 0.25·83 + 0.15·100 + 0.10·100 + 0.20·82 + 0.10·100 = 92.15 → 92`
Reasons: ✓ Recent activity (2h ago) · ✓ 10/12 tasks complete (83%) · ✓ Now & Next planned · ✓ Active milestone · ⚠ 1 blocked task · ✓ Signals healthy.

| Project | Momentum | Execution | Planning | Focus | Risk | Signals | **Score** | Status |
|---|---|---|---|---|---|---|---|---|
| Home Cooked | 100 | 83 | 100 | 100 | 82 | 100 | **92** | Healthy |
| WardrobeHarmony | 100 | 50 | 85 | 100 | 82 | 100 | **82** | Stable |
| Cascade Lounge | 85 | 38 | 55 | 100 | 100 | 100 | **75** | Stable |
| PersonalTrainer | 88 | 25 | 55 | 50 | 100 | 100 | **67** | Attention Needed |

## Focus Engine integration

The Focus Engine (`src/lib/focus/engine.ts`) computes health and adds **balanced**
signals (it must not override milestone progress):

- Needs attention: `+(100 − health.score)·0.15`
- Momentum: `+(health.momentum − 50)·0.10`
- Risk present: `+(100 − health.risk)·0.08`

Plus a `Health N/100 — Status` reason for transparency. These nudge
attention-needing projects up without flipping the leader: Home Cooked stays #1
(75 → 81 after health), the single deterministic Current Focus.

## UI integration (no redesign)

- **Studio cards** — a compact `92 Healthy` pill (status-colored dot) top-left of
  each card; status badge stays top-right. Reuses `HealthBadge`.
- **Project detail (Focus screen)** — a **Project Health** summary card under the
  ranking: overall score/status + the six category bars, each with its ✓/⚠ reason.

## Empty states / fallback behavior

The engine **always produces a score** — each category has a fallback:
- No activity → Momentum activityScore = 5 (still blended with completions).
- No roadmap → Planning = 10.
- No milestone → Focus = 10; Execution = 10.
- No tasks → Execution = `min(milestone.progress, 50)` or 10; Momentum completion = 30.
- No signals → Signals = 100 ("no news is good news").

A project with **no data at all** scores **49 (At Risk)** — verified.

## Files
**New:** `src/lib/health/engine.ts`, `src/components/health-badge.tsx`,
`src/components/focus/health-summary.tsx`, this summary.
**Changed:** `src/lib/focus/engine.ts` (health inputs), `src/lib/data/index.ts`
(`getProjectHealth`), `src/components/studio/project-card.tsx`,
`src/app/page.tsx`, `src/components/focus/focus-board.tsx`, `src/app/focus/page.tsx`.
**Untouched:** schema, navigation, Decisions/Roadmaps/Tasks/Signals/Money.

## Validation

| # | Check | Result |
|---|---|---|
| 1 | Every project receives a score | ✅ |
| 2 | Every project receives a status | ✅ |
| 3 | Every score includes explanations | ✅ ✓/⚠ reasons per category |
| 4 | Focus Engine consumes health data | ✅ Home Cooked 75→81; `Health` reason present |
| 5 | Studio displays health | ✅ pills on all cards |
| 6 | Navigation unchanged | ✅ |
| 7–11 | Decisions / Roadmaps / Tasks / Signals / Money work | ✅ all 200 |

Deterministic verified (run1 === run2).

## Known limitations
- **Signals are mostly studio-level** in the current data (no `project_id`), so
  the Signals category is ~100 for every project; it activates when
  project-scoped signals exist.
- Health uses the **activity feed + project snapshot** for momentum; where the
  denormalized `lastActivityIso` lags the feed, the feed (more recent) wins —
  which can differ from the older "stale" alert copy.
- Scores recompute per request (cheap, deterministic); not persisted/trended.

## Future enhancements
- Health **trend** over time (store snapshots; show deltas).
- Per-project signal attribution to sharpen the Signals category.
- Configurable weights; a portfolio-level health rollup.
- Drive the decorative milestone rings from health/task data (see Phase 2.8 note).
