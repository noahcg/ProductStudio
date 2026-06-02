-- =============================================================================
-- Product Studio — expense_snapshots (Phase 2.3 / F1 fix)
--
-- Historical spend records that power the Money screen's 6-month trend chart.
--
-- The `expenses` table holds only the *current* recurring line items. A trend
-- needs history, so this table records spend for a (category, vendor) within a
-- billing period. The monthly trend is then:
--
--     select period_start, sum(amount)
--     from expense_snapshots
--     group by period_start
--     order by period_start;
--
-- A snapshot is an immutable historical record. Rows may be itemized (vendor +
-- category set, e.g. the current month) or a period roll-up total (vendor and
-- category NULL) when only the total is known for older periods.
--
-- Studio-level (portfolio-wide), like `integrations`: no project_id — the trend
-- is not per-project. (Per-project history can be added later via a nullable
-- project_id.) Follows the schema conventions: UUID PK, created_at/updated_at.
-- =============================================================================

create table expense_snapshots (
  id           uuid primary key default gen_random_uuid(),
  category     text check (category is null or category in ('Hosting','AI Tools','Domains')),
  vendor       text,                                   -- corresponds to expenses.service
  amount       numeric(10,2) not null check (amount >= 0),
  period_start date not null,
  period_end   date not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (period_end >= period_start)
);

-- set_updated_at() is defined in 20260602120000_initial_schema.sql.
create trigger trg_expense_snapshots_updated_at
  before update on expense_snapshots
  for each row execute function set_updated_at();

create index idx_expense_snapshots_period   on expense_snapshots(period_start);
create index idx_expense_snapshots_category on expense_snapshots(category);
