-- =============================================================================
-- Product Studio — task system (Phase 2.8)
--
-- Extends the existing `tasks` table into a lightweight execution layer that
-- tracks progress toward milestones (NOT a generic task manager).
--
--   label  -> title
--   state  -> status (todo | in_progress | blocked | completed)   [+ data migrate]
--   + description, priority (low|medium|high|critical), target_date, completed_at
--   - estimate (dropped; superseded by priority/target_date)
--
-- Additive + safe rename/migrate. Existing rows keep their data (state values
-- map to the new status set; completed rows get a completed_at).
-- =============================================================================

alter table tasks rename column label to title;

alter table tasks add column description text;
alter table tasks add column priority text not null default 'medium'
  check (priority in ('low','medium','high','critical'));
alter table tasks add column target_date date;
alter table tasks add column completed_at timestamptz;

-- Migrate state -> status.
alter table tasks add column status text not null default 'todo'
  check (status in ('todo','in_progress','blocked','completed'));
update tasks set status = case state
  when 'done' then 'completed'
  when 'active' then 'in_progress'
  else 'todo'
end;
update tasks set completed_at = updated_at where status = 'completed';

alter table tasks drop column state;
alter table tasks drop column estimate;

create index idx_tasks_status on tasks(status);
