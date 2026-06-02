# Phase 2.4 — Database-Backed Data via the Repository Seam

> **Status:** Complete. The repository (`src/lib/data/index.ts`) now reads from
> **Supabase when configured**, falling back to **local mock fixtures** when
> it isn't. Every `getX()` signature is unchanged, so **no UI component, route,
> or design was modified**. No real external integrations, no auth, no
> user/team/account features.

## How it works

A small **source abstraction** sits behind the existing repo seam:

```
UI (server components)  →  src/lib/data/index.ts  (public getX(), unchanged)
                               │  derives focus / spend / stats on top
                               ▼
                         withSource()  →  activeSource()
                          ┌───────────────┴───────────────┐
                   supabaseSource(client)            mockSource
                   (queries + row→domain)        (Phase 2.1/2.2 fixtures)
                               │
                     src/lib/supabase/server.ts  (env-driven; null if unset)
```

- **`activeSource()`** picks Supabase when `SUPABASE_URL` + `SUPABASE_ANON_KEY`
  are set (and `DATA_SOURCE !== "mock"`); otherwise mock.
- **`withSource()`** runs each read against the active source and **falls back
  to mock if a database call throws** (misconfig / network / unseeded), so the
  UI keeps rendering instead of erroring.
- In this dev environment (no env vars) the app uses **mock** — which is why
  the screenshots are byte-for-byte identical to Phase 2.3.

## New / changed files

**New**
- `src/lib/supabase/server.ts` — server-only Supabase client (returns `null` if unconfigured).
- `src/lib/data/source.ts` — `DataSource` interface, `activeSource()`, `withSource()`.
- `src/lib/data/mock-source.ts` — `DataSource` over the existing fixtures.
- `src/lib/data/supabase-source.ts` — `DataSource` over Supabase: queries + row→domain mappers.
- `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx` — graceful states (themed, additive).
- `supabase/migrations/20260602140000_add_display_order.sql` — `position` columns for stable ordering.
- `.env.example` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATA_SOURCE`.

**Changed**
- `src/lib/data/index.ts` — rewritten to use the active source; same exports/signatures.
- `supabase/seed.sql` — `position` values added to the ordered tables.
- `src/components/focus/focus-board.tsx` — empty-projects guard (no crash if 0 projects).
- `src/app/money/page.tsx` — trend-delta guard for short/empty history.
- `package.json` — `@supabase/supabase-js`.

**Untouched:** all page layouts/markup, styling, routing, and the domain model.

## Data mapping (DB → domain)

`supabase-source.ts` maps Phase 2.3 rows to Phase 2.2 models. The important rule:
the domain `id` is the **slug** and children reference parents by slug (resolved
via PostgREST nested selects, e.g. `project:projects(slug)`), preserving every
cross-reference the UI relies on (`/focus?project=home-cooked`, project lookups,
etc.). Other conversions: `dated_at`/`occurred_at`/`last_activity_at` → ISO
strings; `column_key` → `column`; `expires_at` → derived `expiresInDays`
(via the studio clock); numeric `amount` → number; `expense_snapshots` grouped
by period → the 6-month trend.

## Derived vs. stored

- **Composed in the repo** (source-agnostic): `getFocus` (top recommendation's
  active milestone + its tasks), `getSpend` (aggregate `expenses` by category),
  `getStudioStats`, `getProjectMap`.
- **Backed by tables**: projects, milestones, tasks, roadmap, decisions,
  activity, signals, integrations, expenses, domains, and the **spend trend**
  (from `expense_snapshots` — the Phase 2.3 F1 fix).
- **Fixture-only by design** (no table; single-user chrome / derived view):
  `getAlerts`, `getProfile`, `getWeeklySummary`.

## Validation

- **Build:** `npm run build` passes, TypeScript clean, all six routes prerender.
- **Mock path (this env):** Studio, Focus, Roadmaps, Decisions, Signals, Money
  render **identically** to Phase 2.3 (screenshots verified, incl. Money donut,
  expense table, and the 6-month trend snapshots).
- **Server-only:** confirmed no client component imports the repo or Supabase
  client; keys never reach the browser.

### Validating the database path (requires Supabase — not available in this env)
The DB path could not be exercised here (no Postgres/Supabase tooling). To verify:
1. `supabase init && supabase start` (or use a hosted project), then
   `supabase db reset` to run migrations + seed.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`.
3. `npm run dev` → each screen now renders from the database. Temporarily set
   `DATA_SOURCE=mock` to A/B against fixtures (should be identical).

> Rendering note: pages currently prerender statically. With Supabase configured
> at build time, data is read at build. For always-fresh data, add
> `export const revalidate = 0` (or `dynamic = "force-dynamic"`) per route — a
> follow-up, intentionally not changed here to avoid altering rendering behavior.

## Explicitly NOT done (per scope)
- ❌ No UI redesign, no routing changes.
- ❌ No real external integrations (GitHub/Vercel/etc. still provenance labels only).
- ❌ No auth, no RLS, no user/team/account features.
- ❌ Mock fixtures retained as fallback + dev fixture (not deleted).
