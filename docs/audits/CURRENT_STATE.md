# Product Studio — Current State Audit

> **Snapshot date:** 2026-06-02
> **Scope:** Full codebase audit. Documentation only — no code was modified.
> **Verdict:** A visually complete, fully static MVP. Every screen renders from
> hard-coded mock data. There is **no backend, no database, and zero live
> integrations**. The app is a high-fidelity front-end shell ready to be wired
> to real data sources.

---

## 1. Tech Stack

| Concern | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router, Turbopack) | `16.2.7` | Static-only; all routes prerender as static content. |
| UI runtime | React | `19.2.4` | |
| Language | TypeScript | `^5` | `strict` enabled via default tsconfig. |
| Styling | Tailwind CSS v4 | `^4` | CSS-first config via `@theme` in `globals.css`. No `tailwind.config.*` file. |
| Icons | lucide-react | `1.17.0` | ⚠️ Unusual major version (see Technical Debt). Brand icons removed. |
| Theme | next-themes | `^0.4.6` | Class strategy, persisted to `localStorage`. |
| Class utils | clsx + tailwind-merge | `^2.1.1` / `^3.6.0` | Wrapped by `cn()`. |
| Fonts | next/font (Google) | — | Inter (body) + Dancing Script (logo). Fetched at build. |

**Total source:** ~2,156 lines across 26 TS/TSX files.

---

## 2. Page Structure

App Router, all pages under `src/app/`. All routes are **statically prerendered** (`○ Static`).

| Route | File | Rendering | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Server (Studio) | Landing dashboard. Matches the approved mockup. |
| `/focus` | `src/app/focus/page.tsx` | Client (wrapped in `<Suspense>`) | Active milestone + recommendation engine. |
| `/roadmaps` | `src/app/roadmaps/page.tsx` | Server | Now / Next / Later board. |
| `/decisions` | `src/app/decisions/page.tsx` | Server | Decision log. |
| `/signals` | `src/app/signals/page.tsx` | Server | Infra health, integrations, activity, alerts. |
| `/money` | `src/app/money/page.tsx` | Server | Spend tracking. |

**Layout:** `src/app/layout.tsx` wraps everything in `ThemeProvider` + `AppHeader`, constrains content to `max-w-[1400px]`.

**Notably absent:**
- No `loading.tsx`, `error.tsx`, or `not-found.tsx` (except the Next.js default `/_not-found`).
- No `/api` route handlers.
- No middleware, no route groups, no dynamic routes.
- The Information Architecture spec (`PS-02`) lists six screens — all six exist. No screen for the master prompt / settings.

---

## 3. Components

### Layout & shell
| Component | File | Type | Notes |
|---|---|---|---|
| `AppHeader` | `components/layout/app-header.tsx` | Client | Logo, nav with active-link underline (`usePathname`), live clock, theme toggle, notification bell. |
| `ThemeToggle` | `components/layout/theme-toggle.tsx` | Client | Dark/light switch. |
| `ThemeProvider` | `components/theme-provider.tsx` | Client | Wraps `next-themes`. |

### Design-system primitives — `components/ui.tsx`
`Card`, `CardHeader`, `Badge` (6 tones), `Progress`, `Button` (4 variants), `LinkButton`, `StatusDot`, `PageHeading`. These are bespoke, **not** shadcn/ui despite the master prompt (`PS-12`) calling for shadcn/ui.

### Shared visual
| Component | File | Notes |
|---|---|---|
| `Donut`, `ProgressRing` | `components/donut.tsx` | Hand-rolled SVG. No chart library. |
| `icons.tsx` | `components/icons.tsx` | Maps domain keys → lucide icons; `accentStyles` color table. |

### Studio sections — `components/studio/`
`StatRow`, `ProjectCard`, `CurrentFocus`, `NeedsAttention`, `SignalsPanel`, `RecentActivity`, `MonthlySpend`, `Greeting` (client).

### Focus
`FocusBoard` (`components/focus/focus-board.tsx`) — client; the only component with real interactivity (task toggling, recommendation selection). Contains a nested `RecReasons` helper.

**Reuse gaps:**
- `ProjectCard` and several panels re-implement an inline progress bar instead of using the `Progress` primitive from `ui.tsx`.
- Activity-stream list markup is duplicated between `studio/recent-activity.tsx` and `signals/page.tsx`.
- Signal-row markup is duplicated between `studio/signals-panel.tsx` and `signals/page.tsx`.

---

## 4. Database Schema

**There is no database.** No ORM, no migrations, no SQL, no Supabase client, no schema file. Persistence does not exist beyond `localStorage` (theme only).

The **implicit schema**, inferred from `src/lib/types.ts`, that a real backend would need:

| Entity | Key fields | Source of truth today |
|---|---|---|
| `Project` | id, name, tagline, status, progress, nextMilestone, openTasks, blockers, lastActivityIso, accent, icon, repo?, domain? | `data.ts` array |
| `Focus` | projectId, title, priority, summary, progress, tasks[] | `data.ts` (one hand-authored + synthesized) |
| `FocusTask` | id, label, state (done/active/todo), estimate? | embedded in Focus |
| `Signal` | id, service, detail, level, integration | `data.ts` array |
| `ActivityItem` | id, kind, title, projectId?, whenIso, ok? | `data.ts` array |
| `Alert` | id, kind, projectId?, title, detail, meta?, cta | `data.ts` array |
| `Integration` | key, name, connected, detail | `data.ts` array |
| `Expense` / `SpendCategory` | service, category, amount, projectId?, integration? | `data.ts` array |
| `RoadmapItem` | id, title, projectId, column, effort, tag? | `data.ts` array |
| `Decision` | id, title, projectId?, status, dateIso, rationale, options?, chosen? | `data.ts` array |

Relationships are by string `projectId` / `integration` key, resolved at render time via `getProject()` and `.find()` lookups — there is no referential integrity enforcement.

---

## 5. Mocked Data Sources

**Everything.** The single source of truth is `src/lib/data.ts` (one module, all exports static).

| Export | Shape | Feeds |
|---|---|---|
| `NOW` | fixed `Date("2026-06-07T14:41:00")` | All relative-time labels. |
| `projects` | 4 projects | Studio cards, Roadmaps, Money, Focus. |
| `focus` | 1 hand-authored milestone (Home Cooked) | Studio Current Focus, Focus screen. |
| `focusForProject()` | synthesizes a milestone for any other project from its `progress` | Focus screen when switching projects. |
| `integrations` | 6 entries (all `connected: true`) | Signals. |
| `signals` | 5 entries | Studio + Signals. |
| `activity` | 5 entries | Studio + Signals. |
| `alerts` | 2 entries | Studio Needs Attention, Signals. |
| `spend` / `spendTotal` | 3 categories, sums to `$42.37` | Studio donut, Money. |
| `expenses` | 7 line items | Money table. |
| `spendTrend` | 6 months (last month = live `spendTotal`, prior 5 hard-coded) | Money trend chart. |
| `decisions` | 4 entries | Decisions. |
| `roadmap` | 10 items across now/next/later | Roadmaps. |
| `studioStats` | derived counts | Studio stat row. |

The recommendation engine (`src/lib/recommend.ts`) is **real logic over mock data** — a transparent scoring heuristic, not a placeholder. It is the most "product-like" non-UI code in the repo.

---

## 6. Real Integrations

| Integration | Status | Notes |
|---|---|---|
| next-themes | ✅ Real | Reads/writes theme to `localStorage`. |
| Google Fonts (next/font) | ✅ Real | Inter + Dancing Script fetched/optimized at build. |
| lucide-react | ✅ Real | Local icon rendering only. |

That is the **complete list of anything that touches the outside world.** No analytics, no auth, no telemetry, no API calls.

---

## 7. Missing Integrations

The Integrations spec (`PS-11`) names six services. **None are connected** — they appear only as static rows/labels:

| Service | Spec'd | Current reality |
|---|---|---|
| GitHub | ✅ | Static "All repositories synced" signal + fake commit/issue activity. Icon is `GitBranch` (lucide `Github` removed in 1.x). |
| Vercel | ✅ | Static "All deployments successful" + fake deploy activity. |
| Supabase | ✅ | Static "Storage 82%" warning. No client, no DB. |
| Cloudflare | ✅ | Static "All domains healthy" + fake domain-renewal activity. |
| OpenAI | ✅ | Static "Normal usage" + a `$8.42` line item. No API key, no calls. |
| Anthropic | ✅ | Same — static `$6.20` line item only. |

**Also missing entirely (not yet spec'd but implied by a "founder OS"):**
- Authentication / user accounts (single hard-coded user "Noah").
- Any persistence layer / database.
- Notifications backend (bell badge is decorative).
- Background jobs / webhooks to refresh signals, spend, activity.

---

## 8. Hard-Coded Values

A non-exhaustive but representative list, with locations:

**Identity / branding**
- User name `"Noah"` / `"Noah Glushien"` — `app-header.tsx`, `studio/greeting.tsx`.
- Notification badge count `3` — `app-header.tsx` (decorative, not derived from `alerts`).

**Clock / time**
- `NOW = 2026-06-07T14:41:00` — `data.ts`. All relative times are anchored to this constant **while the header clock uses live `new Date()`** → the two will disagree (see Technical Debt).

**Numbers baked into copy/markup**
- Footer banner: "You shipped **3 updates** across **2 products** this week" — `page.tsx` (literal string, not computed).
- `spendTrend` Jan–May amounts — `data.ts` (only June is derived).
- All dollar amounts, percentages, task counts, and ISO dates throughout `data.ts`.

**Magic colors / dimensions**
- Accent hex values duplicated across three places: CSS tokens in `globals.css`, `accentStyles` in `icons.tsx`, and `spend[].color` in `data.ts` (e.g. `#7c5cff`, `#2dd4a7`, `#f5a623` appear in all three with no shared constant).
- Effort labels `{ S: "Small", M: "Medium", L: "Large" }` — `roadmaps/page.tsx`.
- Domain-expiry threshold `< 45` days and idle threshold `>= 14` days — `recommend.ts`.

**Routing approximations** (links that point at "close enough" destinations)
- Recent Activity "View all" → `/signals`; alert CTAs → `/roadmaps` or `/money` based on `kind`; Weekly Summary → `/roadmaps`. These are placeholders for screens/actions that don't exist yet.

---

## 9. Technical Debt

1. **`lucide-react@1.17.0` is an unusual pin.** The mainstream package is published on the `0.x` line; `1.17.0` resolved from the registry and was verified as the legitimate `lucide-icons/lucide` build, but the major version is worth pinning intentionally and revisiting. Brand icons (`Github`, etc.) are gone — `GitBranch` is used as a substitute.

2. **Two clocks disagree.** `NOW` (fixed June 7 2026) drives all relative-time labels, but `AppHeader` shows the *real* current time. On any real date the header and the "2d ago" labels describe different timelines. Pick one source.

3. **Greeting hydration.** `Greeting` renders `"Good afternoon"` on the server then corrects to the real part-of-day in `useEffect`. Acceptable, but it is a deliberate server/client divergence; `suppressHydrationWarning` is only set on `<html>` (for theme), not here.

4. **`studioStats.needsAttention` has a `|| 1` fallback** (`data.ts`) — masks a `0` count and will always show at least 1. Fragile and surprising.

5. **No persistence of interaction.** Focus task toggles live in component `useState`, reset on project switch and lost on navigation. Nothing is saved.

6. **Spec drift — shadcn/ui not used.** `PS-12` calls for shadcn/ui; the project ships a hand-rolled primitive set instead. Functionally fine, but diverges from the stated stack.

7. **Fragile string parsing in the recommendation engine.** `recommend.ts` extracts domain-expiry days by regex-stripping non-digits from the alert's `meta` string (`"Expires in 41 days"`). Couples logic to copy.

8. **Dead / unused code.** `daysUntil` is imported and re-exported by `recommend.ts` but never used there. `accentStyles` defines `green`/`teal` accents no project uses. The `Progress` primitive is bypassed by inline bars.

9. **No tests, no CI.** Zero test files, no linting in build pipeline beyond `next build`'s type check.

10. **Decisions options rendering bug (minor).** In `decisions/page.tsx`, options are struck-through unless `opt === d.chosen`. For `Open` decisions (no `chosen`, e.g. "Pricing model for PersonalTrainer"), **every** option renders struck-through, implying all were rejected. Should only strike options on `Decided` cards.

11. **Leftover scaffold artifacts.** `AGENTS.md` (generic Next.js agent rules) and `CLAUDE.md` (`@AGENTS.md` pointer) remain from `create-next-app`. Harmless but unowned.

---

## 10. Areas That Need Refactoring

| Priority | Area | Recommendation |
|---|---|---|
| High | **Data layer → real sources** | `data.ts` is already a clean seam. Replace each export with an async fetcher (GitHub/Vercel/Supabase/Cloudflare/OpenAI/Anthropic) behind the same types. Move from static prerender to server components with `fetch`/caching. |
| High | **Introduce persistence + auth** | A "founder OS" needs at least one user and saved state (task completion, decisions, roadmap edits). Supabase is already named in the signals — wire it for real. |
| Medium | **Single color-token source** | Collapse the three duplicated palettes (CSS vars / `accentStyles` / `spend` colors) into one exported constant consumed everywhere. |
| Medium | **Extract shared list components** | `ActivityRow` and `SignalRow` are duplicated between Studio panels and the Signals page — promote to shared components. |
| Medium | **Unify the clock** | Remove `NOW` or feed the header from it; derive relative times from a single source. |
| Low | **Compute derived copy** | Footer "3 updates / 2 products" and the notification badge should be computed from data, not literals. |
| Low | **Adopt the spec'd component lib or update the spec** | Either migrate primitives to shadcn/ui per `PS-12`, or amend the spec to reflect the bespoke system. |
| Low | **Add error/loading boundaries** | Once data goes async, add `loading.tsx` / `error.tsx` per route. |

---

## 11. Summary

Product Studio is a **polished, faithful front-end MVP** that matches the approved mockup across all six IA screens, with one genuinely functional piece of product logic (the recommendation engine). It is **100% mock-data-driven**: no database, no auth, no live integrations. The architecture is clean and the data layer (`src/lib/data.ts`) is a deliberate, well-isolated seam, so the path to a real product is "replace the seam with live fetchers and add persistence" rather than a rewrite. The most pressing gaps are backend reality (data sources, DB, auth) and a handful of consistency/refactor items (dual clocks, duplicated color palettes and list components, the Decisions strike-through bug).
