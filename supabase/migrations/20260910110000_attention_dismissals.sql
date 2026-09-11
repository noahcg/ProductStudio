-- Dismissed inbox items are user state, not browser state. This keeps them
-- stable across desktop rebuilds and devices using the same Product Studio data.
create table attention_dismissals (
  item_id     text primary key,
  dismissed_at timestamptz not null default now()
);
