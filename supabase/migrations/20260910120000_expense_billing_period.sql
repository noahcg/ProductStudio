-- Keep the entered invoice amount and its cadence; reporting normalizes yearly
-- expenses to a monthly equivalent.
alter table expenses
  add column billing_period text not null default 'monthly'
  check (billing_period in ('monthly', 'yearly'));
