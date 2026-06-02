# Phase 2.8 — Task System (Execution Layer)

> **Status:** Complete. Product Studio gained lightweight **execution tracking**
> — tasks that show how much of a milestone is done and feed the Focus Engine.
> It is intentionally *not* a project manager: no subtasks, comments,
> attachments, assignees, or bulk ops. No external integrations, no redesign;
> every existing screen still works.

## Principle

`Project → Milestone → Task`. Tasks never exist without a project and usually
belong to a milestone. Roadmaps answer "what should we build?"; tasks answer
"what work remains to finish it?"

## Schema changes

Tasks already existed (Phase 2.2). Migration
[`20260602170000_task_system.sql`](../../supabase/migrations/20260602170000_task_system.sql)
extends them (additive + safe rename/migrate, existing rows preserved):

| Field | Change |
|---|---|
| `label` → `title` | rename |
| `state` → `status` | migrate values: done→`completed`, active→`in_progress`; new set `todo \| in_progress \| blocked \| completed` |
| `description` | added (text) |
| `priority` | added — `low \| medium \| high \| critical` |
| `target_date` | added (date) |
| `completed_at` | added (set when completed) |
| `estimate` | dropped (superseded) |

Domain `Task` + `TaskInput` updated to match. Schema reference updated.

## Task workflow

- The repository seam gained `createTask`, `updateTask`, `deleteTask`, and
  `setTaskStatus` (quick complete / reopen / block; manages `completed_at`) on
  the `DataSource`, implemented for both **Supabase** and the **in-memory mock**
  store (so it works end-to-end without a database — what runs here).
- Server actions in `src/app/focus/actions.ts` validate, write, and
  `revalidatePath("/focus")` + `"/"`.
- **UI:** the Focus screen — the existing milestone/project detail surface
  (reached from a project card → `/focus?project=…`) — gained a **Tasks
  section**: a live counts header, a compact status checklist, and inline
  create / edit / delete / complete / reopen / block, with optimistic updates.
  No tables; cards, grouped lists, a progress ring, and a compact checklist
  (✓ completed · ◐ in progress · ⚠ blocked · ○ todo), matching the existing
  aesthetic. A task form modal is built from the shared design system.

### Milestone integration
The milestone header shows live rollups from `taskStats()`:
`"{completed} / {total} tasks complete · {blocked} blocked · {remaining} remaining"`
— e.g. **10 / 12 tasks complete · 1 blocked · 2 remaining** for Family Sharing
MVP. These update immediately when tasks change.

### Empty states
- **No tasks for project / milestone** — empty card + "Add task".
- **No completed tasks / No blocked tasks** — surfaced inline in the counts row
  (`"No blocked tasks"` when zero, and `0 / N complete`).

## Focus Engine updates

`src/lib/focus/engine.ts` now scores on **task execution** via the shared
`taskStats()` (the single source of truth for milestone completion):

- **Positive:** milestone nearing completion (task-derived progress ×0.4),
  completed tasks (+1.5 each, cap 18), active milestone, Now items, recent
  activity, project status.
- **Negative:** blocked tasks (−12 each), overdue tasks (−10 each), remaining
  tasks (−1.5 each, cap −15), staleness, warning/critical signals.

The engine still produces exactly **one Current Focus project**. Deterministic.
Task completion measurably changes the score (verified: completing Home Cooked's
blocked task raised it 75 → 94).

## Seed data

Realistic, milestone-related tasks (no placeholders) for all four projects:
Home Cooked / Family Sharing MVP (12: 10 done, 1 blocked, 1 in progress ≈ 83%),
WardrobeHarmony / Closet Import (10, ≈50%, 1 blocked), PersonalTrainer / Client
Scheduling (8, ≈25%), Cascade Lounge / Spring Content Drop (8, ≈37%).

## Files
**New:** `src/lib/tasks/stats.ts`, `src/app/focus/actions.ts`,
`src/components/focus/task-form.tsx`, this summary.
**Changed:** `src/lib/domain/task.ts`, `src/lib/focus/engine.ts`,
`src/lib/data/{tasks,mock-source,supabase-source,source,index}.ts`,
`src/components/focus/focus-board.tsx`, `src/components/studio/current-focus.tsx`,
`src/app/focus/page.tsx`, `supabase/{migrations,seed}`, schema reference.
**Removed:** `src/lib/data/focus.ts` (old `focusForProject` synthesis, superseded).

## Validation

| # | Check | Result |
|---|---|---|
| 1 | Tasks belong to projects | ✅ created with `project_id` |
| 2 | Tasks can belong to milestones | ✅ created with `milestone_id`; appear in milestone rollup |
| 3 | Milestone progress updates when tasks change | ✅ counts 10/12 → 10/13 (create) → 11/13 (complete) → 10/13 (reopen) |
| 4 | Focus Engine incorporates task data | ✅ completing the blocked task: score 75 → 94; single current focus; deterministic |
| 5–10 | Studio / Focus / Decisions / Roadmaps / Signals / Money still work | ✅ all 200; Studio & rings unchanged |

(Verified live via the DevTools Protocol against the running app, mock-mode
writes — ephemeral in-memory store, mirrored by the Supabase write path.)

## Known limitations
- **Tasks UI lives on the Focus screen** (the existing milestone/project detail
  surface). No new routes/nav were added, per "do not redesign / change
  navigation" — there are no standalone project/milestone detail pages.
- **Decorative progress rings** (Studio cards, Focus ring) read the stored
  `milestone.progress` / `project.progress`; the **live task counts** are the
  source of truth that updates on every change. Seed values align them initially
  (Home Cooked 83% = 10/12). The Focus Engine uses the **task-derived** progress
  for scoring. A later phase could fully derive the rings from tasks.
- Mock writes are **ephemeral** (reset on server restart); Supabase is durable
  once configured. Tasks do not yet reference roadmap items (out of scope).

## Explicitly NOT done (per scope)
- ❌ No Jira/Trello/Linear scope — no subtasks, comments, attachments, assignees, bulk ops.
- ❌ No external integrations (GitHub/Vercel/etc.); no unrelated Supabase changes.
- ❌ No redesign of existing screens; single-user throughout.
