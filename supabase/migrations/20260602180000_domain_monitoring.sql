-- =============================================================================
-- Product Studio — domain monitoring (Phase 2.12)
--
-- Domains are already first-class (Phase 2.3). This adds the monitoring fields
-- so Product Studio can understand domain health from stored data — expiry,
-- auto-renew, and SSL. No external registrar APIs; awareness, not control.
--
--   + auto_renew     (whether auto-renew is enabled)
--   + ssl_status     (healthy | expiring | invalid | missing | unknown)
--   + notes          (free-form)
--   + last_checked_at(optional)
--
-- `expires_at` (date) already exists and remains the stored fact — days
-- remaining is always computed, never stored. The legacy `status` column is
-- left in place but no longer read (domain health is derived).
-- Additive + safe; existing rows get sensible defaults.
-- =============================================================================

alter table domains add column auto_renew boolean not null default true;
alter table domains add column ssl_status text not null default 'healthy'
  check (ssl_status in ('healthy','expiring','invalid','missing','unknown'));
alter table domains add column notes text;
alter table domains add column last_checked_at timestamptz;
