-- Product-level, non-secret integration identifiers. Credentials are held only
-- in Product Studio's server environment and are never stored in this table.
alter table products
  add column if not exists vercel_project text,
  add column if not exists vercel_team_slug text,
  add column if not exists supabase_project_ref text,
  add column if not exists cloudflare_account_id text;

update products
set
  vercel_project = coalesce(vercel_project, 'home-cooked'),
  vercel_team_slug = coalesce(vercel_team_slug, 'noahcgs-projects'),
  supabase_project_ref = coalesce(supabase_project_ref, 'wcoubzejnqnknvgdyjui')
where slug = 'home-cooked';
