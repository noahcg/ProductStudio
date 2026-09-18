create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  details jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists appointments_project_id_idx on appointments(project_id);
-- Uses the existing single-user database access model.
