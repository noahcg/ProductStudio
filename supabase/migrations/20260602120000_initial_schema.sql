-- =============================================================================
-- Product Studio — initial schema (Phase 2.3)
--
-- Mirrors the TypeScript domain model in src/lib/domain/. A Project is the
-- aggregate root and OWNS its milestones, tasks, roadmap items, decisions,
-- activity, expenses, domains, and signals (each child has project_id).
--
-- Integrations (github / vercel / supabase / cloudflare / openai / anthropic)
-- are a studio-level connection registry. They ATTACH to projects via the
-- `integration_key` provenance columns on activity/signals/expenses/domains
-- (and project.repo / project.primary_domain) — they never DEFINE a project.
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid()).
--   * created_at / updated_at timestamptz on every table (updated_at via trigger).
--   * Closed value sets enforced with CHECK constraints (kept inline + readable).
--   * Single-user: NO user / team / account tables. NO auth. NO RLS yet
--     (deferred to a later phase; Product Studio is single-user for now).
-- =============================================================================

create extension if not exists pgcrypto;

-- Auto-maintain updated_at on UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- integrations  (studio-level connection registry)
-- Referenced by other tables via `integration_key` -> integrations(key).
-- -----------------------------------------------------------------------------
create table integrations (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique
               check (key in ('github','vercel','supabase','cloudflare','openai','anthropic')),
  name       text not null,
  category   text not null
               check (category in ('git','hosting','database','domains','ai')),
  connected  boolean not null default false,
  detail     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- projects  (aggregate root / source of truth)
-- Some columns (progress, next_milestone, open_tasks, blockers,
-- last_activity_at, primary_domain) are denormalized snapshots whose
-- authoritative sources are the child tables; kept to match the domain model.
-- -----------------------------------------------------------------------------
create table projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  tagline          text not null,
  status           text not null
                     check (status in ('Active','Planning','Content','Paused','Shipped')),
  progress         integer not null default 0 check (progress between 0 and 100),
  next_milestone   text,
  open_tasks       integer not null default 0 check (open_tasks >= 0),
  blockers         integer not null default 0 check (blockers >= 0),
  last_activity_at timestamptz,
  accent           text not null
                     check (accent in ('amber','violet','blue','orange','green','teal')),
  icon             text not null
                     check (icon in ('chef','shirt','dumbbell','sofa')),
  repo             text,                                  -- GitHub repo slug (integration reference)
  primary_domain   text,                                 -- denormalized from domains
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- milestones  (owned by a project)
-- -----------------------------------------------------------------------------
create table milestones (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  project_id uuid not null references projects(id) on delete cascade,
  title      text not null,
  summary    text not null,
  priority   text not null check (priority in ('High','Medium','Low')),
  progress   integer not null default 0 check (progress between 0 and 100),
  status     text not null check (status in ('active','planned','shipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- roadmap_items  (Now / Next / Later — owned by a project, may link a milestone)
-- `column_key` maps to the domain field RoadmapItem.column ("column" is a
-- reserved word in SQL).
-- -----------------------------------------------------------------------------
create table roadmap_items (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete set null,
  title        text not null,
  column_key   text not null check (column_key in ('now','next','later')),
  effort       text not null check (effort in ('S','M','L')),
  tag          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- tasks  (owned by a project, usually scoped to a milestone)
-- -----------------------------------------------------------------------------
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  milestone_id uuid references milestones(id) on delete cascade,
  label        text not null,
  state        text not null check (state in ('todo','active','done')),
  estimate     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- decisions  (product memory — owned by a project, or studio-level)
-- -----------------------------------------------------------------------------
create table decisions (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title      text not null,
  status     text not null check (status in ('Decided','Open','Revisit')),
  dated_at   timestamptz not null,                       -- domain: dateIso
  rationale  text not null,
  options    text[],
  chosen     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- activity_items  (events — owned by a project or studio-wide; integration = source)
-- -----------------------------------------------------------------------------
create table activity_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade,
  integration_key text references integrations(key) on delete set null,
  kind            text not null check (kind in ('commit','issue','deploy','domain','infra')),
  title           text not null,
  occurred_at     timestamptz not null,                  -- domain: whenIso
  ok              boolean,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- signals  (operational health — integration = reporting source, required)
-- -----------------------------------------------------------------------------
create table signals (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade,
  integration_key text not null references integrations(key) on delete cascade,
  service         text not null,
  detail          text not null,
  level           text not null check (level in ('ok','warn','down')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- expenses  (cost line items — attributed to a project when set; integration = billing source)
-- -----------------------------------------------------------------------------
create table expenses (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade,
  integration_key text references integrations(key) on delete set null,
  service         text not null,
  category        text not null check (category in ('Hosting','AI Tools','Domains')),
  amount          numeric(10,2) not null check (amount >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- domains  (owned by a project; integration = registrar/monitoring source)
-- The domain model's `expiresInDays` is derived from `expires_at` relative to
-- the studio clock; the absolute date is the stored fact.
-- -----------------------------------------------------------------------------
create table domains (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null unique,
  registrar       text,
  integration_key text references integrations(key) on delete set null,
  expires_at      date,
  status          text not null check (status in ('healthy','expiring','expired')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create trigger trg_integrations_updated_at   before update on integrations   for each row execute function set_updated_at();
create trigger trg_projects_updated_at        before update on projects        for each row execute function set_updated_at();
create trigger trg_milestones_updated_at      before update on milestones      for each row execute function set_updated_at();
create trigger trg_roadmap_items_updated_at   before update on roadmap_items   for each row execute function set_updated_at();
create trigger trg_tasks_updated_at           before update on tasks           for each row execute function set_updated_at();
create trigger trg_decisions_updated_at       before update on decisions       for each row execute function set_updated_at();
create trigger trg_activity_items_updated_at  before update on activity_items  for each row execute function set_updated_at();
create trigger trg_signals_updated_at         before update on signals         for each row execute function set_updated_at();
create trigger trg_expenses_updated_at        before update on expenses        for each row execute function set_updated_at();
create trigger trg_domains_updated_at         before update on domains         for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- indexes on foreign keys (and common lookups)
-- -----------------------------------------------------------------------------
create index idx_milestones_project      on milestones(project_id);
create index idx_roadmap_items_project   on roadmap_items(project_id);
create index idx_roadmap_items_milestone on roadmap_items(milestone_id);
create index idx_roadmap_items_column    on roadmap_items(column_key);
create index idx_tasks_project           on tasks(project_id);
create index idx_tasks_milestone         on tasks(milestone_id);
create index idx_decisions_project       on decisions(project_id);
create index idx_activity_items_project  on activity_items(project_id);
create index idx_activity_items_integration on activity_items(integration_key);
create index idx_signals_project         on signals(project_id);
create index idx_signals_integration     on signals(integration_key);
create index idx_expenses_project        on expenses(project_id);
create index idx_expenses_integration    on expenses(integration_key);
create index idx_domains_project         on domains(project_id);
