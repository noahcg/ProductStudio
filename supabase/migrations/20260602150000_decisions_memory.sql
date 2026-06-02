-- =============================================================================
-- Product Studio — decisions as product memory (Phase 2.5)
--
-- Adds the fields needed to use Decisions as a real product-memory area:
--   * decision  — the actual call that was made (distinct from the title)
--   * tradeoffs — what was given up / the cost of the decision
--   * tags      — free-form labels for filtering/search
--
-- Additive and safe: existing rows keep their data; `tags` defaults to empty.
-- (project_id, title, status, dated_at [≙ decided_at], rationale, options,
-- chosen, created_at, updated_at already exist from the initial schema.)
-- =============================================================================

alter table decisions add column decision  text;
alter table decisions add column tradeoffs text;
alter table decisions add column tags      text[] not null default '{}';

create index idx_decisions_tags on decisions using gin (tags);
