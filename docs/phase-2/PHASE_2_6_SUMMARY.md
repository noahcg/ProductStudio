# Phase 2.6 — Roadmaps as a Planning Feature

> **Status:** Complete. Roadmaps is now a usable Now/Next/Later planning board —
> create / edit / delete / move between columns / reorder within a column /
> filter by project — persisted through the existing repository seam (Supabase
> when configured, in-memory mock store otherwise). No app redesign, no external
> integrations, no auth/multi-user, no navigation changes. Studio, Focus,
> Decisions, Signals, and Money are unchanged.

## What shipped

- The **Roadmaps board** upgraded from display-only to interactive, keeping the
  existing three-column layout and card look:
  - **Create / Edit / Delete** items (modal form from the design system; a
    global "New item" and a per-column "+ Add" button).
  - **Move between Now / Next / Later** via ◀ ▶ controls (appends to the target
    column's end).
  - **Reorder within a column** via ▲ ▼ controls (swaps `sort_order` with the
    neighbour).
  - **Filter by project**.
  - **Optimistic UI** for every operation (`useOptimistic` + `useTransition`),
    server actions `revalidatePath` to reconcile.
- Cards now show **priority**, **effort**, **status**, **target date**, and an
  optional **description** — same Card/Badge styling, richer content.

Move/reorder use accessible **buttons** (not drag-and-drop) — no new dependency,
fully keyboard/AT-usable, and deterministic to test.

## Roadmap item fields

`project_id, title, description, column_key (now|next|later), priority
(High|Medium|Low), status (planned|in_progress|done), sort_order, target_date,
created_at, updated_at` — plus retained `effort (S|M|L)`, `tag`, and
`milestone_id` for the existing display.

## Schema (Task 4 — safe migration)

[`20260602160000_roadmap_planning.sql`](../../supabase/migrations/20260602160000_roadmap_planning.sql):

```sql
alter table roadmap_items add column description text;
alter table roadmap_items add column priority text not null default 'Medium'
  check (priority in ('High','Medium','Low'));
alter table roadmap_items add column status text not null default 'planned'
  check (status in ('planned','in_progress','done'));
alter table roadmap_items add column target_date date;
alter table roadmap_items rename column position to sort_order;   -- mutable order key
alter index idx_roadmap_items_position rename to idx_roadmap_items_sort_order;
```

Additive + a safe rename; **existing rows preserved** (priority/status default).
The ten seeded items were enriched with priority/status in `supabase/seed.sql`
(Task 5 — preserved, not replaced). Schema reference updated.

## How it works

The repository seam gained `createRoadmapItem`, `updateRoadmapItem`,
`deleteRoadmapItem`, and `setRoadmapPlacement` (batch column/order updates) on
the `DataSource`:

- **`supabaseSource`** — insert/update/delete; move/reorder issue
  `column_key`/`sort_order` updates (project slug → UUID resolved on write).
- **`mockSource`** — mutates the in-memory `roadmap` array, so the feature works
  end-to-end without a database (ephemeral; resets on restart). This is what runs
  here.

Move/reorder math lives in **`src/components/roadmaps/roadmap-ops.ts`** (pure,
shared by client optimism and the server actions, so both compute identically).
Server actions in `src/app/roadmaps/actions.ts` fetch the current list, compute
placements, persist, and `revalidatePath("/roadmaps")`. The page is
`dynamic = "force-dynamic"`. Routing unchanged.

## Empty states (Task 5)
- **No roadmap items** — board replaced with an empty card + New item.
- **No project selected / filtered project empty** — "No roadmap items for
  {project} yet" + New item.
- **Empty Now/Next/Later column** — per-column "Nothing here yet" placeholder.

## Files

**New:** `src/app/roadmaps/actions.ts`,
`src/components/roadmaps/{roadmaps-view,roadmap-form,roadmap-ops}.{tsx,ts}`,
`supabase/migrations/20260602160000_roadmap_planning.sql`, this summary.
**Changed:** `src/app/roadmaps/page.tsx`, `src/lib/domain/roadmap.ts`
(+fields, `RoadmapInput`, `RoadmapPlacement`),
`src/lib/data/{roadmap,mock-source,supabase-source,source,index}.ts`,
`supabase/seed.sql`, `docs/database/SCHEMA_REFERENCE.md`.
**Untouched:** all other screens/components, routing, theme, navigation.

## Validation (E2E against the running app, via DevTools Protocol)

| Check | Result |
|---|---|
| Create roadmap item for **Home Cooked** | ✅ created in Later |
| **Move Later → Next** | ✅ |
| **Move Next → Now** | ✅ |
| **Reorder** up within a column | ✅ index 3 → 2 (swap persisted) |
| **Filter by WardrobeHarmony** | ✅ only Closet Import + Color-match recommendations |
| Studio / Focus / Decisions / Signals / Money | ✅ unchanged, all 200 |

> The live E2E exercised **mock-mode** writes (in-memory store), active without
> Supabase env. The `supabaseSource` path mirrors it and runs once
> `SUPABASE_URL`/`SUPABASE_ANON_KEY` are set and `supabase db reset` is applied.

## Explicitly NOT done (per scope)
- ❌ No redesign — same three-column board, theme, and navigation; new UI is additive.
- ❌ No external integrations · ❌ No auth / multi-user · ❌ Other screens not rebuilt.
