# Product Studio — Database Schema Reference

> **Phase 2.3.** Postgres / Supabase schema that mirrors the TypeScript domain
> model in [`src/lib/domain/`](../../src/lib/domain). Schema + seed only — the
> app is **not** wired to this database yet (mock fixtures remain the active
> source).
>
> Migration: [`supabase/migrations/20260602120000_initial_schema.sql`](../../supabase/migrations/20260602120000_initial_schema.sql)
> Seed: [`supabase/seed.sql`](../../supabase/seed.sql)

## Conventions

- **UUID primary keys** — `id uuid primary key default gen_random_uuid()`.
- **Timestamps** — every table has `created_at` and `updated_at` (`timestamptz`,
  default `now()`); `updated_at` is maintained by a `set_updated_at()` BEFORE
  UPDATE trigger.
- **Closed value sets** — enforced with inline `CHECK` constraints (text
  columns) rather than Postgres `ENUM` types, for readability and easy evolution.
- **Single-user** — no `users` / `teams` / `accounts` tables, no auth, **no RLS**
  (deferred; Product Studio is single-user for now).
- **`slug`** — `projects` and `milestones` carry a stable human slug (e.g.
  `home-cooked`, `m-home-cooked`) used by the seed to resolve foreign keys
  without hard-coding UUIDs.

## Ownership model

`projects` is the aggregate root. Every other domain table references it via
`project_id` (cascade delete). Integrations are a **studio-level registry**;
they *attach* to projects through `integration_key` provenance columns and
`projects.repo` / `projects.primary_domain` — they never define a project.

```
projects ──┬─< milestones ──< tasks
           ├─< milestones ──< roadmap_items (milestone_id optional)
           ├─< roadmap_items
           ├─< tasks
           ├─< decisions
           ├─< activity_items ─→ integrations (source)
           ├─< signals        ─→ integrations (source)
           ├─< expenses       ─→ integrations (source)
           └─< domains        ─→ integrations (source)

integrations (studio-level registry, referenced by key)
expense_snapshots (studio-level spend history → Money trend; no project_id)
```

## Tables

### `integrations` ⟷ `Integration`
Studio-level connection registry (one row per external service).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| key | text UNIQUE | CHECK `github\|vercel\|supabase\|cloudflare\|openai\|anthropic`. Referenced by other tables. |
| name | text | |
| category | text | CHECK `git\|hosting\|database\|domains\|ai` |
| connected | boolean | default false |
| detail | text | |
| created_at / updated_at | timestamptz | |

### `projects` ⟷ `Project`
Aggregate root.

| Column | Type | Notes / domain mapping |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | domain `Project.id` (e.g. `home-cooked`) |
| name | text | |
| tagline | text | |
| status | text | CHECK `Active\|Planning\|Content\|Paused\|Shipped` |
| progress | int 0–100 | *denormalized* (authoritative: milestone/tasks) |
| next_milestone | text | *denormalized* from `milestones` |
| open_tasks | int ≥0 | *denormalized* from `tasks` |
| blockers | int ≥0 | *denormalized* from `tasks` |
| last_activity_at | timestamptz | domain `lastActivityIso`; *denormalized* from `activity_items` |
| accent | text | CHECK `amber\|violet\|blue\|orange\|green\|teal` |
| icon | text | CHECK `chef\|shirt\|dumbbell\|sofa` |
| repo | text NULL | GitHub repo slug (integration reference) |
| primary_domain | text NULL | *denormalized* from `domains` |

### `milestones` ⟷ `Milestone`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slug | text UNIQUE | domain `Milestone.id` (e.g. `m-home-cooked`) |
| project_id | uuid FK→projects | cascade |
| title | text | |
| summary | text | |
| priority | text | CHECK `High\|Medium\|Low` |
| progress | int 0–100 | |
| status | text | CHECK `active\|planned\|shipped` |

### `roadmap_items` ⟷ `RoadmapItem`  (planning board — CRUD/move/reorder in Phase 2.6)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects | cascade |
| milestone_id | uuid FK→milestones NULL | set null on delete |
| title | text | |
| description | text NULL | *(added 2.6)* |
| **column_key** | text | CHECK `now\|next\|later` — domain `RoadmapItem.column` (`column` is reserved) |
| priority | text NOT NULL default `Medium` | CHECK `High\|Medium\|Low` *(added 2.6)* |
| status | text NOT NULL default `planned` | CHECK `planned\|in_progress\|done` *(added 2.6)* |
| effort | text | CHECK `S\|M\|L` |
| target_date | date NULL | *(added 2.6)* |
| **sort_order** | integer | within-column order; mutated by reorder/move *(renamed from `position` in 2.6)* |
| tag | text NULL | e.g. `milestone` |

Migration: [`20260602160000_roadmap_planning.sql`](../../supabase/migrations/20260602160000_roadmap_planning.sql)
adds `description`/`priority`/`status`/`target_date` and renames `position` → `sort_order`
(additive + safe rename; existing rows preserved).

### `tasks` ⟷ `Task`  (execution layer — CRUD in Phase 2.8)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects | cascade — a task always belongs to a project |
| milestone_id | uuid FK→milestones NULL | cascade — usually belongs to a milestone |
| title | text | *(renamed from `label` in 2.8)* |
| description | text NULL | *(added 2.8)* |
| status | text NOT NULL default `todo` | CHECK `todo\|in_progress\|blocked\|completed` *(replaced `state` in 2.8)* |
| priority | text NOT NULL default `medium` | CHECK `low\|medium\|high\|critical` *(added 2.8)* |
| target_date | date NULL | *(added 2.8)* |
| completed_at | timestamptz NULL | set when `status = completed` *(added 2.8)* |
| position | integer | display order |

Migration: [`20260602170000_task_system.sql`](../../supabase/migrations/20260602170000_task_system.sql)
renames `label`→`title`, migrates `state`→`status` (done→completed, active→in_progress),
adds `description`/`priority`/`target_date`/`completed_at`, drops `estimate`.
Existing rows preserved.

### `decisions` ⟷ `Decision`  (product memory — CRUD in Phase 2.5)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects NULL | cascade; null = studio-level |
| title | text | |
| status | text | CHECK `Decided\|Open\|Revisit` |
| dated_at | timestamptz | domain `dateIso` ≙ **decided_at** |
| decision | text NULL | the actual call made *(added 2.5)* |
| rationale | text | |
| tradeoffs | text NULL | what was given up *(added 2.5)* |
| tags | text[] NOT NULL default `{}` | free-form labels, GIN-indexed *(added 2.5)* |
| options | text[] NULL | legacy; retained for seeded decisions' display |
| chosen | text NULL | legacy |
| position | integer | display order |

Migration: [`20260602150000_decisions_memory.sql`](../../supabase/migrations/20260602150000_decisions_memory.sql)
adds `decision`, `tradeoffs`, `tags` (additive; existing rows preserved).

### `activity_items` ⟷ `Activity`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects NULL | cascade; null = studio-wide |
| integration_key | text FK→integrations(key) NULL | provenance (source) |
| kind | text | CHECK `commit\|issue\|deploy\|domain\|infra` |
| title | text | |
| occurred_at | timestamptz | domain `whenIso` |
| ok | boolean NULL | |

### `signals` ⟷ `Signal`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects NULL | cascade; null = studio/infra-wide |
| integration_key | text FK→integrations(key) | **required** reporting source |
| service | text | |
| detail | text | |
| level | text | CHECK `ok\|warn\|down` |

### `expenses` ⟷ `Expense`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects NULL | cascade; null = studio-wide (e.g. base plan) |
| integration_key | text FK→integrations(key) NULL | billing source |
| service | text | |
| category | text | CHECK `Hosting\|AI Tools\|Domains` |
| amount | numeric(10,2) ≥0 | |

### `domains` ⟷ `Domain`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects | cascade |
| name | text UNIQUE | |
| registrar | text NULL | |
| integration_key | text FK→integrations(key) NULL | registrar/monitoring source |
| expires_at | date NULL | stored fact; domain `expiresInDays` is **derived** = `expires_at − studio now` |
| status | text | CHECK `healthy\|expiring\|expired` |

### `expense_snapshots`  (spend history → Money trend; studio-level)
Historical spend records powering the Money 6-month trend chart. Not a domain
entity — a reporting/history table. No `project_id` (portfolio-wide). Migration:
[`20260602130000_expense_snapshots.sql`](../../supabase/migrations/20260602130000_expense_snapshots.sql).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| category | text NULL | CHECK `NULL` or `Hosting\|AI Tools\|Domains` (NULL = period roll-up total) |
| vendor | text NULL | corresponds to `expenses.service`; NULL on roll-up rows |
| amount | numeric(10,2) ≥0 | |
| period_start | date | CHECK `period_end >= period_start` |
| period_end | date | |
| created_at / updated_at | timestamptz | |

Monthly trend query: `select period_start, sum(amount) from expense_snapshots group by period_start order by period_start`. Rows may be itemized (current month) or a roll-up total (older months where only the total is known).

## Domain ↔ schema naming differences

| Domain (TS) | Column | Why |
|---|---|---|
| `RoadmapItem.column` | `column_key` | `column` is reserved in SQL |
| `Decision.dateIso` | `dated_at` | timestamptz, clearer |
| `Activity.whenIso` | `occurred_at` | timestamptz, clearer |
| `Project.lastActivityIso` | `last_activity_at` | timestamptz |
| `Project.domain` | `primary_domain` | avoid clash with `domains` table |
| `Domain.expiresInDays` | `expires_at` (date) | store the absolute fact; derive the relative value |
| `Integration["key"]` everywhere | `integration_key` | explicit FK column |

## Not modeled (by design / deferred)
- **Alert** / `Focus` — these are *derived views* in the domain model, not owned
  entities, so they have no tables (alerts are computed from signals/domains/
  staleness; focus is a milestone + its tasks).
- **Profile / users / teams** — single-user; no account model. The owner name
  and notification badge stay app-side constants.
- **WeeklySummary** (footer banner) — studio chrome; derive from `activity_items`
  or keep app-side. No table.

Spend trend history (the Money 6-month chart) **is** modeled — see
`expense_snapshots` below (resolved F1).
