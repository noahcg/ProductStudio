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

### `roadmap_items` ⟷ `RoadmapItem`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects | cascade |
| milestone_id | uuid FK→milestones NULL | set null on delete |
| title | text | |
| **column_key** | text | CHECK `now\|next\|later` — maps to domain `RoadmapItem.column` (`column` is a SQL reserved word) |
| effort | text | CHECK `S\|M\|L` |
| tag | text NULL | e.g. `milestone` |

### `tasks` ⟷ `Task`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects | cascade |
| milestone_id | uuid FK→milestones NULL | cascade |
| label | text | |
| state | text | CHECK `todo\|active\|done` |
| estimate | text NULL | e.g. `~3h` |

### `decisions` ⟷ `Decision`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK→projects NULL | cascade; null = studio-level |
| title | text | |
| status | text | CHECK `Decided\|Open\|Revisit` |
| dated_at | timestamptz | domain `dateIso` |
| rationale | text | |
| options | text[] NULL | domain `options?: string[]` |
| chosen | text NULL | |

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

## Not modeled (by design)
- **Alert** / `Focus` — these are *derived views* in the domain model, not owned
  entities, so they have no tables (alerts are computed from signals/domains/
  staleness; focus is a milestone + its tasks).
- **Profile / users / teams** — single-user; no account model.
