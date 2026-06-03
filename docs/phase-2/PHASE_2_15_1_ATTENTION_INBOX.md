# Phase 2.15.1 — Attention Inbox Dropdown

> Makes the header bell functional: it opens a compact **Attention Inbox** that
> summarizes the signals that may need Noah's attention right now. It is **not** a
> generic notifications system — no new route, no notifications table, no header
> redesign. In Product Studio, notifications are **attention signals**, not social
> updates: *"what should I be aware of right now?"*

## Why this is not a generic notification system

A real notifications system implies a store of per-event records, read/unread
state, delivery, dismiss/archive, and a feed. We deliberately built none of that.
The inbox is a **derived, read-only view** over systems that already exist — it
holds no state of its own and stores nothing. The bell is a lens onto the
Signals stream + the Weekly Review, not an inbox of messages.

## Data sources (existing only)

The inbox is derived entirely from the **generated Signals stream** plus
**Weekly Founder Review availability** — both already produced by the pipeline:

- the Signals Engine (project/roadmap/milestone/task/decision/money signals),
- GitHub, Domain, Vercel, and Supabase integration signals,
- the Weekly Founder Review (`getWeeklyReview`).

The generated-signals stream already unifies all of those sources (and the same
conditions power the Needs Attention panel), so the inbox reads from it rather
than re-uniting sources — which would double-count (e.g. a blocked task is one
`tasks_blocked` warning, not also a separate "needs attention" entry).

Wiring: `getAttentionInbox()` (`src/lib/data/index.ts`) runs the pipeline once,
calls the pure `buildAttentionInbox()` (`src/lib/attention/inbox.ts`), and passes
the result through the root layout to the client `AttentionInbox`
(`src/components/layout/attention-inbox.tsx`).

## Badge count rules

The badge counts **actionable items only**:

- ✅ critical signals
- ✅ warning signals (these already include failed-deployment, domain-expiration,
  Supabase capacity/unavailable, blocked-task, etc. — the warning/critical set)
- ✅ Weekly Review ready (+1, only when the review is **not** a quiet week)

Explicitly **not** counted:

- ❌ watch signals (shown in the dropdown, but not counted)
- ❌ info signals (neither counted nor shown)
- ❌ healthy statuses, regular activity, completed tasks (never enter the stream)

So `count = criticalCount + warningCount + (reviewReady ? 1 : 0)`. When the count
is 0 the badge is hidden.

## Dropdown behavior

Clicking the bell opens a panel with:

- **Header**: "Attention Inbox"
- **Subtitle**: "Signals that may need review"
- Items **grouped by severity**: Critical → Warning → Watch, each with a count.
- A footer row when a non-quiet **Weekly review** is ready (→ View Weekly Review).

Each item shows: title, short description, owning project, source (Signals /
GitHub / Domains / Vercel / Supabase), and a relative timestamp when available.

### Item actions

- Project-scoped signal → **View Focus** (`/focus?project=…`)
- Studio-level signal → **View Signals** (`/signals`)
- Weekly review row → **View Weekly Review** (`/review`)

Dismiss/archive is intentionally **not** implemented (no per-item state store yet).

## Empty state

When there are no actionable items the panel shows:

> **All calm.**
> No critical or warning signals right now.

## Accessibility

- The bell is a real `<button>` (keyboard focusable/activatable) with an
  `aria-label` that includes the count, `aria-haspopup="menu"`, and
  `aria-expanded` reflecting open state.
- The panel has `role="menu"` and an `aria-label`.
- **Escape** closes the panel; **clicking outside** closes it (mirrors the
  existing `SettingsMenu` pattern).

## Visual treatment

Dark translucent panel (`bg-bg/80` + `backdrop-blur-xl`), subtle `border-line`,
no heavy shadow, compact spacing, severity dots reused from the Signals screen.
Sits in the existing header cluster next to Theme and Settings — the layout is
otherwise unchanged.

## Validation — all 10 points PASS

Verified via `npm run build` (clean, route list unchanged), a Chrome DevTools
Protocol interaction test, and a unit check of the builder.

1. **Bell opens a dropdown** — CDP: click → `role="menu"` appears, `aria-expanded="true"`. ✅
2. **Badge matches actionable items** — 15 warning/critical + 1 review = 16; watch/info excluded (builder test). ✅
3. **Critical/Warning/Watch groups** — CDP found all three group headers, 21 items. ✅
4. **Empty state** — builder with no signals → `count 0, items []` → "All calm." path. ✅
5. **Outside click closes** — CDP: mousedown outside → menu removed, `aria-expanded="false"`. ✅
6. **Escape closes** — CDP: Escape key → menu removed. ✅
7. **Header layout preserved** — bell replaced in place; Theme/Settings untouched. ✅
8. **No new route** — route list unchanged (`/`, `/focus`, `/roadmaps`, `/decisions`, `/signals`, `/review`, `/money`). ✅
9. **No notifications table** — no migration; derived from existing systems. ✅
10. **Signals screen still works** — `/signals` renders all signal groups (200). ✅

## Future enhancements

- **Read / dismiss state** — would require a small per-user store (the first time
  a notifications table is justified); could mute or snooze individual items.
- **"New since last visit"** — diff the signal set against a last-seen marker.
- **Deep-linking to the exact signal** — anchor into the Signals screen.
- **Grouping by project** as an alternative to severity.
- **Live updates** — currently computed per request; a future push channel could
  update the badge without a reload.
