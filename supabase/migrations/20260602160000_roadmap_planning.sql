-- =============================================================================
-- Product Studio — roadmap planning (Phase 2.6)
--
-- Upgrades roadmap_items from display-only to a usable planning board:
--   * description — longer detail for the item
--   * priority    — High / Medium / Low
--   * status      — planned / in_progress / done
--   * target_date — optional target date
--   * position -> sort_order (rename): the within-column ordering key, now
--     mutable via reorder/move.
--
-- Additive + a safe rename. Existing rows keep their data (priority/status get
-- defaults; the prior `position` values become `sort_order`).
-- =============================================================================

alter table roadmap_items add column description text;
alter table roadmap_items add column priority text not null default 'Medium'
  check (priority in ('High','Medium','Low'));
alter table roadmap_items add column status text not null default 'planned'
  check (status in ('planned','in_progress','done'));
alter table roadmap_items add column target_date date;

alter table roadmap_items rename column position to sort_order;
alter index idx_roadmap_items_position rename to idx_roadmap_items_sort_order;
