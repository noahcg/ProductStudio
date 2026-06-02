# Phase 2.7 — The Focus Engine

> **Status:** Complete. A deterministic Focus Engine now decides what deserves
> attention today — the single Current Focus project + milestone, with an
> explainable recommendation and reasons. **No AI, no LLMs** — explicit signed
> scoring. No UI redesign; no schema changes.

## What it is

`src/lib/focus/engine.ts` — a pure function `computeFocus(input, now?)` over the
studio's domain inputs:

**Inputs:** `milestones, roadmap items, tasks, decisions, activity, signals`
(plus projects). **Output:** `FocusResult { current, ranked }`, where each
`ProjectFocus` has `{ project, milestone, score, tasksRemaining, lastActivityIso,
signals[], reasons[], recommendation }`.

Pure and deterministic: same inputs + clock → identical output, with a stable
tiebreak by `project.id`.

## Scoring (deterministic, documented in code)

Each project's score is a sum of explicit signed signals:

**Positive**
- Active milestone — progress × 0.5 (up to +50; finish what's almost done) + 15 if the milestone is `active`.
- Roadmap items in **Now** — +6 each (cap +18).
- Recent activity — +10 if any activity in the last 7 days.
- Project status — Active +12 / Planning +4.

**Negative**
- Blockers — −10 each.
- No activity for ≥14 days (stale) — −20.
- Overdue roadmap target dates — −15 each.
- Warning signals (project-scoped) — −10 each.
- Critical signals (project-scoped) — −20 each.

`decisions` are consumed for **context** (surfaced as an "N open decisions"
reason) but do not affect the score. "Last activity" is the most recent of the
activity feed and the project's snapshot.

## Determines

- **Current Focus project** — `ranked[0]` (exactly one).
- **Current Focus milestone** — that project's active milestone.

## Generates

- **Recommendation** — a deterministic sentence, e.g.
  - `Finish Family Sharing MVP before starting Recipe import from URL.`
  - `Clear 1 blocker on Family Sharing MVP, then finish it.` (blockers present)
  - `Ship <milestone>, then pick up <next>.` (no tasks remaining)
- **Explanation metadata** — `reasons[]` (human-readable) and `signals[]` (the
  signed score breakdown), so the user always sees *why*.

## Wiring (no redesign)

- The repository seam gained **`getFocusResult()`** (full ranking) and rewired
  **`getFocus()`** to return the Current Focus as the existing `Focus` view —
  so the **Studio "Current Focus" panel** is now engine-driven with no visual
  change.
- The **Focus screen** "What to work on next" list is fed by the engine ranking
  (computed server-side, passed to the client board). The existing
  "Why this is ranked here" box now leads with the **recommendation** sentence
  followed by **Reasons** — same layout, richer content.
- The old `src/lib/recommend.ts` heuristic is **removed**; the engine supersedes
  it.

## Files
**New:** `src/lib/focus/engine.ts`, this summary.
**Changed:** `src/lib/data/index.ts` (`getFocusResult`, engine-backed `getFocus`),
`src/app/focus/page.tsx` (passes `ranked`), `src/components/focus/focus-board.tsx`
(consumes `ranked`, shows recommendation).
**Removed:** `src/lib/recommend.ts`.
**Untouched:** schema, all other screens, routing, theme, navigation.

## Validation

Engine run over the seed (via `tsx`) and the live app:

| Check | Result |
|---|---|
| **Deterministic** (run1 === run2) | ✅ true |
| **Exactly one** Current Focus (`ranked[0] === current`) | ✅ true |
| Current Focus | ✅ Home Cooked — Family Sharing MVP |
| Recommendation | ✅ "Clear 1 blocker on Family Sharing MVP, then finish it." |
| Reasons | ✅ Milestone 83% complete · 3 tasks remaining · 2 items in Now · Last activity 2h ago · 1 blocker |
| Ranking | ✅ Home Cooked 81 · WardrobeHarmony 67 · Cascade 33 · PersonalTrainer 25 |
| Studio / Focus / Decisions / Roadmaps / Signals / Money | ✅ all 200, Studio & Focus visually unchanged |

> The recommendation reflects the **actual** seed (Home Cooked has 1 blocker),
> so it leads with clearing the blocker rather than the example's blocker-free
> wording — the example in the brief was illustrative.

## Explicitly NOT done (per scope)
- ❌ No AI / LLMs — pure deterministic scoring.
- ❌ No UI redesign · ❌ No schema changes · ❌ Other screens unchanged.
