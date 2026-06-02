-- =============================================================================
-- Product Studio — seed data (Phase 2.3)
--
-- Mirrors the current mock fixtures in src/lib/data/*. Foreign keys are
-- resolved by slug / natural key via subqueries, so no UUIDs are hard-coded.
--
-- Safe to re-run: clears all rows first. (On `supabase db reset` the schema is
-- recreated and this runs against empty tables anyway.)
-- =============================================================================

truncate
  expense_snapshots, domains, expenses, signals, activity_items, decisions,
  tasks, roadmap_items, milestones, projects, integrations
  restart identity cascade;

-- -----------------------------------------------------------------------------
-- integrations (studio-level connection registry)
-- -----------------------------------------------------------------------------
insert into integrations (key, name, category, connected, detail, position) values
  ('vercel',     'Vercel',        'hosting',  true, 'All deployments successful', 1),
  ('supabase',   'Supabase',      'database', true, 'Storage 82%',                2),
  ('github',     'GitHub',        'git',      true, 'All repositories synced',    3),
  ('cloudflare', 'Cloudflare',    'domains',  true, 'All domains healthy',        4),
  ('openai',     'OpenAI API',    'ai',       true, 'Normal usage',               5),
  ('anthropic',  'Anthropic API', 'ai',       true, 'Normal usage',               6);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
insert into projects
  (slug, name, tagline, status, progress, next_milestone, open_tasks, blockers, last_activity_at, accent, icon, repo, primary_domain, position)
values
  ('home-cooked',      'Home Cooked',     'Cookbook Platform',   'Active',   83, 'Family Sharing MVP',  3, 1, '2026-06-05 16:20:00', 'amber',  'chef',     'noahg/home-cooked',      'tryhomecooked.com',   1),
  ('wardrobe-harmony', 'WardrobeHarmony', 'Colorblind Closet',   'Active',   48, 'Closet Import',       5, 0, '2026-05-24 11:00:00', 'violet', 'shirt',    'noahg/wardrobe-harmony', 'wardrobeharmony.com', 2),
  ('personal-trainer', 'PersonalTrainer', 'Trainer Management',  'Planning', 21, 'Client Scheduling',   4, 0, '2026-05-09 09:30:00', 'blue',   'dumbbell', 'noahg/personal-trainer', null,                  3),
  ('cascade-lounge',   'Cascade Lounge',  'Lifestyle & Content', 'Content',  35, 'Spring Content Drop', 2, 0, '2026-05-31 18:00:00', 'orange', 'sofa',     null,                     'cascadelounge.co',    4);

-- -----------------------------------------------------------------------------
-- milestones (one current milestone per project)
-- -----------------------------------------------------------------------------
insert into milestones (slug, project_id, title, summary, priority, progress, status) values
  ('m-home-cooked',      (select id from projects where slug = 'home-cooked'),      'Family Sharing MVP',  'Allow families to share cookbooks and recipes with custom permissions.', 'High',   83, 'active'),
  ('m-wardrobe-harmony', (select id from projects where slug = 'wardrobe-harmony'), 'Closet Import',       'Drive WardrobeHarmony toward the "Closet Import" milestone.',            'High',   48, 'active'),
  ('m-personal-trainer', (select id from projects where slug = 'personal-trainer'), 'Client Scheduling',   'Drive PersonalTrainer toward the "Client Scheduling" milestone.',        'Medium', 21, 'planned'),
  ('m-cascade-lounge',   (select id from projects where slug = 'cascade-lounge'),   'Spring Content Drop', 'Drive Cascade Lounge toward the "Spring Content Drop" milestone.',        'Medium', 35, 'active');

-- -----------------------------------------------------------------------------
-- tasks (Home Cooked's Family Sharing MVP)
-- -----------------------------------------------------------------------------
insert into tasks (project_id, milestone_id, label, state, estimate, position)
select
  (select id from projects where slug = 'home-cooked'),
  (select id from milestones where slug = 'm-home-cooked'),
  t.label, t.state, t.estimate, t.position
from (values
  ('Design sharing permissions',   'done',   null,  1),
  ('Invite flow wireframes',       'done',   null,  2),
  ('Build share links backend',    'done',   null,  3),
  ('Update settings UI',           'active', '~3h', 4),
  ('Permission edge-case tests',   'todo',   '~2h', 5),
  ('Ship behind feature flag',     'todo',   '~1h', 6)
) as t(label, state, estimate, position);

-- -----------------------------------------------------------------------------
-- roadmap_items (Now / Next / Later)
-- -----------------------------------------------------------------------------
insert into roadmap_items (project_id, milestone_id, title, column_key, effort, tag, priority, status, sort_order) values
  ((select id from projects where slug = 'home-cooked'),      (select id from milestones where slug = 'm-home-cooked'),      'Family Sharing MVP',          'now',   'M', 'milestone', 'High',   'in_progress',  1),
  ((select id from projects where slug = 'home-cooked'),      null,                                                          'Settings UI refresh',         'now',   'S', null,         'Medium', 'in_progress',  2),
  ((select id from projects where slug = 'wardrobe-harmony'), (select id from milestones where slug = 'm-wardrobe-harmony'), 'Closet Import',               'now',   'L', 'milestone', 'High',   'in_progress',  3),
  ((select id from projects where slug = 'home-cooked'),      null,                                                          'Recipe import from URL',      'next',  'M', null,         'Medium', 'planned',      4),
  ((select id from projects where slug = 'wardrobe-harmony'), null,                                                          'Color-match recommendations', 'next',  'L', null,         'Medium', 'planned',      5),
  ((select id from projects where slug = 'personal-trainer'), (select id from milestones where slug = 'm-personal-trainer'), 'Client scheduling',           'next',  'M', 'milestone', 'High',   'planned',      6),
  ((select id from projects where slug = 'cascade-lounge'),   null,                                                          'Spring content drop',         'next',  'S', null,         'Medium', 'planned',      7),
  ((select id from projects where slug = 'home-cooked'),      null,                                                          'Mobile app shell',            'later', 'L', null,         'Medium', 'planned',      8),
  ((select id from projects where slug = 'personal-trainer'), null,                                                          'Stripe billing',              'later', 'M', null,         'Medium', 'planned',      9),
  ((select id from projects where slug = 'cascade-lounge'),   null,                                                          'Newsletter automation',       'later', 'S', null,         'Medium', 'planned',     10);

-- -----------------------------------------------------------------------------
-- decisions
-- -----------------------------------------------------------------------------
insert into decisions (project_id, title, status, dated_at, rationale, decision, tradeoffs, tags, options, chosen, position) values
  ((select id from projects where slug = 'home-cooked'),      'Use Supabase row-level security for sharing',       'Decided', '2026-06-02 00:00:00', 'RLS keeps permission logic in one place and avoids leaking other families'' data through the API layer.', 'Adopt Supabase row-level security for all sharing permissions.',          'Slightly harder local testing and policy debugging vs. app-layer checks.',                       array['security','architecture','sharing'], array['App-layer checks','Supabase RLS','Separate share service'], 'Supabase RLS', 1),
  ((select id from projects where slug = 'home-cooked'),      'Defer native mobile until web retention proves out', 'Decided', '2026-05-20 00:00:00', 'PWA covers 80% of mobile needs at ~10% of the cost while the core loop is still changing.',               'Ship a PWA first; revisit native apps after web retention proves out.',   'No push notifications or app-store presence in the near term.',                                   array['mobile','strategy'],                 array['React Native now','PWA first'],                              'PWA first',   2),
  ((select id from projects where slug = 'personal-trainer'), 'Pricing model for PersonalTrainer',                 'Open',    '2026-06-01 00:00:00', 'Per-seat vs per-client pricing — need to interview 5 trainers before committing.',                        null,                                                                      'Per-seat is simpler to bill; per-active-client aligns price with value but is harder to forecast.', array['pricing','gtm'],                     array['Per-seat','Per-active-client','Flat tier'],                  null,          3),
  ((select id from projects where slug = 'cascade-lounge'),   'Whether to keep Cascade Lounge in the portfolio',   'Revisit', '2026-05-15 00:00:00', 'Content engagement is flat. Revisit at end of Q2 with traffic data.',                                     null,                                                                      'Keeping it spreads focus; cutting it frees time for revenue products.',                          array['portfolio'],                         null,                                                               null,          4);

-- -----------------------------------------------------------------------------
-- activity_items (integration_key = provenance)
-- -----------------------------------------------------------------------------
insert into activity_items (project_id, integration_key, kind, title, occurred_at, ok) values
  ((select id from projects where slug = 'home-cooked'),      'github',     'commit', 'Pushed 4 commits to main',          '2026-06-07 12:41:00', null),
  ((select id from projects where slug = 'personal-trainer'), 'github',     'issue',  'Closed issue #27',                  '2026-06-06 15:00:00', null),
  ((select id from projects where slug = 'wardrobe-harmony'), 'vercel',     'deploy', 'Deployed to production',            '2026-06-05 10:12:00', true),
  (null,                                                      'cloudflare', 'domain', 'Domain tryhomecooked.com renewed',  '2026-06-05 08:00:00', null),
  ((select id from projects where slug = 'home-cooked'),      'supabase',   'infra',  'Supabase usage at 82%',             '2026-06-04 22:30:00', null);

-- -----------------------------------------------------------------------------
-- signals (studio-wide service health; integration_key = reporting source)
-- -----------------------------------------------------------------------------
insert into signals (project_id, integration_key, service, detail, level, position) values
  (null, 'vercel',     'Vercel',            'All deployments successful', 'ok',   1),
  (null, 'supabase',   'Supabase',          'Storage 82%',                'warn', 2),
  (null, 'github',     'GitHub',            'All repositories synced',    'ok',   3),
  (null, 'cloudflare', 'Domain Monitoring', 'All domains healthy',        'ok',   4),
  (null, 'openai',     'OpenAI API',        'Normal usage',               'ok',   5);

-- -----------------------------------------------------------------------------
-- expenses (integration_key = billing source)
-- -----------------------------------------------------------------------------
insert into expenses (project_id, integration_key, service, category, amount, position) values
  (null,                                                      'vercel',     'Vercel Pro',          'Hosting',  20.00, 1),
  ((select id from projects where slug = 'home-cooked'),      'supabase',   'Supabase',            'Hosting',   1.35, 2),
  ((select id from projects where slug = 'home-cooked'),      'openai',     'OpenAI API',          'AI Tools',  8.42, 3),
  ((select id from projects where slug = 'wardrobe-harmony'), 'anthropic',  'Anthropic API',       'AI Tools',  6.20, 4),
  ((select id from projects where slug = 'home-cooked'),      'cloudflare', 'tryhomecooked.com',   'Domains',   1.60, 5),
  ((select id from projects where slug = 'wardrobe-harmony'), 'cloudflare', 'wardrobeharmony.com', 'Domains',   1.60, 6),
  ((select id from projects where slug = 'cascade-lounge'),   'cloudflare', 'cascadelounge.co',    'Domains',   3.20, 7);

-- -----------------------------------------------------------------------------
-- domains (expires_at = studio anchor 2026-06-07 + the mock's expiresInDays)
-- -----------------------------------------------------------------------------
insert into domains (project_id, name, registrar, integration_key, expires_at, status) values
  ((select id from projects where slug = 'home-cooked'),      'tryhomecooked.com',   'Cloudflare', 'cloudflare', DATE '2026-06-07' + 327, 'healthy'),
  ((select id from projects where slug = 'wardrobe-harmony'), 'wardrobeharmony.com', 'Cloudflare', 'cloudflare', DATE '2026-06-07' + 41,  'expiring'),
  ((select id from projects where slug = 'cascade-lounge'),   'cascadelounge.co',    'Cloudflare', 'cloudflare', DATE '2026-06-07' + 198, 'healthy');

-- -----------------------------------------------------------------------------
-- expense_snapshots (6-month spend history → Money trend chart)
--   * Jan–May 2026: period roll-up totals (category/vendor NULL) — only the
--     monthly total was recorded for older periods.
--   * Jun 2026: itemized from the current expenses (sums to 42.37).
--   Monthly trend = SUM(amount) GROUP BY period_start.
-- -----------------------------------------------------------------------------
insert into expense_snapshots (category, vendor, amount, period_start, period_end) values
  (null, null, 31.10, DATE '2026-01-01', DATE '2026-01-31'),
  (null, null, 33.80, DATE '2026-02-01', DATE '2026-02-28'),
  (null, null, 29.40, DATE '2026-03-01', DATE '2026-03-31'),
  (null, null, 38.20, DATE '2026-04-01', DATE '2026-04-30'),
  (null, null, 40.05, DATE '2026-05-01', DATE '2026-05-31'),
  -- June 2026, itemized (mirrors the current expenses; Σ = 42.37)
  ('Hosting',  'Vercel Pro',          20.00, DATE '2026-06-01', DATE '2026-06-30'),
  ('Hosting',  'Supabase',             1.35, DATE '2026-06-01', DATE '2026-06-30'),
  ('AI Tools', 'OpenAI API',           8.42, DATE '2026-06-01', DATE '2026-06-30'),
  ('AI Tools', 'Anthropic API',        6.20, DATE '2026-06-01', DATE '2026-06-30'),
  ('Domains',  'tryhomecooked.com',    1.60, DATE '2026-06-01', DATE '2026-06-30'),
  ('Domains',  'wardrobeharmony.com',  1.60, DATE '2026-06-01', DATE '2026-06-30'),
  ('Domains',  'cascadelounge.co',     3.20, DATE '2026-06-01', DATE '2026-06-30');
