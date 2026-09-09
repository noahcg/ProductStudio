-- =============================================================================
-- Product Studio — clean starting data
--
-- A database reset creates one Home Cooked workspace and no demo records.
-- Add milestones, tasks, planning, decisions, activity, integrations, and
-- spending only as they become part of the real daily workflow.
-- =============================================================================

truncate
  expense_snapshots, domains, expenses, signals, activity_items, decisions,
  tasks, roadmap_items, milestones, projects, products, integrations
  restart identity cascade;

insert into products (slug, name, vercel_project, vercel_team_slug, supabase_project_ref)
values ('home-cooked', 'Home Cooked', 'home-cooked', 'noahcgs-projects', 'wcoubzejnqnknvgdyjui');

insert into projects
  (slug, product_id, name, tagline, status, progress, next_milestone, open_tasks, blockers, accent, icon, repo, primary_domain, position)
values
  ('home-cooked', (select id from products where slug = 'home-cooked'), 'Launch MVP', '', 'Active', 0, null, 0, 0, 'amber', 'chef', 'noahg/home-cooked', 'tryhomecooked.com', 1);
