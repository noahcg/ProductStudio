# Phase 2.3 — Supabase Schema & Seed

> **Status:** Complete (schema + seed authored). **The app is NOT wired to
> Supabase** — the mock fixtures in `src/lib/data/*` remain the active data
> source. No UI, routing, component, or `src/` changes were made.

## Goal

Create a Postgres/Supabase database schema and seed data that matches the
Phase 2.2 TypeScript domain model — as standalone SQL, ready to apply later.

## What was added

```
supabase/
  migrations/
    20260602120000_initial_schema.sql   # 10 tables + checks + triggers + indexes
  seed.sql                              # the 4 products + all child entities
docs/
  database/SCHEMA_REFERENCE.md          # table-by-table reference + domain mapping
  phase-2/PHASE_2_3_SUMMARY.md          # this file
```

Nothing under `src/` was touched.

## Schema (10 tables)

`integrations`, `projects`, `milestones`, `roadmap_items`, `tasks`,
`decisions`, `activity_items`, `signals`, `expenses`, `domains` — one per
domain entity, each mapped 1:1 to a type in `src/lib/domain/`.

Design choices (per the rules):
- **UUID PKs** (`gen_random_uuid()`), `created_at` + `updated_at` on every
  table (`updated_at` via a shared `set_updated_at()` trigger).
- **CHECK constraints** for every closed value set (status, priority, state,
  level, category, accent, icon, effort, column, kind) — chosen over Postgres
  `ENUM` types for readability and easy evolution.
- **Project is the source of truth.** Every child table has `project_id` (FK,
  cascade). Integrations are a studio-level registry that *attaches* to projects
  via `integration_key` provenance columns + `projects.repo`/`primary_domain` —
  they never define a project.
- **Single-user.** No user/team/account tables, no auth, **no RLS** (deferred).
- FK indexes added on all `project_id` / `milestone_id` / `integration_key`
  columns.

A few naming differences from the TS model are documented in
`SCHEMA_REFERENCE.md` (e.g. `column` → `column_key`, `whenIso` → `occurred_at`,
`expiresInDays` → `expires_at`).

## Seed (4 products)

`seed.sql` reproduces the current mock fixtures exactly:
Home Cooked, WardrobeHarmony, PersonalTrainer, Cascade Lounge — plus their
6 integrations, 4 milestones, 6 tasks, 10 roadmap items, 4 decisions,
5 activity items, 5 signals, 7 expenses, and 3 domains.

- Foreign keys are resolved by `slug` via subqueries — **no hard-coded UUIDs**.
- `truncate ... restart identity cascade` at the top makes it **safe to re-run**.
- `domains.expires_at` is computed as `DATE '2026-06-07' + <mock expiresInDays>`
  (the studio anchor), so the DB stores the absolute date and the app derives
  the "expires in N days" view.

## How to apply (when ready — not done in this phase)

This repo has no Supabase project initialized and the toolchain isn't installed
locally, so the SQL was **not executed here**. To apply it later, either:

**A. Supabase CLI**
```bash
supabase init          # generates supabase/config.toml (one-time)
supabase start         # local Postgres in Docker
supabase db reset      # runs migrations/ then seed.sql
```

**B. Plain Postgres / hosted Supabase**
```bash
psql "$DATABASE_URL" -f supabase/migrations/20260602120000_initial_schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Suggested validation queries
```sql
select count(*) from projects;       -- 4
select count(*) from milestones;     -- 4
select count(*) from tasks;          -- 6
select count(*) from roadmap_items;  -- 10
select count(*) from decisions;      -- 4
select count(*) from activity_items; -- 5
select count(*) from signals;        -- 5
select count(*) from expenses;       -- 7  (sum(amount) = 42.37)
select count(*) from domains;        -- 3
select count(*) from integrations;   -- 6
```

## Validation status

- **SQL authored to run cleanly** and reviewed statically: dependency-ordered
  table creation, every seed value satisfies its CHECK constraint and NOT NULL
  columns, FK targets exist before they're referenced, and `gen_random_uuid()`
  is enabled via `pgcrypto`.
- **Not executed locally** — no `psql`/Postgres/Docker/Supabase CLI is available
  on this machine. Run the queries above after applying to confirm row counts.
- **App UI unchanged** — `npm run build` still passes; `src/` is untouched and
  the app continues to read mock fixtures.

## Explicitly NOT done (per scope)
- ❌ App not wired to Supabase; mock data is still the active source.
- ❌ No `@supabase/supabase-js`, no client, no env, no `config.toml`.
- ❌ No real integrations.
- ❌ No RLS, no auth, no user/team/account tables, no multi-user.
- ❌ No component/UI/routing changes.

## Next (Phase 2.4 / future)
Wire a Supabase-backed implementation behind the existing repository seam
(`src/lib/data/index.ts`) and switch the active source via a flag — the schema
above is shaped to drop in behind the current `getX()` accessors.
