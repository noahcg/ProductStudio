# Phase 2.15 — Weekly Founder Review

> The Weekly Founder Review: a deterministic, **no-AI** chief-of-staff synthesis
> that answers *"What happened across my products this week, and what should I
> focus on next?"* It connects the granular systems — activity, signals, health,
> focus — into one coherent narrative, so the founder doesn't need to visit every
> screen. Not a report, not analytics, not AI fluff.

See [`docs/reviews/WEEKLY_FOUNDER_REVIEW.md`](../reviews/WEEKLY_FOUNDER_REVIEW.md)
for generation rules, recommendation rules, data sources, and limitations.

## Architecture

```
Pipeline data + Signals/Health engines + integrations  →  ReviewInput
  → review/engine.ts  generateWeeklyReview(input, "7d")   (pure, deterministic, NO AI)
  → WeeklyReview
  → /review detail screen · Studio "Latest Review" card · reviews history store
```

- **`src/lib/review/types.ts`** — `WeeklyReview` + parts (project reviews, health
  changes, summaries, momentum, recommendation, `StoredReview`).
- **`src/lib/review/engine.ts`** — the WeeklyReviewService. Pure functions, no I/O.
- **`src/lib/data/reviews.ts`** + **`…_weekly_reviews.sql`** — history store.
- **`src/app/review/page.tsx`** + **`src/components/review/review-view.tsx`** — detail screen.
- **`src/components/studio/latest-review.tsx`** — compact Studio card.
- Accessors: `getWeeklyReview("7d")`, `getReviewHistory()` in `src/lib/data/index.ts`.

## How it stays deterministic (the key idea)

There is no historical snapshot store, so **previous state is reconstructed by
re-running the pure Health Engine *as of* the period start** — with this period's
task completions / activity / decisions rolled back, and integration status +
signals held constant. `delta = current − previous` then isolates the work done
this period. Fixed studio clock + pure engines → byte-identical review every run.

To make those deltas realistic, the task fixtures' uniform `completedAt` was
spread across dates (some before the window, some within it), so the review shows
genuine weekly movement (e.g. Home Cooked advanced; WardrobeHarmony was quiet).

## What the review contains

Executive summary · single Recommended Focus · per-project summaries (health Δ,
tasks done, milestone Δ, decisions, signals, verdict) · health changes · task
summary · milestone progress · roadmap composition · new decisions · signals
grouped by severity · activity (commits / deployments / milestone updates) ·
strongest & weakest momentum · review history.

## Metric thresholds & rules

- **Change direction**: improved / declined / stable with a ±2 dead-band.
- **Verdict**: `No active milestone.` → `Attention recommended.` → `Cooling off.`
  → `Healthy momentum.` → `Steady.`
- **Recommendation (one)**: attention score = `(100−health)×0.5 + 35 no-milestone
  + 25+ declining + 30 idle≥14d + 18×crit-signals`; highest wins, ties by id.
- **Quiet week**: no completions, no decisions, no milestone movement, no warnings
  → calm but still-complete review.

## Sample output (mock, period 2026-05-31 → 2026-06-07)

```
Executive summary
  • This week focused primarily on Home Cooked.
  • Family Sharing MVP progressed from 58% to 83%.
  • N operational warnings require attention.

Recommended focus: PersonalTrainer — No active milestone, …

Home Cooked      health +8  · 3 done · Family Sharing MVP +25% · Healthy momentum.
WardrobeHarmony  health ±0  · 0 done · Closet Import +0%       · Steady.
PersonalTrainer  health +9  · 0 done · Client Scheduling +0%   · No active milestone.
Cascade Lounge   health ±0  · 1 done · Spring Content Drop +13%· Healthy momentum.
```

## Validation — all 17 points PASS

Verified via `npm run build` (clean), a standalone determinism test (`tsx`,
identical output across runs), and live HTTP checks against `npm run start`.

1. **Reviews generate successfully** — `/review` renders the full review (200). ✅
2. **Uses existing Product Studio data** — built from the standard pipeline; no new fetches. ✅
3. **Deterministic** — identical serialized output across repeated runs. ✅
4. **Health changes included** — per-project previous → current (±Δ). ✅
5. **Task summaries included** — completed/created/blocked/reopened. ✅
6. **Roadmap summaries included** — Now/Next/Later + movement note. ✅
7. **Decision summaries included** — new decisions this period. ✅
8. **Signals included** — grouped by severity, meaningful items only. ✅
9. **Recommendation generated** — exactly one Recommended Focus with reason. ✅
10. **Review history stored** — `reviews` table + `storedReviews` fixture + "Earlier reviews". ✅
11. **Studio screen visually unchanged** — one compact "Latest Review" card added; 200. ✅
12. **Focus screen still works** — board renders (200). ✅
13. **Signals screen still works** — all four signal groups render (200). ✅
14. **GitHub integration still works** — no-activity/stale-PR signals present. ✅
15. **Domain Monitoring still works** — SSL/expiry signals present. ✅
16. **Vercel integration still works** — repeated-failure signals present. ✅
17. **Supabase Monitoring still works** — unavailable/capacity signals present. ✅

## Known limitations

- **Created / reopened task counts are 0** — fixtures carry only `completedAt`;
  adding `createdAt` / status history would populate them (no engine change).
- **Roadmap movements aren't tracked** — no per-item change history; the section
  shows current composition + "No roadmap moves recorded this period".
- **Integration status has no history** — treated as constant background across
  the period (still shown under Signals); health *delta* reflects task/activity
  work. A future snapshot store would let infra changes move weekly health.
- **30-day period** is supported by the engine but not surfaced in the UI yet
  (monthly reviews are a deliberate future enhancement).

## Constraints honored

No AI · no OpenAI/Anthropic calls · no marketing-style summaries · no reporting
dashboard · no app redesign. A trusted chief-of-staff reviewing the portfolio —
deterministic, explainable, grounded in existing data.

## Next

Phase 3.0 — Founder Intelligence Layer (milestone/focus/risk forecasting, release
readiness, launch planning, portfolio balancing). The Weekly Founder Review is the
foundation; these remain deterministic unless explicitly designed otherwise.
