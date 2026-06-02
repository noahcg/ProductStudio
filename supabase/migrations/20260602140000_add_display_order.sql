-- =============================================================================
-- Product Studio — display order (Phase 2.4)
--
-- Adds an explicit `position` to the tables rendered as ordered lists, so the
-- database-backed UI shows rows in the same, deterministic order as the local
-- mock fixtures (Postgres has no inherent row order without ORDER BY).
--
-- Tables that already have a natural display order are left as-is:
--   * activity_items  → ordered by occurred_at (most recent first)
--   * expense_snapshots → ordered by period_start
--   * milestones / domains → not rendered as ordered lists
-- =============================================================================

alter table projects      add column position integer not null default 0;
alter table tasks         add column position integer not null default 0;
alter table roadmap_items add column position integer not null default 0;
alter table decisions     add column position integer not null default 0;
alter table signals       add column position integer not null default 0;
alter table integrations  add column position integer not null default 0;
alter table expenses      add column position integer not null default 0;

create index idx_roadmap_items_position on roadmap_items(position);
