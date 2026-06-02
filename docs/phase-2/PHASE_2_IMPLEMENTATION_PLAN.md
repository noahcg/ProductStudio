# Product Studio — Phase 2 Implementation Plan

> **Status:** Planning only — no application code has been modified.
> **Inputs:** [`docs/audits/CURRENT_STATE.md`](../audits/CURRENT_STATE.md) ·
> [`docs/audits/DATA_SOURCE_AUDIT.md`](../audits/DATA_SOURCE_AUDIT.md)
> **Goal of Phase 2:** Turn the static, mock-driven MVP into a **persistent,
> database-backed founder OS** — incrementally, safely, and without a rewrite or
> any visual regression.

---

## Guiding principles (apply to every phase)

1. **Product Studio is the source of truth.** The application database *is*
   Product Studio's memory. GitHub, Vercel, Supabase-metrics, Cloudflare,
   OpenAI, and Anthropic are **integrations** — they *sync data into* the domain
   model. The UI never reads a third-party API directly; it always reads the
   Studio's own store.
   > Note the dual role of Supabase: in Phases 4–5 it is the **application
   > database** (our store). In Phase 10 "Supabase storage 82%" is a *monitored
   > service signal*. Different concern, same vendor.

2. **One data-access seam.** All screens read through a repository interface
   (`getProjects()`, `getDecisions()`, …). The implementation swaps from
   mock → DB behind that interface. This is what makes Phase 5 a drop-in.

3. **Integrations write in, the UI reads out.** No integration is ever a render
   dependency. Sync jobs populate tables; screens render tables.

4. **Each phase ships independently and is reversible.** Prefer an env/flag fallback
   (`DATA_SOURCE=mock|db`) so any phase can be rolled back without reverting code.

5. **Visual parity is a gate.** Every phase is validated against the existing
   screenshots. If pixels move, the phase is not done.

### Global guardrails — these do NOT change in Phase 2
- ❌ **No left sidebar.** Navigation stays the existing top `AppHeader`.
- ❌ **No multi-user features.** No `users`/`teams`/memberships, no login screen,
  no per-user RLS tenancy. Single implicit owner ("Noah").
- ❌ **No rebuild.** We refactor the existing tree; we do not regenerate it.
- ❌ **No integration before the local domain model exists** (Phases 1–8 precede 9–10).
- ❌ **No visual redesign.** Dark premium theme, layout, spacing, and components
  are preserved. New UI (forms/editors) must reuse `components/ui.tsx` primitives.
- ❌ **No change to the recommendation heuristic's intent** — it stays transparent
  and explainable; only its *inputs* move from mock to real.

### Target architecture (end of Phase 2)
```
            integrations/ (GitHub, Vercel, …)   ── sync ──▶  ┌───────────────┐
                                                             │  Supabase DB  │  ◀── source of truth
  UI (server components)  ── repo interface ──▶ repo/supabase │ (Product      │
  client islands (Focus,  ── server actions ──▶              │  Studio)      │
  Decisions, Roadmaps)                                        └───────────────┘
                                  repo/mock  (fallback via DATA_SOURCE flag)
```

### Dependency order
`1 → 2 → 3 → 4 → 5` are sequential (each depends on the prior).
`6, 7, 8` depend on 5 and can be parallelized.
`9` depends on 8 (domain model + activity persistence). `10` depends on 9.

---

## Phase 1 — Stabilize current UI

**Goal:** Fix the known correctness/consistency issues from the audit on a
*frozen* visual and data architecture, so later phases build on a clean base.
No new data sources, no schema, no integrations.

Scope (from CURRENT_STATE §8–10):
- Unify the clock: one time source feeding both the header and relative labels.
- Fix the Decisions strike-through bug (only strike options on `Decided` cards).
- Remove the `studioStats.needsAttention || 1` fallback (show the true count).
- Derive footer copy ("3 updates / 2 products") and the bell badge from data
  rather than literals — **must keep the same rendered numbers** for now.
- Remove dead code (`daysUntil` re-export, unused `accent` entries); replace the
  fragile regex reason-parsing in `recommend.ts` with a typed input where trivial.
- Add `error.tsx` / `loading.tsx` / `not-found.tsx` (needed once data goes async).
- Pin `lucide-react` intentionally; add minimal test + typecheck CI.

**Files likely affected:**
- `src/components/layout/app-header.tsx` (clock source)
- `src/lib/data.ts` (`NOW`, `studioStats` fallback)
- `src/app/decisions/page.tsx` (strike-through condition)
- `src/app/page.tsx` (footer derivation)
- `src/lib/recommend.ts` (dead code / reason parsing)
- `package.json` (lucide pin, test scripts)

**New files likely needed:**
- `src/lib/clock.ts` (single `now()` source)
- `src/app/error.tsx`, `src/app/loading.tsx`, `src/app/not-found.tsx`
- `vitest.config.ts` + `src/lib/__tests__/recommend.test.ts` (lock current behavior)
- `.github/workflows/ci.yml` (typecheck + build + test) — optional but recommended

**Risks:**
- Deriving footer/badge could *change displayed numbers* if computed differently
  than the literals → mitigate by asserting the computed value equals today's.
- Unifying the clock shifts relative labels if the chosen source differs from
  `NOW` → keep `NOW` as the single source for this phase to preserve labels.

**Validation steps:**
- `npm run build` + typecheck clean; new tests green.
- Screenshot diff of all six routes vs. existing captures → pixel-identical.
- Manually confirm Decisions "Open" cards no longer strike all options.

**What NOT to change:**
- No layout, color, spacing, or component-structure changes.
- No data *shape* changes (still `data.ts` arrays).
- No new runtime dependencies beyond test tooling.
- Do not yet introduce the repository seam (that is Phase 2).

---

## Phase 2 — Extract hard-coded data into structured mock data (+ introduce the repo seam)

**Goal:** Decouple the UI from raw module-level arrays. Split the monolithic
`data.ts` into structured fixtures and route **all** reads through an async
**repository interface**. Behavior and pixels unchanged; this is purely the
seam that Phases 4–5 plug into.

Scope:
- Define `repo` interface: `getProjects()`, `getProject(id)`, `getFocus(projectId?)`,
  `getDecisions()`, `getRoadmap()`, `getSignals()`, `getActivity()`, `getAlerts()`,
  `getSpend()`, `getStudioStats()`. All `async`, all returning domain types.
- Provide a **mock implementation** backed by the (now structured) fixtures.
- Convert server components to `await repo.getX()`.
- Convert client islands (`FocusBoard`) to **receive data via props** from a
  server component instead of importing `data.ts` — this removes the
  client→data coupling that would otherwise break the DB swap.
- Pull scattered literals into constants (single color palette per
  CURRENT_STATE §10; effort labels; thresholds).

**Files likely affected:**
- Every component importing `@/lib/data` directly: all `studio/*`,
  `focus/focus-board.tsx`, all `app/**/page.tsx`, `components/icons.tsx`.

**New files likely needed:**
- `src/lib/repo/index.ts` (interface + `getRepo()` selector)
- `src/lib/repo/mock.ts` (mock impl over fixtures)
- `src/lib/fixtures/{projects,focus,decisions,roadmap,signals,activity,alerts,spend}.ts`
- `src/lib/constants/colors.ts`, `src/lib/constants/labels.ts`

**Risks:**
- **Wide blast radius** — many import sites change at once → do it mechanically,
  one entity at a time, building between each.
- **Server/client boundary** — `FocusBoard` is a client component; it must not
  import server-only repo code. Mitigate by lifting data fetch to a server
  wrapper and passing props (already wrapped in `<Suspense>`).
- Pages may shift from static to dynamic once reads are `async` → acceptable;
  verify still prerender where possible.

**Validation steps:**
- Typecheck + build clean; screenshot parity on all six routes.
- Grep confirms no component imports `@/lib/data` arrays directly anymore.

**What NOT to change:**
- No visual changes; no domain-type *semantics* changes (Phase 3 does that).
- No DB, no integrations.
- Do not delete the fixtures — they remain the mock fallback for the whole phase set.

---

## Phase 3 — Define the core Product Studio domain model

**Goal:** Formalize the implicit schema (CURRENT_STATE §4) into a coherent,
relational **domain model** that the DB and repo will share. Promote concepts
the UI currently fudges to first-class entities.

Scope:
- Entities: `Project`, `Milestone`, `Task`, `Decision` (+ `DecisionOption`),
  `RoadmapItem`, `Activity`, `Alert`, `Integration`, `Expense` / `SpendSnapshot`.
- Make **Milestone** and **Task** first-class (today `Focus` embeds tasks and
  `focusForProject` *synthesizes* them — see DATA_SOURCE_AUDIT Focus table).
  `progress` becomes derivable from tasks; pick ONE progress rule and document it.
- Stable IDs, enums (status/priority/effort/level/kind), and explicit FK fields
  (`project_id`, `milestone_id`).
- Express the repo interface in terms of these entities (Focus becomes a
  *view* composed from Milestone + Tasks, not a stored entity).

**Files likely affected:**
- `src/lib/types.ts` (reorganized/expanded)
- `src/lib/repo/index.ts` (method signatures align to entities)
- `src/lib/repo/mock.ts` + fixtures (adapt to the formal model)
- `src/lib/recommend.ts` (consume typed inputs, drop string parsing)

**New files likely needed:**
- `src/lib/domain/` (one module per entity, or a single `model.ts`)
- `docs/phase-2/DOMAIN_MODEL.md` (ER description + the canonical progress rule)

**Risks:**
- **Type churn** rippling into components → keep entity field names aligned with
  current usage where possible to minimize edits.
- **Over-modeling** — model only what the six screens + recommendation need.
- Reconciling the 83%-vs-task-count progress inconsistency may shift a displayed
  number → decide deliberately and note it in `DOMAIN_MODEL.md`.

**Validation steps:**
- Typecheck clean; mock repo returns data conforming to the new model.
- Screenshot parity (or a single, documented, intentional progress-number change).
- `recommend.test.ts` still green (behavior preserved over typed inputs).

**What NOT to change:**
- No database yet, no integrations, no UI layout.
- Do not add user/tenant entities (single-owner constraint).

---

## Phase 4 — Add Supabase schema and seed data

**Goal:** Stand up Supabase as Product Studio's **own persistence layer**.
Create migrations that mirror the Phase 3 domain model and seed them from the
current fixtures. **Schema + seed + server client only — no UI wiring yet.**

Scope:
- SQL migrations: `projects`, `milestones`, `tasks`, `decisions`,
  `decision_options`, `roadmap_items`, `activity`, `alerts`, `integrations`,
  `expenses` (and a `spend_snapshots`/`spend_history` table for Money trend).
- Seed script populated from `src/lib/fixtures/*` so DB == current mock state.
- Server-side Supabase client; secrets via env.
- **Single-owner:** no `users` table, no per-user RLS tenancy. (If RLS is enabled
  at all, it is a blanket owner policy — not multi-tenant.)

**Files likely affected:**
- `package.json` (add `@supabase/supabase-js`, supabase CLI scripts)
- `.gitignore` (`.env.local`, `supabase/.temp`)

**New files likely needed:**
- `supabase/migrations/0001_init.sql` … (one per entity group)
- `supabase/seed.sql` (or `scripts/seed.ts` reading fixtures)
- `src/lib/supabase/server.ts` (server client factory)
- `.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATA_SOURCE`)
- `docs/phase-2/SUPABASE_SETUP.md`

**Risks:**
- **Secrets handling** — service-role key must stay server-only; never shipped to
  the client. Document clearly; add to `.gitignore`.
- **Schema/domain drift** — migrations must match Phase 3 exactly → generate types
  (`supabase gen types`) and diff against `domain/`.
- Local vs hosted Supabase confusion → standardize on local CLI for dev.
- Conflating app-DB Supabase with the *monitored* Supabase signal → name things
  unambiguously (`supabase/` = our DB).

**Validation steps:**
- `supabase db reset` applies all migrations + seed with no errors.
- A throwaway script (`scripts/check-db.ts`) selects rows and counts match fixtures.
- Generated DB types compile against the domain model.
- **UI is untouched and still renders from mock** — confirm by running the app.

**What NOT to change:**
- Do not point any screen at the DB yet (that is Phase 5).
- Do not delete fixtures or the mock repo.
- No auth, no RLS multi-tenancy, no `users` table.
- No integrations.

---

## Phase 5 — Replace mock project data with database-backed data

**Goal:** Implement the repository against Supabase and flip the UI's data source
from mock → DB **behind the existing interface**, starting with projects and the
entities the Studio dashboard needs. Read-only first. Mock stays as a fallback
via `DATA_SOURCE`.

Scope:
- `repo/supabase.ts` implementing the Phase 2/3 interface with real queries
  (use joins/aggregates to avoid the current `.find()` N+1 lookups).
- `getRepo()` selects impl by `DATA_SOURCE` env (`db` default, `mock` fallback).
- Real empty/error/loading states (the boundaries added in Phase 1).
- Start with `getProjects/getProject/getStudioStats`, then milestones/activity/
  decisions/roadmap/spend reads.

**Files likely affected:**
- `src/lib/repo/index.ts` (selector)
- Server components already call `repo.*` (from Phase 2) → minimal/no UI edits.
- `src/app/**/page.tsx` may switch from static to dynamic rendering.

**New files likely needed:**
- `src/lib/repo/supabase.ts`
- Per-route `loading.tsx` if not already global.

**Risks:**
- **Static → dynamic rendering** shift; verify caching/revalidation strategy.
- **Parity gaps** — DB data must equal seeded mock exactly for the screenshot gate.
- Client islands must receive DB data via props (relies on Phase 2 being done right).
- Query performance / shape mismatches.

**Validation steps:**
- With `DATA_SOURCE=db`, all six routes match mock screenshots pixel-for-pixel.
- Toggle `DATA_SOURCE=mock` → identical render (proves the seam).
- Build + typecheck; basic query timing sane.

**What NOT to change:**
- No writes yet (reads only); no visual changes.
- Keep the mock implementation intact as fallback.
- No integrations; no auth.

---

## Phase 6 — Add Decisions / Product Memory (first writable surface)

**Goal:** Make Decisions a real **CRUD** surface persisted in the DB — Product
Studio's "memory." This proves the write path (server actions + revalidation)
on the lowest-risk screen.

Scope:
- Create / edit / change-status / archive decisions and their options.
- Server actions with validation + `revalidatePath('/decisions')`.
- Inline/modal editor built **only** from existing `ui.tsx` primitives
  (Card, Badge, Button) in the dark premium style — no new design language.

**Files likely affected:**
- `src/app/decisions/page.tsx` (wire actions, add "New decision" affordance)
- `src/lib/repo/{index,supabase,mock}.ts` (add decision mutations)
- `src/lib/types.ts` (mutation input types)

**New files likely needed:**
- `src/app/decisions/actions.ts` (server actions)
- `src/components/decisions/decision-editor.tsx` (form/modal)
- Validation tests for the action layer.

**Risks:**
- First mutations: optimistic UI, error handling, revalidation correctness.
- Visual drift via new form components → must match existing cards/badges.
- The Phase-1 strike-through fix interacts with editable options — re-verify.

**Validation steps:**
- Create/edit/delete persists across reload; `Open`/`Decided`/`Revisit` transitions work.
- Header "N open / N decided" counts update live.
- Screenshot parity for the read view; new editor reviewed against the design system.

**What NOT to change:**
- No auth gating, no multi-user attribution, no sidebar.
- Other screens remain read-only.
- No integrations.

---

## Phase 7 — Add Roadmaps (writable, Studio-owned)

**Goal:** Make Now / Next / Later persisted and editable. Roadmap items are
**Studio-owned** planning artifacts — not derived from any integration.

Scope:
- Add item, move between columns, set effort, tag as milestone, link to a
  project (and optionally a milestone).
- Column moves via buttons first (DnD optional, later); maintain ordering.
- Server actions + revalidation, mirroring Phase 6 patterns.

**Files likely affected:**
- `src/app/roadmaps/page.tsx`
- `src/lib/repo/{index,supabase,mock}.ts` (roadmap mutations, ordering)
- `src/lib/types.ts`

**New files likely needed:**
- `src/app/roadmaps/actions.ts`
- `src/components/roadmaps/roadmap-item-editor.tsx`

**Risks:**
- **Ordering within a column** (position field) and move concurrency.
- DnD, if attempted, adds a dependency + complexity → defer; buttons first.
- Linking to projects/milestones must use real FKs from Phase 4.

**Validation steps:**
- Add/move/edit/delete persists; per-column counts update; project links resolve.
- Screenshot parity for the board layout; editor matches design system.

**What NOT to change:**
- Three-column layout and visuals stay.
- No GitHub/issue linkage yet (that is Phase 9+).
- No sidebar, no auth, no multi-user.

---

## Phase 8 — Add Focus Engine (recommendation over real data)

**Goal:** Make the Focus screen fully real: first-class persisted milestone
tasks, **persistent task toggling** (closes CURRENT_STATE §9.5), task-derived
progress, and the recommendation engine scoring **DB-backed** inputs with
structured (not regex-parsed) signals.

Scope:
- `recommend.ts` consumes `repo` data (projects + milestones + tasks + alerts +
  real timestamps) instead of mock arrays; drop string parsing (Phase 3 enabled this).
- Persist task `done/active/todo` via server action; recompute progress + "N remaining".
- Replace `focusForProject` synthesis with real milestone/task reads.
- Resolve the progress definition decided in Phase 3 (single rule, applied here).
- `studioStats.needsAttention` derived from real alerts (Phase 1 removed the fudge).

**Files likely affected:**
- `src/lib/recommend.ts` (inputs)
- `src/components/focus/focus-board.tsx` (props + toggle action)
- `src/components/studio/current-focus.tsx`, `studio/stat-row.tsx`
- `src/lib/repo/*` (milestones/tasks reads + task mutation)
- removal of `focusForProject` from the data layer

**New files likely needed:**
- `src/app/focus/actions.ts` (toggle task / set active milestone)
- `recommend` tests over seeded DB data.

**Risks:**
- **Progress consistency** (the 83% vs task-count issue) surfaces here — must be
  resolved deterministically or a number visibly changes.
- Client/server boundary for `FocusBoard` toggling (server action + revalidate).
- Recommendation order must stay stable & explainable over real timestamps.

**Validation steps:**
- Toggling a task persists across reload; ring + "remaining" + Studio stat update.
- Recommendation ranking + reasons render from real data and match the documented heuristic.
- Screenshot parity (modulo the intentional, documented progress reconciliation).

**What NOT to change:**
- Keep the heuristic transparent; do not turn it into an opaque/ML model.
- No integrations yet — inputs are the Studio DB only.
- Visuals, layout, no sidebar.

---

## Phase 9 — Add GitHub integration (first external source; syncs *into* the model)

**Goal:** The first real integration. GitHub **syncs commit/issue/PR events and
last-activity into** the `activity` table and project metadata. The UI continues
reading the Studio DB — GitHub is never a render dependency and never the source
of truth.

Scope:
- Connect a repo per project (reuse existing `project.repo`).
- Read-only, idempotent sync mapping GitHub events → `Activity` rows; update
  `project.last_activity`; feed the staleness alert from real data.
- Sync via an API route / server action (manual trigger first; scheduled later).
- Record connection state in the `integrations` table (single owner token).

**Files likely affected:**
- `src/app/signals/page.tsx`, `src/components/studio/recent-activity.tsx`
  (already DB-backed from Phase 5 — they just show synced rows now).
- `src/lib/repo/*` (write activity from sync).

**New files likely needed:**
- `src/lib/integrations/github.ts` (typed client)
- `src/app/api/sync/github/route.ts` (or `src/lib/integrations/sync.ts`)
- `supabase/migrations/****_integration_state.sql` if connection fields are added
- `.env` additions (`GITHUB_TOKEN`), `docs/phase-2/INTEGRATIONS.md`

**Risks:**
- **Secrets / token scope**; **rate limits**; partial-failure handling.
- Event→`Activity` mapping fidelity; **idempotency** (no duplicate rows on re-sync).
- Temptation to read GitHub live in the UI → forbidden; must go through the DB.

**Validation steps:**
- Trigger sync → `activity` populated; Studio + Signals show synced events.
- Re-running sync does not duplicate rows.
- Disconnecting the integration degrades gracefully (DB rows remain; no crash).
- Build + typecheck.

**What NOT to change:**
- UI reads the DB, not the GitHub API.
- No write-back to GitHub; no OAuth multi-user flow (single owner token).
- GitHub does not become source of truth — it augments it.
- Visuals unchanged.

---

## Phase 10 — Add infrastructure / signals integrations (later)

**Goal:** Layer the remaining integrations the same way as GitHub — each **syncs
into** domain tables (`signals`, `activity`, `spend_snapshots`). Money becomes
backed by a **billing aggregator**. All optional, independently toggleable, and
graceful when disconnected.

Scope (each independently shippable):
- **Vercel** → deployment signals/activity + hosting cost.
- **Supabase (metrics)** → storage/usage signal/activity + Supabase cost.
  *(The monitored service — distinct from our app DB.)*
- **Cloudflare** → domain health + renewal alerts/expiry + domain cost.
- **OpenAI / Anthropic** → usage signal + cost.
- **Billing aggregator** → normalizes all provider billing into `spend_snapshots`,
  powering the Money totals, donut, trend, deltas, and per-project rollups
  (DATA_SOURCE_AUDIT Money + reverse-index).

**Files likely affected:**
- `src/app/signals/page.tsx`, `src/app/money/page.tsx` (read DB — minimal change).
- `src/lib/repo/*` (signals + spend reads/writes).

**New files likely needed:**
- `src/lib/integrations/{vercel,supabase,cloudflare,openai,anthropic}.ts`
- `src/lib/integrations/billing.ts` (aggregator → `spend_snapshots`)
- `src/app/api/sync/[provider]/route.ts` and/or scheduled jobs
- `supabase/migrations/****_spend_snapshots.sql` (if not added in Phase 4)
- `.env` additions per provider; expand `docs/phase-2/INTEGRATIONS.md`.

**Risks:**
- **Many heterogeneous APIs**; billing/usage endpoints differ and change.
- **Spend normalization** correctness; currency/period alignment.
- **Scheduling infrastructure** (cron/queue) and **secret sprawl**; rate limits.
- Keeping each integration optional so a missing key never breaks a screen.

**Validation steps:**
- Each provider toggled independently; Signals + Money reflect synced data.
- Disconnected providers fall back to empty/mock state without errors.
- Money figures reconcile to provider invoices within tolerance.
- Build + typecheck; sync jobs idempotent.

**What NOT to change:**
- UI source remains the Studio DB; no integration is source of truth.
- No multi-user; no sidebar; visuals preserved.
- Do not block screen render on any external API call.

---

## Phase-by-phase summary

| # | Phase | Persists? | New external dep | Risk | UI visual change |
|---|---|---|---|---|---|
| 1 | Stabilize UI | no | none | low | none (gate) |
| 2 | Structured mock + repo seam | no | none | medium (blast radius) | none |
| 3 | Domain model | no | none | medium (type churn) | none* |
| 4 | Supabase schema + seed | DB ready | `@supabase/supabase-js` | medium | none |
| 5 | DB-backed reads | reads | — | medium (static→dynamic) | none |
| 6 | Decisions / Memory | writes | — | medium (first writes) | additive editor only |
| 7 | Roadmaps | writes | — | medium (ordering) | additive editor only |
| 8 | Focus Engine | writes | — | medium (progress rule) | none* |
| 9 | GitHub integration | sync-in | GitHub API | high | none |
| 10 | Infra/billing integrations | sync-in | many APIs | high | none |

\* Phases 3 & 8 may include **one** intentional, documented progress-number
reconciliation; otherwise visuals are unchanged.

## Definition of done (Phase 2 overall)
- All six screens render from the Supabase-backed repo with `DATA_SOURCE=db`,
  and fall back to mock with `DATA_SOURCE=mock` — both pixel-matching today.
- Decisions, Roadmaps, and Focus tasks are **persisted and editable**.
- GitHub (and optionally other providers) **sync into** the Studio DB; the UI
  never calls a third-party API at render time.
- No sidebar, no multi-user, no visual regression, no rewrite.
