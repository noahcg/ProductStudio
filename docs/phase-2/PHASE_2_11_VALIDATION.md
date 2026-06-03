# Phase 2.11.1 — GitHub Integration Validation

> **Scope:** Review-only validation of the Phase 2.11 GitHub integration. No new
> features, no UI redesign, no other integrations. One **small safe fix** was
> applied (Finding F1).
>
> **Reviewed:** `src/lib/integrations/github/{config,types,client,mock,provider}.ts`,
> the repo pipeline in `src/lib/data/index.ts`, the Health/Focus engine inputs,
> the Studio card + Signals surfacing, and `docs/integrations/GITHUB.md`.

## Verdict

**PASS.** GitHub is a well-contained integration source: it augments the
activity feed, signals, and the momentum/execution inputs to Health, and is
never the source of truth. Errors and the missing-token state degrade
gracefully. One minor robustness gap (an unused failure signal + no top-level
guard) was found and fixed.

---

## Checklist

### 1. GitHub is treated only as an integration — ✅ PASS
The GitHub layer produces **only** `events: Activity[]`, `signals:
GeneratedSignal[]`, and per-project `statuses`. It never creates or mutates
projects, milestones, roadmap items, tasks, decisions, or focus. In the pipeline
those entities come from the data source (`s.projects()`, `s.milestones()`, …);
GitHub output is merged in alongside, not into, them.

### 2. Product Studio remains source of truth — ✅ PASS
`getProjects/getMilestones/getRoadmap/getTasks/getDecisions/getFocus` all read
from the active source (mock/Supabase). GitHub does not feed them. Verified live:
with GitHub active, roadmaps still render "Family Sharing MVP" and decisions
still render "Supabase row-level security" from the studio store.

### 3. GitHub metadata is not overwriting Product Studio data — ✅ PASS
- Activity: `mergeActivity()` **adds** GitHub events (dedup by `id`); it never
  replaces base activity.
- Project fields (`lastActivityIso`, `progress`, etc.) are **read-only inputs**
  to Health (`last = latestIso([...feed, project.lastActivityIso, gh?.lastActivityIso])`)
  — GitHub is one candidate for "most recent", never written back.
- Nothing is persisted; GitHub data is recomputed per request.

### 4. Repo→project mapping supports multiple repositories — ✅ PASS
`REPO_MAP` values are `string[]`; `reposForProject()` returns the list; the
provider runs `Promise.all(repos.map(...))` and **aggregates** across repos
(commits summed, open PRs flattened, last activity = latest, errors collected).
A project with no mapping shows "Not connected" and contributes nothing.

### 5. GitHub API errors fail gracefully — ✅ PASS (hardened, see F1)
- Per-repo: `liveRepoSnapshot` wraps the fetch in try/catch and returns a
  snapshot with `error` set; the provider emits a `github_repo_disconnected`
  warning and continues with the other repos.
- Catastrophic: the provider body is now wrapped in try/catch, returning no
  GitHub data plus a single `github_api_failure` signal — so `getGitHub` never
  throws to `getActivity`/the pipeline (which would otherwise hit the error
  boundary). *(Fix F1.)*

### 6. Missing token state is handled cleanly — ✅ PASS
`githubMode()` returns **`mock`** (not `live`) when `GITHUB_TOKEN` is absent, so
the integration runs on deterministic demo data with no errors. `GITHUB_MODE=off`
returns empty cleanly. The live client also guards `if (!token)` and returns a
disconnected snapshot. Verified: the app runs token-less here with full GitHub
behavior and no failure signals.

### 7. Rate-limit behavior is documented — ✅ PASS
`docs/integrations/GITHUB.md` → *Rate limits*: 5,000/hr authenticated; client
`fetch` cached `revalidate: 300` (5 min); provider `React.cache`d per request
(one fetch shared by feed/signals/health/cards); non-200 → graceful degrade.

### 8. Activity feed does not become GitHub-dominated — ✅ PASS
- The mock emits **PR events only** (commit pushes stay in the base feed); ~3
  GitHub events on the seed vs. 5 base events.
- The Studio Recent Activity panel is sliced to **6** items; GitHub is ~2 of the
  visible 6 (~33%), interleaved chronologically — present, not dominant.
- Bounded by the PR-only emission + the mapping/mock; configurable.

### 9. GitHub signals are sparse and actionable — ✅ PASS
Threshold-gated: `github_no_activity` (≥14 days), `github_stale_pr` (>7 days),
`github_repo_disconnected`, `github_api_failure`. On the seed exactly **two**
fire (PT no-activity warning, WardrobeHarmony stale-PR watch). Each carries a
concrete `recommendation`. No per-commit/per-PR spam.

### 10. Health & Focus use GitHub as one input, not the decider — ✅ PASS
- **Health/Momentum:** GitHub's last activity folds into the idle calc; commits
  surface as a reason. Momentum is 1 of 6 categories (weight 0.20).
- **Health/Execution:** a **capped** `+min(commitsThisWeek, 6)` bonus on a
  0–100 task-derived score; never overrides tasks. Never touches Planning,
  Decisions, or Roadmap categories.
- **Focus:** consumes GitHub only via Health and the GitHub signals (Signals
  category, weight 0.10). Milestone progress (task-based) still dominates — the
  Current Focus remains Home Cooked. GitHub never overrides critical signals,
  active milestones, or manual priorities.

---

## Findings

### F1 — `github_api_failure` unused + no top-level guard — ✅ FIXED (small, safe)
The `github_api_failure` signal type was declared but never emitted, and the
provider had no catch around its main loop (only per-repo errors were handled).
A catastrophic throw would have propagated to `getActivity()`/the pipeline.
**Fix:** wrapped the provider computation in try/catch that returns empty GitHub
data + a single `github_api_failure` warning. `getGitHub` now never throws.
Verified: build clean; the normal path is unchanged (no failure signal appears
when healthy).

### F2 — Feed share is moderate (~⅓) — observation, no action
GitHub is a visible but minority share of the feed (sliced to 6). Within the
"not dominated" bar. If more repos/PRs are mapped, the PR-only emission + slice
keep it bounded; revisit only if it grows.

### F3 — GitHub data is not persisted — by design, documented
Recomputed per request (and `fetch`-cached 5 min in live mode). Documented in
`GITHUB.md`; a future phase could sync into `activity_items` + webhooks.

---

## Known manual validation (live mode)
Mock mode is fully validated here. The **live** path — real REST responses,
rate-limit headers, 403/secondary-limit handling, and `github_repo_disconnected`
on a real 404 — can only be confirmed with a real `GITHUB_TOKEN` against real
repositories. The code paths exist and degrade gracefully by construction.

## Conclusion
The GitHub integration is faithful to "integration, not source of truth," with
graceful failure and clean token-less behavior. The single robustness gap is
fixed. Ready to proceed; no further changes required for 2.11.
