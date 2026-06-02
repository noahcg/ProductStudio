# Product Studio — Data Source Audit

> **Snapshot date:** 2026-06-02 · **Documentation only — no code modified.**
>
> For **every value displayed in the UI**, this maps:
> - **Current source** — where the value comes from today.
> - **Future source** — where it should come from in a real product.
> - **Required integration** — the system that must be built/connected.
>
> Today the answer to "Current source" is almost always **hard-coded in
> `src/lib/data.ts`**. The recommendation engine (`src/lib/recommend.ts`) is the
> one exception: it is *real logic computed over* the mock data.

### Legend — "Required integration" tokens

| Token | Meaning |
|---|---|
| **DB** | Application database (the spec names Supabase/Postgres) holding `projects`, `milestones`, `tasks`, `decisions`, `roadmap_items`, `alerts`, `spend_history`, etc. |
| **Auth** | Authentication + user/profile store (no user system exists today). |
| **GitHub API** | Commits, issues, PRs, repo sync, last-activity. |
| **Vercel API** | Deployments + hosting billing. |
| **Supabase Mgmt API** | Project storage/usage metrics + Supabase billing. |
| **Cloudflare API** | Domain health/registrar + domain billing. |
| **OpenAI API** | Usage + cost. |
| **Anthropic API** | Usage + cost (Admin/Usage & Cost API). |
| **Notifications** | Notification/event service backing the bell + alert feed. |
| **Billing aggregator** | A service that fans out to Vercel/Supabase/OpenAI/Anthropic/Cloudflare billing and normalizes into spend categories + history. |
| **none** | Static UI chrome / derived in-client; no external system needed. |

---

## Global — Header (`components/layout/app-header.tsx`)

| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Logo "Noah Glushien" | Hard-coded | User / workspace profile | Auth |
| "Product Studio" subtitle | Hard-coded | Static brand (keep) | none |
| Nav labels (Studio…Money) | Hard-coded `NAV` array | Static IA config (keep) | none |
| Active-nav highlight | Derived (`usePathname`) | Derived (keep) | none |
| Date "June 7, 2026" | **Live** `new Date()` | User locale/timezone | none |
| Time "Sat 2:41 PM" | **Live** `new Date()` | User locale/timezone | none |
| Theme (dark/light) | `localStorage` via next-themes | User preferences | Auth (sync) / none |
| Notification badge "3" | Hard-coded literal | Unread notification count | Notifications |

> ⚠️ The header clock is **live**, while every relative timestamp elsewhere is anchored to the fixed `NOW` constant in `data.ts`. These two sources disagree.

---

## Studio screen (`/` — `app/page.tsx`)

### Greeting (`studio/greeting.tsx`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| "Good morning/afternoon/evening" | Derived from client clock | Derived (keep) | none |
| "Noah." | Hard-coded | User profile | Auth |
| "Here's what's happening…" | Hard-coded copy | Static (keep) | none |

### Stat row (`studio/stat-row.tsx` ← `studioStats`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Projects "4" | `projects.length` (hard-coded array) | `COUNT(projects)` | DB |
| Active "2" | Filter on hard-coded `status` | `projects WHERE status='Active'` | DB |
| Needs Attention "1" | `alerts` count + `\|\| 1` fallback | Derived alert count | DB + Notifications |
| Monthly Spend "$42.37" | `spendTotal` (hard-coded) | Aggregated current-month spend | Billing aggregator |

### Project cards × 4 (`studio/project-card.tsx` ← `projects`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Name / tagline | Hard-coded | `projects` row | DB |
| Status badge (Active/Planning/Content) | Hard-coded | `projects.status` | DB |
| "NN% to next milestone" + bar | Hard-coded `progress` | Computed from milestone tasks | DB |
| Open tasks count | Hard-coded `openTasks` | `COUNT(tasks open)` | DB (or GitHub Issues) |
| Blockers count | Hard-coded `blockers` | `COUNT(tasks blocked)` | DB / GitHub Issue labels |
| "Last activity" (e.g. 2d ago) | Hard-coded `lastActivityIso` vs `NOW` | Latest commit/deploy event | GitHub API + Vercel API |
| Icon / accent color | Hard-coded | `projects` config row | DB |

### Current Focus (`studio/current-focus.tsx` ← `focus`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| "High Priority" badge | Hard-coded `focus.priority` | `milestones.priority` | DB |
| Title "Home Cooked — Family Sharing MVP" | Hard-coded `focus.title` | `milestones` row | DB |
| Progress ring "83%" | Hard-coded `focus.progress` | Computed from tasks | DB |
| Summary paragraph | Hard-coded | `milestones.summary` | DB |
| Checklist items (4 shown) + done/active state | Hard-coded `focus.tasks` | `tasks` rows | DB (or GitHub Projects) |
| "3 Tasks remaining" | Derived from tasks | Derived (keep logic) | DB |
| "View Focus" link | Static route | Static (keep) | none |

### Needs Attention (`studio/needs-attention.tsx` ← `alerts`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Count badge | `alerts.length` | Derived alert count | DB + Notifications |
| "WardrobeHarmony — No activity for 14 days" | Hard-coded alert | Computed from last commit | GitHub API |
| "Next milestone: Closet Import" | Hard-coded | `milestones` row | DB |
| "Domain Renewal — wardrobeharmony.com" | Hard-coded | Registrar record | Cloudflare API |
| "Expires in 41 days" | Hard-coded `meta` string | Registrar expiry date | Cloudflare API |
| CTA buttons (Open Roadmap / Manage) | Static routes | Static (keep) | none |

### Signals panel (`studio/signals-panel.tsx` ← `signals`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| "All systems operational" header | Derived from `signals` levels | Status aggregation | (all provider APIs) |
| Vercel — "All deployments successful" | Hard-coded | Deployment status | Vercel API |
| Supabase — "Storage 82%" | Hard-coded | Storage usage metric | Supabase Mgmt API |
| GitHub — "All repositories synced" | Hard-coded | Repo/sync status | GitHub API |
| Domain Monitoring — "All domains healthy" | Hard-coded | Domain health | Cloudflare API |
| OpenAI API — "Normal usage" | Hard-coded | Usage status | OpenAI API |
| OK / Watch status icon per row | Hard-coded `level` | Derived per API | (respective API) |

### Recent Activity (`studio/recent-activity.tsx` ← `activity`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| "Pushed 4 commits to main" · Home Cooked · 2h ago | Hard-coded | Push events | GitHub API |
| "Closed issue #27" · PersonalTrainer · Yesterday | Hard-coded | Issue events | GitHub API |
| "Deployed to production" · WardrobeHarmony · 2d ago ✓ | Hard-coded | Deployment events | Vercel API |
| "Domain tryhomecooked.com renewed" · 2d ago | Hard-coded | Registrar events | Cloudflare API |
| "Supabase usage at 82%" · Home Cooked · 3d ago | Hard-coded | Usage events | Supabase Mgmt API |
| "View all" link | Static route | Static (keep) | none |

### Monthly Spend (`studio/monthly-spend.tsx` ← `spend`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Total "$42.37" | Hard-coded `spendTotal` | Current-month aggregate | Billing aggregator |
| Donut segments | Hard-coded `spend` | Category aggregate | Billing aggregator |
| Hosting "$21.35 / 50%" | Hard-coded | Vercel + Supabase billing | Vercel + Supabase APIs |
| AI Tools "$14.62 / 34%" | Hard-coded | OpenAI + Anthropic cost | OpenAI + Anthropic APIs |
| Domains "$6.40 / 15%" | Hard-coded | Registrar billing | Cloudflare API |

### Footer banner (`app/page.tsx`)
| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| "You shipped 3 updates…this week" | Hard-coded literal string | Derived from activity feed | GitHub + Vercel APIs |
| "across 2 products" | Hard-coded literal | Derived count | DB |
| "Weekly Summary" / "View all projects" | Static routes | Static (keep) | none |

---

## Focus screen (`/focus` — `components/focus/focus-board.tsx`)

| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Heading + subtitle | Hard-coded copy | Static (keep) | none |
| Selected milestone (priority, project, title) | `focusForProject()` — hard-coded for Home Cooked, **synthesized** for others | `milestones` row | DB |
| Summary | Hard-coded / synthesized | `milestones.summary` | DB |
| Progress ring % | Hard-coded `progress` | Computed from tasks | DB |
| "N remaining" | Derived from local task state | Derived (keep) | DB |
| Milestone task list (labels, done/active, estimates) | Hard-coded / synthesized | `tasks` rows | DB (or GitHub Projects) |
| Task toggle interaction | Local `useState` (**not persisted**) | `UPDATE tasks.state` | DB |
| "In progress" badge | Derived from `task.state` | Derived (keep) | DB |
| **Recommendation list** — project name | Real logic over hard-coded data | Same logic over live data | DB |
| Recommendation **score** ("NN pts") | Computed by `recommend.ts` | Same heuristic over real signals | DB + GitHub/Vercel/Cloudflare |
| Recommendation **reasons** | Computed strings | Same, over real data | DB + provider APIs |
| "Why this is ranked here" block | Computed | Same | DB + provider APIs |

> Note: the recommendation engine's **logic** is production-ready; only its **inputs** (`projects`, `alerts`, `NOW`) are mocked.

---

## Roadmaps screen (`/roadmaps` — `app/roadmaps/page.tsx` ← `roadmap`)

| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Column titles Now/Next/Later + hints | Hard-coded `COLUMNS` config | Static (keep) | none |
| Per-column item count | Derived from `roadmap` | `COUNT(roadmap_items)` | DB |
| Card — project name + icon | Hard-coded | `projects` join | DB |
| Card — "Milestone" tag | Hard-coded `tag` | `roadmap_items.tag` | DB |
| Card — title | Hard-coded | `roadmap_items.title` | DB |
| Card — effort (Small/Medium/Large) | Hard-coded `effort` | `roadmap_items.effort` | DB |
| Empty-column placeholder | Static UI | Static (keep) | none |

---

## Decisions screen (`/decisions` — `app/decisions/page.tsx` ← `decisions`)

| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Header "N open / N decided" | Derived from `decisions` | Aggregate query | DB |
| Decision title | Hard-coded | `decisions.title` | DB |
| Status badge (Decided/Open/Revisit) | Hard-coded | `decisions.status` | DB |
| Project name + date | Hard-coded | `decisions` (+ `projects` join) | DB |
| Rationale | Hard-coded | `decisions.rationale` | DB |
| Option chips + chosen highlight | Hard-coded `options`/`chosen` | `decision_options` | DB |

---

## Signals screen (`/signals` — `app/signals/page.tsx`)

| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| Header "All systems operational / N need attention" | Derived from `signals` | Status aggregation | (all provider APIs) |
| **Service health** rows (Vercel, Supabase, GitHub, Domain Monitoring, OpenAI) | Hard-coded `signals` *(same as Studio panel)* | Per-provider status | Vercel / Supabase / GitHub / Cloudflare / OpenAI APIs |
| Operational/Watch pill per row | Hard-coded `level` | Derived per API | (respective API) |
| **Activity stream** rows | Hard-coded `activity` *(same as Studio)* | Event feeds | GitHub / Vercel / Cloudflare / Supabase APIs |
| **Integrations** list — names | Hard-coded `integrations` | Connection registry | DB |
| Integrations — "Connected" status | Hard-coded (`connected: true`) | OAuth connection state | DB + each provider OAuth |
| **Open alerts** items | Hard-coded `alerts` | Derived/queried alerts | DB + Notifications |
| "Back to Studio" link | Static route | Static (keep) | none |

---

## Money screen (`/money` — `app/money/page.tsx`)

| Displayed value | Current source | Future source | Required integration |
|---|---|---|---|
| "This month" total "$42.37" | Hard-coded `spendTotal` | Current-month aggregate | Billing aggregator |
| Delta "% vs last month" | Derived from `spendTrend` (hard-coded prior) | Computed from spend history | Billing aggregator + DB (history) |
| Donut + category amounts/% | Hard-coded `spend` | Category aggregate | Billing aggregator |
| **6-month trend** Jan–May bars | Hard-coded `spendTrend` | `spend_history` table | DB (+ Billing aggregator backfill) |
| 6-month trend — June bar | Derived (`= spendTotal`) | Current-month aggregate | Billing aggregator |
| **Expenses table** — Vercel Pro $20.00 | Hard-coded | Vercel invoice | Vercel API |
| — Supabase $1.35 | Hard-coded | Supabase billing | Supabase Mgmt API |
| — OpenAI API $8.42 | Hard-coded | OpenAI cost | OpenAI API |
| — Anthropic API $6.20 | Hard-coded | Anthropic cost | Anthropic API |
| — tryhomecooked.com $1.60 | Hard-coded | Registrar billing | Cloudflare API |
| — wardrobeharmony.com $1.60 | Hard-coded | Registrar billing | Cloudflare API |
| — cascadelounge.co $3.20 | Hard-coded | Registrar billing | Cloudflare API |
| Expense → Project column | Hard-coded `projectId` | Cost-allocation mapping | DB |
| Expense → Category badge | Hard-coded `category` | Cost-allocation rules | DB |
| Table total | Derived | Aggregate | Billing aggregator |
| **Spend by project** amounts + bars | Derived from `expenses` | Aggregate by project | Billing aggregator + DB |

---

## Reverse index — what each integration unlocks

| Integration | Powers these displayed values |
|---|---|
| **Auth** | User name in header + greeting; theme sync. |
| **DB** | All project/milestone/task/decision/roadmap fields; counts; integration connection state; cost→project allocation; spend history. |
| **GitHub API** | Commit/issue activity, "last activity", repo-sync signal, stale-project alert, "shipped N updates" banner. |
| **Vercel API** | Deployment activity + signal; hosting cost. |
| **Supabase Mgmt API** | Storage % signal/activity; Supabase cost. |
| **Cloudflare API** | Domain-health signal; domain-renewal alert + expiry; domain costs/renewal activity. |
| **OpenAI API** | OpenAI usage signal; OpenAI cost. |
| **Anthropic API** | Anthropic cost (no signal row shown today, though `integrations` lists it). |
| **Notifications** | Bell badge count; alert feed; Needs Attention count. |
| **Billing aggregator** | Monthly Spend total/donut; Money totals, trend, deltas, category + per-project rollups. |

---

## Summary

- **~95% of displayed values are hard-coded** in `src/lib/data.ts`.
- **Only live values today:** the header date/time (client clock) and the theme (localStorage).
- **Real logic, mocked inputs:** the Focus recommendation engine.
- **Biggest unlock = DB + Auth**, which together turn most static fields into real records. Provider APIs (GitHub, Vercel, Supabase, Cloudflare, OpenAI, Anthropic) then replace the *signals, activity, and spend* surfaces, ideally behind a **billing aggregator** for the Money screen.
