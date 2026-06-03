-- =============================================================================
-- Phase 2.15 — Weekly Founder Review
--
-- A durable store for generated Weekly Founder Reviews, so review history can be
-- kept over time. Reviews are generated deterministically (no AI) from existing
-- Product Studio data; this table is the persistence sink + future-proofing for
-- historical reviews. The live "current" review is generated on demand.
--
--   id                  – stable review id (period-derived)
--   review_period_start – start of the covered period
--   review_period_end   – end of the covered period (the "generated as-of" point)
--   generated_at        – when the review was generated
--   summary             – the executive summary (plain text)
--   recommendation      – the single recommended-focus line
--   metadata            – full review payload (jsonb) for the detail screen
-- =============================================================================

create table if not exists reviews (
  id                  text primary key,
  review_period_start timestamptz not null,
  review_period_end   timestamptz not null,
  generated_at        timestamptz not null default now(),
  summary             text not null,
  recommendation      text not null,
  metadata            jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists reviews_period_end_idx on reviews (review_period_end desc);
