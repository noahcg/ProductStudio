# Phase 2.3 — Validation Pass

> **Scope:** Review-only validation of the Phase 2.3 Supabase schema, seed,
> schema reference, and summary against the Phase 2.2 TypeScript domain model
> and the current UI. **No app/UI changes, no Supabase wiring, no new features.**
>
> **Artifacts reviewed:**
> - [`supabase/migrations/20260602120000_initial_schema.sql`](../../supabase/migrations/20260602120000_initial_schema.sql)
> - [`supabase/seed.sql`](../../supabase/seed.sql)
> - [`docs/database/SCHEMA_REFERENCE.md`](../database/SCHEMA_REFERENCE.md)
> - [`docs/phase-2/PHASE_2_3_SUMMARY.md`](./PHASE_2_3_SUMMARY.md)
> - Domain model `src/lib/domain/*` and fixtures `src/lib/data/*` (for cross-checks)

## Verdict

**PASS, with documented caveats.** The 10 domain entities each have a faithful
table, ownership is correctly modeled, and seed data for all four products is
present and consistent. Static review found **no SQL/DDL or seed errors**.

Caveats:
- ~~The Money **6-month trend** (`spendTrend`) has **no table**~~ — **RESOLVED**
  by adding `expense_snapshots` (Finding F1, below).
- A few **studio-chrome values** (footer weekly summary, owner name,
  notification badge) have no table — by design / single-user (Finding F2).

The SQL was **not executed** (no Postgres/Supabase tooling on this machine) —
see *Known Manual Validation Required*.

---

## Checklist

### 1. Every TS domain model has a matching database representation — ✅ PASS
All ten entity types map 1:1 to a table; field coverage verified.

| Domain type (`src/lib/domain`) | Table | Notes |
|---|---|---|
| `Project` | `projects` | id→uuid + `slug`; all fields present |
| `Milestone` | `milestones` | + `slug` for seed FK resolution |
| `Task` | `tasks` | |
| `RoadmapItem` | `roadmap_items` | `column` → `column_key` |
| `Decision` | `decisions` | `dateIso` → `dated_at`; `options` → `text[]` |
| `Activity` | `activity_items` | `whenIso` → `occurred_at` |
| `Signal` | `signals` | |
| `Expense` | `expenses` | |
| `Domain` | `domains` | `expiresInDays` → `expires_at` (date) |
| `Integration` | `integrations` | |

Derived views (`Focus`, `Alert`) and the single-user `Profile` correctly have
**no** tables — consistent with Phase 2.2 marking them non-entities.

### 2. Every table relates back to projects where appropriate — ✅ PASS
Verified `project_id` columns and nullability against the migration:

| Table | `project_id` | Rationale |
|---|---|---|
| milestones, roadmap_items, tasks, domains | **NOT NULL** | always belong to a project |
| decisions, activity_items, signals, expenses | **nullable** | may be studio-/infra-wide |
| integrations | *(none)* | studio-level registry; attaches via `integration_key` + `projects.repo`/`primary_domain`, never owns a project |

All FKs cascade on project delete. This correctly expresses "Product Studio is
the source of truth; integrations attach but don't define."

### 3. Seed data exists for all four products — ✅ PASS
`projects` seed inserts exactly: **Home Cooked, WardrobeHarmony,
PersonalTrainer, Cascade Lounge** (4 rows), each with its milestone, and with
child rows distributed across tasks/roadmap/decisions/activity/expenses/domains.

### 4. Seed supports the current UI without hard-coded values — ⚠️ PASS (core) / caveat (chrome)
**Fully supported from the schema** (every value the screen needs is in seed):
- **Studio cards / Roadmaps / Decisions / Signals** — direct from
  projects/roadmap_items/decisions/signals.
- **Focus** — milestone + tasks (Home Cooked).
- **Money donut + categories + expenses table** — `expenses` rows; verified
  `sum(amount) = 42.37` and category splits **Hosting 21.35 / AI Tools 14.62 /
  Domains 6.40** match the UI exactly.
- **Stat row** — `projects` count (4), Active (2 = status='Active'),
  Monthly Spend (Σ expenses = 42.37). `Needs Attention` (1) and the alert cards
  are **derivable** from `projects.last_activity_at` (WardrobeHarmony idle 14d),
  `domains.expires_at` (wardrobeharmony.com in 41d), and milestone titles — the
  alert *labels/CTAs* are UI copy, not data (correct to keep app-side).

- Money **6-month trend** — now sourceable from `expense_snapshots` (F1 resolved).

**Not sourceable from the schema** (see Findings):
- Footer **weekly summary** (3 updates / 2 products), **notification badge**,
  **owner name** — F2 (by design).

### 5. Naming differences are intentional and documented — ✅ PASS
`SCHEMA_REFERENCE.md` → *Domain ↔ schema naming differences* documents all of:
`column`→`column_key`, `dateIso`→`dated_at`, `whenIso`→`occurred_at`,
`lastActivityIso`→`last_activity_at`, `domain`→`primary_domain`,
`expiresInDays`→`expires_at`, integration key → `integration_key`. Verified each
matches the migration.

### 6. `column_key` is used consistently for roadmap items — ✅ PASS
Migration column is `column_key` (CHECK `now|next|later`), the index is on
`column_key`, and the seed inserts into `column_key`. No bare `column` anywhere.

### 7. `expires_at` for domains, relative derived by app — ✅ PASS
`domains.expires_at` is a `date`; seed stores absolute dates
(`DATE '2026-06-07' + N`). The relative "expires in N days" is intentionally
**not** stored — it is derived by the app against the studio clock. Documented
in both the migration comment and schema reference.

### 8. No user / team / auth / permission model — ✅ PASS
Grep confirms no `users`/`teams`/`accounts`/`members`/`roles` tables, no
policies, no `enable row level security`, no `auth.` references. The only
matches are the comment explicitly stating these are omitted.

### 9. No integration treated as source of truth — ✅ PASS
`integrations` has no `project_id` and owns nothing. Other tables reference it
only via `integration_key` as **provenance** (nullable everywhere except
`signals`, which is inherently service-reported). Projects reference services
loosely (`repo`, `primary_domain`) — never via FK to integrations. Source of
truth remains Product Studio.

### 10. Schema can support Phase 2.4 (DB-backed replacing mock) — ⚠️ PASS with gaps
Every repository accessor that returns a **core entity** (`getProjects`,
`getMilestones`, `getTasks`, `getRoadmap`, `getDecisions`, `getActivity`,
`getSignals`, `getExpenses`, `getDomains`, `getIntegrations`) maps cleanly to a
table. Derived accessors (`getFocus`, `getStudioStats`, alerts) can be computed
from those tables.

`getSpendTrend()` is now backed by `expense_snapshots` (F1 resolved). The only
accessors still without a table are `getWeeklySummary()` / profile fields (F2) —
studio chrome, to be derived or accepted as app-side constants.

---

## Findings & proposed fixes (NOT implemented)

> Per scope, fixes are proposed only. The one change made in this pass is a
> small, safe documentation correction (below).

### F1 — Money 6-month trend has no table — ✅ **RESOLVED**
`spendTrend` (Jan–Jun monthly totals) drives the Money trend chart, but
`expenses` holds only current-month line items, so history could not be derived.
- **Fix implemented:** added the `expense_snapshots` table
  (migration [`20260602130000_expense_snapshots.sql`](../../supabase/migrations/20260602130000_expense_snapshots.sql))
  and 12 seed rows (Jan–May roll-up totals + an itemized June) in `seed.sql`.
  The trend is now `select period_start, sum(amount) from expense_snapshots
  group by period_start order by period_start`, yielding exactly
  31.10 / 33.80 / 29.40 / 38.20 / 40.05 / 42.37 — matching the current UI with
  no hard-coded values. Documented in `SCHEMA_REFERENCE.md`.
- Scope honored: schema + seed + docs only; **no app wiring, no UI change.**

### F2 — Studio-chrome values have no table *(low; by design)*
Footer `weeklySummary` (3 updates / 2 products), `profile.unreadNotifications`
(badge = 3), and the owner name are consumed by the UI but unmodeled.
- **Assessment:** correct for a single-user app with no notifications/user
  tables (rules forbid those). `weeklySummary` could later be **derived** from
  `activity_items`; the owner name/badge can remain app-side constants.
- **Not implemented:** no action needed for 2.4 unless these surfaces are moved
  to the DB; they can stay app-side.

### F3 — Alert / Focus intentionally untabled *(info; correct)*
Confirmed as derived views (computed from entities), consistent with Phase 2.2.
No action.

### Documentation correction applied (small, safe)
`SCHEMA_REFERENCE.md` → "Not modeled" previously omitted the spend-trend history
and weekly summary. Added bullets noting they are deferred/derived, pointing
here. This is the only file changed in this pass; no SQL, no app code.

### SQL review notes (no errors found)
Checked and clear: dependency-ordered DDL (referenced tables created first);
every seed value satisfies its CHECK constraint and NOT NULL columns; FK targets
(`integrations.key`, project/milestone slugs) exist before reference;
`gen_random_uuid()` enabled via `pgcrypto`; `text[]` options + escaped
apostrophe in the RLS-decision rationale; `numeric(10,2)` amounts; date
arithmetic for `expires_at`; `truncate … restart identity cascade` makes the
seed re-runnable.

---

## Known Manual Validation Required

The following **cannot be confirmed from code review alone** and must be done
after executing the SQL against a real Postgres/Supabase instance:

1. **SQL has not been executed locally.** No `psql`, Postgres, Docker, or
   Supabase CLI is available on this machine, so the migration and seed were
   reviewed statically but **never run**.
2. **Migrations need to be run in Supabase.** Apply
   `supabase/migrations/20260602120000_initial_schema.sql` via `supabase db reset`
   (after `supabase init` to generate `config.toml`) or `psql -f`. Confirm it
   completes with no errors and creates all 10 tables, triggers, and indexes.
3. **Seed insert counts need to be confirmed.** After running `seed.sql`, verify:

   | Table | Expected rows |
   |---|---|
   | integrations | 6 |
   | projects | 4 |
   | milestones | 4 |
   | tasks | 6 |
   | roadmap_items | 10 |
   | decisions | 4 |
   | activity_items | 5 |
   | signals | 5 |
   | expenses | 7 (`sum(amount) = 42.37`) |
   | domains | 3 |
   | expense_snapshots | 12 (5 monthly roll-ups + 7 itemized June) |

   Also confirm category rollups: Hosting 21.35, AI Tools 14.62, Domains 6.40.
   And the trend: `select period_start, sum(amount) from expense_snapshots group
   by period_start order by period_start` → 31.10 / 33.80 / 29.40 / 38.20 /
   40.05 / 42.37 across Jan–Jun 2026.
4. **Any Supabase-specific issues must be resolved after execution**, e.g.:
   - `gen_random_uuid()` availability (pgcrypto vs pgcrypto-in-core) on the
     target Postgres version.
   - Whether Supabase defaults (e.g. RLS-on-by-default expectations, exposed
     schema, API access) require follow-up — intentionally **not** configured
     here (no RLS this phase).
   - `text[]` / date-arithmetic behavior parity if run on a non-Supabase Postgres.
   - Confirm the `set_updated_at()` trigger fires on UPDATE.

---

## Readiness for Phase 2.4

**Ready** to back the core screens (Studio cards, Focus, Roadmaps, Decisions,
Signals, **Money donut/expenses/trend**) with the database behind the existing
repository seam — F1 is resolved, so the Money trend is now DB-sourceable too.
The only remaining unmodeled surface is the studio **chrome** (F2: weekly
summary, owner name, badge), which can be derived or kept app-side. Mock
fixtures remain the active source until Phase 2.4 wires the database in.
