# Phase 2.5 — Decisions / Product Memory (first writable feature)

> **Status:** Complete. Decisions is now a real CRUD "product memory" surface —
> create / edit / delete / filter / search / tag — persisted through the
> existing repository seam (Supabase when configured, an in-memory mock store
> otherwise). No app redesign, no external integrations, no auth/multi-user, no
> navigation changes. Studio, Focus, Roadmaps, Signals, and Money are unchanged.

## What shipped

- The **Decisions screen** upgraded from display-only to interactive:
  - **Create / Edit / Delete** decisions (modal form, built from the existing
    design system).
  - **Filter by project** and **free-text search** (title, decision, rationale,
    trade-offs, status, tags) — client-side, instant.
  - **Tags** on every decision (chips on cards; comma-separated in the form).
  - **Optimistic UI** for create/edit/delete (`useOptimistic` + `useTransition`)
    with graceful error surfacing; server actions `revalidatePath` to reconcile.
  - **Empty states**: no decisions yet · no match for a search · none for the
    selected project.
- Cards now show the **decision** (the call, accent-bordered), **rationale**,
  **trade-offs**, and **#tags** — same card/Badge styling, just richer content.

## Decision fields

`project_id, title, decision, rationale, tradeoffs, tags, decided_at (≙ dated_at),
created_at, updated_at` — plus the retained `status` (Decided/Open/Revisit) that
the existing UI uses, and legacy `options`/`chosen` kept only to render the
original seeded decisions.

## Schema (Task 4)

The existing table already had `rationale`; it lacked `decision`, `tradeoffs`,
`tags`. Added a **safe, additive** migration
[`20260602150000_decisions_memory.sql`](../../supabase/migrations/20260602150000_decisions_memory.sql):

```sql
alter table decisions add column decision  text;
alter table decisions add column tradeoffs text;
alter table decisions add column tags      text[] not null default '{}';
create index idx_decisions_tags on decisions using gin (tags);
```

Existing rows are preserved (`tags` defaults to empty). `decided_at` already
exists as `dated_at`. The four seeded decisions were enriched with
decision/trade-offs/tags in `supabase/seed.sql` (Task 5 — preserved, not
replaced). Schema reference updated.

## How writes work

The repository seam gained write methods (`createDecision`, `updateDecision`,
`deleteDecision`) on the `DataSource` interface:

- **`supabaseSource`** — `insert/update/delete` against the `decisions` table
  (resolving the project slug → UUID; new rows get the next `position`).
- **`mockSource`** — mutates the in-memory `decisions` array, so the feature
  works **end-to-end without a database** (ephemeral dev store; resets on
  restart). This is what runs in this environment.

Writes use the active source directly (no silent mock fallback) so a failed DB
write surfaces as an error in the UI. Reads still fall back to mock gracefully.

Server actions in `src/app/decisions/actions.ts` validate input, call the repo,
and `revalidatePath("/decisions")`. The page is `dynamic = "force-dynamic"` (a
CRUD surface), so writes are reflected immediately. Routing is unchanged.

## Files

**New:** `src/app/decisions/actions.ts`,
`src/components/decisions/{decisions-view,decision-form,filter}.tsx`,
`supabase/migrations/20260602150000_decisions_memory.sql`,
`docs/phase-2/PHASE_2_5_SUMMARY.md`.
**Changed:** `src/app/decisions/page.tsx` (fetch + `DecisionsView`),
`src/lib/domain/decision.ts` (+`decision`/`tradeoffs`/`tags`, `DecisionInput`),
`src/lib/data/{decisions,mock-source,supabase-source,source,index}.ts`
(writes + mapping), `src/components/ui.tsx` (+`Input`/`Textarea`/`Select`/`Field`),
`supabase/seed.sql`, `docs/database/SCHEMA_REFERENCE.md`.
**Untouched:** all other screens/components, routing, theme, navigation.

## Validation (run against the live app)

Build passes; `/decisions` is dynamic, all other routes still static. A
DevTools-Protocol E2E against the running dev server confirmed every criterion:

| Check | Result |
|---|---|
| Create a decision for **Home Cooked** | ✅ persisted |
| Create a decision for **WardrobeHarmony** | ✅ persisted |
| Decision count after two creates | ✅ 4 → 6 |
| **Search** "Wardrobe Decision" | ✅ 1 card, only the Wardrobe one |
| **Filter** by Home Cooked | ✅ 3 cards, only Home Cooked |
| Studio / Focus / Roadmaps / Signals / Money | ✅ unchanged, all 200, render identically |

> Note: the live E2E exercised **mock-mode** writes (the in-memory store), which
> is what's active without Supabase env. The `supabaseSource` write path mirrors
> it and is exercised once `SUPABASE_URL`/`SUPABASE_ANON_KEY` are set and the
> migrations/seed are applied (`supabase db reset`).

## Explicitly NOT done (per scope)
- ❌ No redesign — same theme, layout, and navigation; new UI is additive.
- ❌ No external integrations.
- ❌ No auth, no multi-user, no permissions.
