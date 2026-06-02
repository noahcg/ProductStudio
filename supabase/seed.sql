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
  domains, expenses, signals, activity_items, decisions,
  tasks, roadmap_items, milestones, projects, integrations
  restart identity cascade;

-- -----------------------------------------------------------------------------
-- integrations (studio-level connection registry)
-- -----------------------------------------------------------------------------
insert into integrations (key, name, category, connected, detail) values
  ('vercel',     'Vercel',        'hosting',  true, 'All deployments successful'),
  ('supabase',   'Supabase',      'database', true, 'Storage 82%'),
  ('github',     'GitHub',        'git',      true, 'All repositories synced'),
  ('cloudflare', 'Cloudflare',    'domains',  true, 'All domains healthy'),
  ('openai',     'OpenAI API',    'ai',       true, 'Normal usage'),
  ('anthropic',  'Anthropic API', 'ai',       true, 'Normal usage');

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
insert into projects
  (slug, name, tagline, status, progress, next_milestone, open_tasks, blockers, last_activity_at, accent, icon, repo, primary_domain)
values
  ('home-cooked',      'Home Cooked',     'Cookbook Platform',   'Active',   83, 'Family Sharing MVP',  3, 1, '2026-06-05 16:20:00', 'amber',  'chef',     'noahg/home-cooked',      'tryhomecooked.com'),
  ('wardrobe-harmony', 'WardrobeHarmony', 'Colorblind Closet',   'Active',   48, 'Closet Import',       5, 0, '2026-05-24 11:00:00', 'violet', 'shirt',    'noahg/wardrobe-harmony', 'wardrobeharmony.com'),
  ('personal-trainer', 'PersonalTrainer', 'Trainer Management',  'Planning', 21, 'Client Scheduling',   4, 0, '2026-05-09 09:30:00', 'blue',   'dumbbell', 'noahg/personal-trainer', null),
  ('cascade-lounge',   'Cascade Lounge',  'Lifestyle & Content', 'Content',  35, 'Spring Content Drop', 2, 0, '2026-05-31 18:00:00', 'orange', 'sofa',     null,                     'cascadelounge.co');

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
insert into tasks (project_id, milestone_id, label, state, estimate)
select
  (select id from projects where slug = 'home-cooked'),
  (select id from milestones where slug = 'm-home-cooked'),
  t.label, t.state, t.estimate
from (values
  ('Design sharing permissions',   'done',   null),
  ('Invite flow wireframes',       'done',   null),
  ('Build share links backend',    'done',   null),
  ('Update settings UI',           'active', '~3h'),
  ('Permission edge-case tests',   'todo',   '~2h'),
  ('Ship behind feature flag',     'todo',   '~1h')
) as t(label, state, estimate);

-- -----------------------------------------------------------------------------
-- roadmap_items (Now / Next / Later)
-- -----------------------------------------------------------------------------
insert into roadmap_items (project_id, milestone_id, title, column_key, effort, tag) values
  ((select id from projects where slug = 'home-cooked'),      (select id from milestones where slug = 'm-home-cooked'),      'Family Sharing MVP',          'now',   'M', 'milestone'),
  ((select id from projects where slug = 'home-cooked'),      null,                                                          'Settings UI refresh',         'now',   'S', null),
  ((select id from projects where slug = 'wardrobe-harmony'), (select id from milestones where slug = 'm-wardrobe-harmony'), 'Closet Import',               'now',   'L', 'milestone'),
  ((select id from projects where slug = 'home-cooked'),      null,                                                          'Recipe import from URL',      'next',  'M', null),
  ((select id from projects where slug = 'wardrobe-harmony'), null,                                                          'Color-match recommendations', 'next',  'L', null),
  ((select id from projects where slug = 'personal-trainer'), (select id from milestones where slug = 'm-personal-trainer'), 'Client scheduling',           'next',  'M', 'milestone'),
  ((select id from projects where slug = 'cascade-lounge'),   null,                                                          'Spring content drop',         'next',  'S', null),
  ((select id from projects where slug = 'home-cooked'),      null,                                                          'Mobile app shell',            'later', 'L', null),
  ((select id from projects where slug = 'personal-trainer'), null,                                                          'Stripe billing',              'later', 'M', null),
  ((select id from projects where slug = 'cascade-lounge'),   null,                                                          'Newsletter automation',       'later', 'S', null);

-- -----------------------------------------------------------------------------
-- decisions
-- -----------------------------------------------------------------------------
insert into decisions (project_id, title, status, dated_at, rationale, options, chosen) values
  ((select id from projects where slug = 'home-cooked'),      'Use Supabase row-level security for sharing',       'Decided', '2026-06-02 00:00:00', 'RLS keeps permission logic in one place and avoids leaking other families'' data through the API layer.', array['App-layer checks','Supabase RLS','Separate share service'], 'Supabase RLS'),
  ((select id from projects where slug = 'home-cooked'),      'Defer native mobile until web retention proves out', 'Decided', '2026-05-20 00:00:00', 'PWA covers 80% of mobile needs at ~10% of the cost while the core loop is still changing.',               array['React Native now','PWA first'],                              'PWA first'),
  ((select id from projects where slug = 'personal-trainer'), 'Pricing model for PersonalTrainer',                 'Open',    '2026-06-01 00:00:00', 'Per-seat vs per-client pricing — need to interview 5 trainers before committing.',                        array['Per-seat','Per-active-client','Flat tier'],                  null),
  ((select id from projects where slug = 'cascade-lounge'),   'Whether to keep Cascade Lounge in the portfolio',   'Revisit', '2026-05-15 00:00:00', 'Content engagement is flat. Revisit at end of Q2 with traffic data.',                                     null,                                                               null);

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
insert into signals (project_id, integration_key, service, detail, level) values
  (null, 'vercel',     'Vercel',            'All deployments successful', 'ok'),
  (null, 'supabase',   'Supabase',          'Storage 82%',                'warn'),
  (null, 'github',     'GitHub',            'All repositories synced',    'ok'),
  (null, 'cloudflare', 'Domain Monitoring', 'All domains healthy',        'ok'),
  (null, 'openai',     'OpenAI API',        'Normal usage',               'ok');

-- -----------------------------------------------------------------------------
-- expenses (integration_key = billing source)
-- -----------------------------------------------------------------------------
insert into expenses (project_id, integration_key, service, category, amount) values
  (null,                                                      'vercel',     'Vercel Pro',          'Hosting',  20.00),
  ((select id from projects where slug = 'home-cooked'),      'supabase',   'Supabase',            'Hosting',   1.35),
  ((select id from projects where slug = 'home-cooked'),      'openai',     'OpenAI API',          'AI Tools',  8.42),
  ((select id from projects where slug = 'wardrobe-harmony'), 'anthropic',  'Anthropic API',       'AI Tools',  6.20),
  ((select id from projects where slug = 'home-cooked'),      'cloudflare', 'tryhomecooked.com',   'Domains',   1.60),
  ((select id from projects where slug = 'wardrobe-harmony'), 'cloudflare', 'wardrobeharmony.com', 'Domains',   1.60),
  ((select id from projects where slug = 'cascade-lounge'),   'cloudflare', 'cascadelounge.co',    'Domains',   3.20);

-- -----------------------------------------------------------------------------
-- domains (expires_at = studio anchor 2026-06-07 + the mock's expiresInDays)
-- -----------------------------------------------------------------------------
insert into domains (project_id, name, registrar, integration_key, expires_at, status) values
  ((select id from projects where slug = 'home-cooked'),      'tryhomecooked.com',   'Cloudflare', 'cloudflare', DATE '2026-06-07' + 327, 'healthy'),
  ((select id from projects where slug = 'wardrobe-harmony'), 'wardrobeharmony.com', 'Cloudflare', 'cloudflare', DATE '2026-06-07' + 41,  'expiring'),
  ((select id from projects where slug = 'cascade-lounge'),   'cascadelounge.co',    'Cloudflare', 'cloudflare', DATE '2026-06-07' + 198, 'healthy');
