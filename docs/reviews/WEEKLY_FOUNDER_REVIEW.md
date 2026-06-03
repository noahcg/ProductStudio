# Weekly Founder Review

> A deterministic, **no-AI** "chief-of-staff" synthesis of the whole portfolio:
> *what happened this period, and what to focus on next.* It connects the
> granular systems — activity, signals, health, focus — into one coherent
> narrative so the founder doesn't have to visit every screen.

This is **not** a report, analytics, or AI-generated fluff. Same data + clock →
identical review.

## Architecture

```
Product Studio data (projects, milestones, tasks, decisions, roadmap, activity)
   + Signals / Health engines + integrations (GitHub, Domains, Vercel, Supabase)
        ↓  data/index.ts pipeline  →  ReviewInput
        ↓  review/engine.ts  generateWeeklyReview(input, "7d")   ← pure, deterministic, no AI
   WeeklyReview { executiveSummary, recommendation, projects, healthChanges,
                  tasks, milestones, roadmap, decisions, signals, activity, momentum }
        ↓
   ┌─ /review  (Weekly Review Detail screen)
   ├─ Studio "Latest Review" card → View Review
   └─ reviews table / storedReviews fixture  (history)
```

- **`src/lib/review/types.ts`** — `WeeklyReview` and its parts.
- **`src/lib/review/engine.ts`** — `generateWeeklyReview` (the WeeklyReviewService).
- **`src/lib/data/reviews.ts`** — stored review history (mock fixture).
- **`supabase/migrations/…_weekly_reviews.sql`** — durable `reviews` table.
- **`src/app/review/page.tsx`** + **`src/components/review/review-view.tsx`** — detail screen.
- **`src/components/studio/latest-review.tsx`** — compact Studio card.

## Data sources

The review reads **only existing Product Studio data** via the standard pipeline
— it never fetches anything new and uses no external calls of its own:

| Section | Source |
|---|---|
| Health changes | Health Engine, run now vs **as-of** period start |
| Tasks completed | `task.completedAt` within the period |
| Milestone progress | task-derived progress (now vs as-of start) |
| New decisions | `decision.dateIso` within the period |
| Signals | the generated signals (Signals Engine + all integrations) |
| Activity | merged activity feed + GitHub commit counts |
| Momentum | Health Engine momentum per project |

## How "this period" deltas are computed (determinism)

There is no historical snapshot store, so **previous state is reconstructed
deterministically**: the engine re-runs the pure Health Engine *as of the period
start*, with this period's work rolled back —

- tasks completed within the window → treated as not-yet-completed,
- activity within the window → excluded,
- decisions within the window → excluded,
- integration status + generated signals → **held constant** across both points.

`delta = current − previous`. Holding integrations/signals constant means the
delta isolates the *work done this period* (task completion, milestone progress,
activity), which is exactly what a weekly review should reflect. Because the
studio clock is fixed and the engines are pure, the result is byte-identical on
every run.

## Review generation rules

**Executive summary** (chief-of-staff voice, a few plain sentences):
1. Primary project = most tasks completed (tiebreak: largest health gain).
2. Top milestone = largest positive progress delta → "X progressed from a% to b%".
3. Decline note = worst health delta, only if it actually declined (< −2).
4. Warnings = count of warning+critical signals, or "No operational warnings".

**Project summary** (one per project): health delta + direction, tasks completed,
milestone progress delta, new decisions, warning/critical signal count, and a
one-line verdict (`Healthy momentum.` / `Cooling off.` / `Attention recommended.`
/ `No active milestone.` / `Steady.`).

**Health changes**: previous → current (+Δ), classified improved / declined /
stable (±2 dead-band).

**Task summary**: completed (this period), created, blocked (current), reopened.
*Created/reopened are 0 — the task data has no create/reopen timestamps (see
limitations).*

**Milestone / Roadmap / Decision / Signals / Activity / Momentum**: progress
deltas; roadmap composition (Now/Next/Later); new decisions; signals grouped by
severity (meaningful items only, capped per group); commits/deployments/milestone
updates; strongest & weakest momentum with reasons.

## Recommendation rules (exactly one)

Distinct from the Focus Engine (which surfaces the highest-leverage place to
*ship*), the review's recommendation surfaces the project that most needs
**intervention**. Each project gets a deterministic attention score:

```
score  = (100 − healthScore) × 0.5
       + 35   if no active milestone
       + 25+  if health declined this period
       + 30   if no activity in ≥14 days   (+12 if ≥7)
       + 18×n critical signals (cap 40)
```

The highest score wins (ties break by project id). The reason string is built
from the triggers, e.g. *"No active milestone, declining health score, no
activity in 21 days."*

## Empty states

Every section degrades to a meaningful message (no tasks, no decisions, no
roadmap moves, no signals). When nothing material changed, the review is flagged
**quiet** and the summary reads *"Quiet week. No major changes were recorded…"* —
a calm, still-useful review rather than a blank screen.

## Review history

Generated reviews are deterministic and produced on demand. History is stored in
the `reviews` table (id, period start/end, generated_at, summary, recommendation,
metadata jsonb); mock mode ships a `storedReviews` fixture so "Earlier reviews"
is populated today. The detail screen lists prior reviews; the current one is
generated live.

## Known limitations

- **Created / reopened tasks aren't tracked** — the task fixtures carry only
  `completedAt`, so those counts are 0. Adding `createdAt` / status-history would
  populate them (no engine change needed).
- **Roadmap movements aren't tracked** — roadmap items have no change history, so
  the roadmap section shows current composition + "No roadmap moves recorded".
- **Integration status has no history** — deploy/usage/domain status is treated as
  constant background across the period (it still shows in the Signals section);
  the health *delta* reflects task/activity work. A future snapshot store could
  make infra changes show up as weekly health movement.
- **30-day period** is supported by the engine (`"30d"`) but intentionally not
  surfaced in the UI yet (monthly reviews are a future enhancement).
- **Deterministic by design** — no forecasting or AI. Phase 3.0 (Founder
  Intelligence) builds on this foundation.
