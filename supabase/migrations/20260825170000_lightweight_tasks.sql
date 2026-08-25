-- =============================================================================
-- Product Studio — lightweight project tasks
--
-- Keeps tasks intentionally simple for a solo workflow:
--   project + title + optional description
--   status: todo | in_progress | completed
--   created_at / completed_at
--   source jsonb for provenance from meetings, imports, or automations
--
-- Granola is not modeled directly. It can later feed this generic task shape
-- through /api/tasks and identify itself in source metadata.
-- =============================================================================

update tasks set status = 'todo' where status = 'blocked';

alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('todo','in_progress','completed'));

alter table tasks add column if not exists source jsonb;

alter table tasks drop column if exists priority;
alter table tasks drop column if exists target_date;

create index if not exists idx_tasks_source_type on tasks ((source->>'type'));
