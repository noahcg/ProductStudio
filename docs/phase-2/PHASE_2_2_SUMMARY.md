# Phase 2.2 — Core Domain Model

> **Status:** Complete. **Mock data only** — no Supabase, no integrations.
> **No UI design changes, no routing changes, no visual regressions.**
> Production build passes; all six routes still prerender as static.

## Goal

Formalize Product Studio's implicit schema into an explicit, typed **domain
model** where a **Project is the source of truth** and owns its child entities.
External services are integrations only.

## What changed

### 1. New domain layer — `src/lib/domain/`
Type definitions now live in one file per entity (the canonical home). Ten
requested models, plus shared ids and derived views:

| File | Defines |
|---|---|
| `ids.ts` | `ProjectId`, `MilestoneId`, `TaskId`, `RoadmapItemId`, `DecisionId`, `ActivityId`, `SignalId`, `ExpenseId`, `DomainId`, `AlertId`, `IntegrationKey` |
| `project.ts` | **Project** (aggregate root) + `ProjectStatus`, `ProjectAccent`, `ProjectIcon` |
| `milestone.ts` | **Milestone** + `MilestonePriority`, `MilestoneStatus` |
| `task.ts` | **Task** + `TaskState` |
| `roadmap.ts` | **RoadmapItem** + `RoadmapColumn`, `Effort` |
| `decision.ts` | **Decision** + `DecisionStatus` |
| `activity.ts` | **Activity** + `ActivityKind` |
| `signal.ts` | **Signal** + `SignalLevel` |
| `expense.ts` | **Expense** + `SpendCategoryName` |
| `domain.ts` | **Domain** + `DomainStatus` |
| `integration.ts` | **Integration** + `IntegrationCategory` |
| `views.ts` | Derived/support types: `Focus`, `Alert`, `SpendCategory`, `Spend`, `SpendTrendPoint`, `Profile`, `StudioStats`, `WeeklySummary` |
| `index.ts` | Barrel re-export of all of the above |

`src/lib/types.ts` is now a one-line **compatibility re-export** of
`@/lib/domain`, so every existing `@/lib/types` import keeps working untouched.

### 2. Ownership is now explicit
Every child entity carries the `ProjectId` of its owning project. A Project owns
its **milestones, tasks, roadmap items, decisions, activity, expenses, domains,
and signals**. Integrations (`github`, `vercel`, `supabase`, `cloudflare`,
`openai`, `anthropic`) appear only as a **source/provenance annotation**
(`integration` field on Signal/Activity/Expense/Domain) — never as an owner.

### 3. Promoted to first-class entities
Three concepts that were previously strings or embedded are now real,
project-owned entities, with new seed fixtures:

- **Milestone** — was only `project.nextMilestone` (a string) + the embedded
  focus. Now `src/lib/data/milestones.ts` (one per project).
- **Task** — was `FocusTask` embedded inside `Focus`. Now `src/lib/data/tasks.ts`
  (Home Cooked's six tasks, linked to its milestone). `FocusTask` → `Task`.
- **Domain** — was `project.domain` (a string). Now `src/lib/data/domains.ts`
  (three domains, registrar = Cloudflare; WardrobeHarmony is the one expiring).

**Focus is now a derived view, not an entity.** `data/focus.ts` *composes* the
Current Focus from a Milestone + its Tasks; `getFocus()` returns that
composition. The Focus screen's per-project synthesis is unchanged.

### 4. Mock data re-typed onto the domain
All Phase 2.1 fixtures now import from `@/lib/domain`. Additive enrichments
(no rendered values changed):
- `Activity` gains an `integration` source (e.g. commit → `github`, deploy → `vercel`).
- `Integration` gains a `category` (`git`/`hosting`/`database`/`domains`/`ai`).
- Milestone-tagged `RoadmapItem`s gain a `milestoneId` link.
- `Signal`/`Activity`/`Expense`/`Decision` carry optional `projectId` for
  ownership (studio-wide when absent).

### 5. Repository seam extended
`src/lib/data/index.ts` adds `getMilestones`, `getMilestonesForProject`,
`getTasks`, `getTasksForMilestone`, `getDomains`. (`Activity` return type
renamed from `ActivityItem`.) The mock-backed, async signature is unchanged.

## Files

**New:** `src/lib/domain/*` (13 files), `src/lib/data/milestones.ts`,
`src/lib/data/tasks.ts`, `src/lib/data/domains.ts`.

**Edited:** `src/lib/types.ts` (→ re-export), `src/lib/data/{focus,projects,
decisions,roadmap,signals,activity,alerts,spend,profile,index}.ts`,
`src/components/focus/focus-board.tsx` (`FocusTask` → `Task` type only).

**Untouched:** all page layouts/markup, styling, routing, `recommend.ts` logic.

## Explicitly NOT done (per scope)
- ❌ No Supabase / database.
- ❌ No real integrations.
- ❌ No `user` / `team` / `account` models — single-user; `Profile` is just the
  owner's display name + badge count, not an auth/account entity.
- ❌ No generic-dashboard abstractions — the model is Product-Studio-specific
  with Project as the aggregate root.
- ❌ No UI redesign, no routing changes.

## Known denormalizations (intentional, documented in code)
`Project.nextMilestone`, `openTasks`, `blockers`, `lastActivityIso`, and
`domain` are cached snapshots whose authoritative sources are now the owned
child entities (Milestone, Task, Activity, Domain). They're kept so the current
UI renders unchanged; a later phase computes them. Likewise `Alert` (and the
`alerts` fixture) is modeled as a derived "needs attention" view rather than a
core owned entity.

## Verification
- `npm run build` — compiles, TypeScript clean, all routes `○ Static`.
- Screenshot diff (Studio, Focus, Money) — identical to Phase 2.1.
- Focus "Current Focus" is now assembled from the Milestone + Task entities and
  renders the same 83% / task list as before.
