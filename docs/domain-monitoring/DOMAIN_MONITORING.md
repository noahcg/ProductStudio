# Domain Monitoring

> **Goal: awareness, not control.** Product Studio observes the domains behind
> its projects — expiry, auto-renew, SSL — and surfaces what needs attention. It
> does **not** register, renew, configure, or manage domains, and it talks to
> **no** external registrar or DNS APIs. Every evaluation runs on stored data.

## Scope

In scope:
- A `Domain` entity owned by a project.
- A deterministic `DomainMonitoringService` that derives **days remaining** from
  `expiresAt` and emits domain signals for expiry, auto-renew, and SSL state.
- Domain health surfaced lightly on Studio cards, grouped on the Signals screen,
  and detailed on the Focus screen.

Explicitly **out** of scope (by design):
- External registrar APIs, WHOIS, or live DNS lookups.
- Vercel integration, Supabase usage monitoring, AI spend tracking.
- Any domain *management* (purchase, transfer, renew, DNS edits).

---

## Domain model

`src/lib/domain/domain.ts`

| Field           | Type                                                  | Notes                                              |
| --------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `id`            | `DomainId`                                            | Stable id.                                         |
| `projectId`     | `ProjectId`                                           | Owning project.                                    |
| `name`          | `string`                                              | The domain (e.g. `tryhomecooked.com`).             |
| `registrar`     | `string?`                                             | Optional; "Unknown registrar" when absent.         |
| `integration`   | `IntegrationKey?`                                     | Optional link to an integration row.               |
| `expiresAt`     | `string?` (ISO date)                                  | **Stored fact.** The renewal/expiry date.          |
| `autoRenew`     | `boolean?`                                            | Whether auto-renew is on.                          |
| `sslStatus`     | `"healthy" \| "expiring" \| "invalid" \| "missing" \| "unknown"` | Certificate state.                      |
| `notes`         | `string?`                                             | Freeform context (e.g. why SSL failed).            |
| `lastCheckedAt` | `string?` (ISO)                                        | When the data was last refreshed.                  |

**Days remaining is never stored.** It is computed from `expiresAt` by
`daysRemaining()` against the studio clock (`src/lib/clock.ts`). Storing a
derived countdown would go stale immediately; the date is the durable fact.

The Supabase schema mirrors this in
`supabase/migrations/20260602180000_domain_monitoring.sql` (adds `auto_renew`,
`ssl_status`, `notes`, `last_checked_at`; keeps the pre-existing `expires_at`).
The legacy `status` column is retained but unused — domain health is always
derived, never read from a stored label.

---

## The DomainMonitoringService

`src/lib/domains/monitor.ts` — pure functions, no I/O, deterministic against an
injectable `now` (defaults to the studio clock).

- `daysRemaining(domain, now?) → number | undefined`
  `ceil((expiresAt − now) / 1 day)`. Negative = expired. `undefined` if no date.
- `computeDomainSignals(domains, now?) → GeneratedSignal[]`
  All domain signals across the portfolio, in deterministic order.
- `domainHealth(domains, now?) → "Healthy" | "Watch" | "Warning" | "Critical"`
  Worst signal severity mapped to a label (`Healthy` if no signals).
- `domainHealthByProject(domains, now?) → Record<projectId, DomainHealth>`
  Per-project worst health, for the Studio cards.

Domain signals are emitted with `source: "domain_monitor"` and a stable id
`"${type}:${name}"`, so the Signals screen can group them and they never
collide with Signals-Engine or GitHub signals.

### Signal rules

**Expiration** (from computed days remaining):

| Days remaining | Severity   | Signal type          |
| -------------- | ---------- | -------------------- |
| 60+            | *(none)*   | —                    |
| 31–60          | `watch`    | `domain_expiration`  |
| 8–30           | `warning`  | `domain_expiration`  |
| 0–7            | `critical` | `domain_expiration`  |
| Expired (<0)   | `critical` | `domain_expired`     |

**Auto-renew:** `autoRenew === false` → `warning` (`domain_autorenew_disabled`).
(Unknown/true → no signal.)

**SSL** (`domain_ssl`):

| `sslStatus`         | Severity   |
| ------------------- | ---------- |
| `healthy`           | *(none)*   |
| `expiring`          | `watch`    |
| `invalid`           | `critical` |
| `missing`           | `critical` |
| `unknown`/undefined | *(none)*   |

A single domain can emit multiple signals (e.g. expiring soon **and** auto-renew
off). Health uses the worst.

---

## Health integration

Domain signals flow into Project Health through the **existing "Signals" health
category** — no new category, no coupling. In the pipeline
(`src/lib/data/index.ts`), `computeDomainSignals(domains)` is concatenated into
`generatedSignals` alongside the Signals-Engine and GitHub signals. The Health
Engine (`src/lib/health/engine.ts`) summarizes a project's signals:

```
signalsScore = 100 − watch×5 − warning×15 − critical×30   (clamped 0–100)
```

The Signals category carries weight **0.10** of the overall score. So a critical
domain signal reduces health, and multiple signals reduce it further — but it
can never single-handedly dominate the other five categories (momentum,
execution, planning, focus, risk).

Verified on the seed (without → with domain signals):

| Project          | Score   | Status                      | Domain signal            |
| ---------------- | ------- | --------------------------- | ------------------------ |
| Home Cooked      | 91 → 89 | Healthy → Stable            | expires in 18d (warning) |
| WardrobeHarmony  | 79 → 76 | Stable → Stable             | SSL invalid (critical)   |
| PersonalTrainer  | 63 → 61 | Attention Needed (same)     | 45d watch + auto-renew   |
| Cascade Lounge   | 73 → 73 | Stable → Stable             | none (control — no drop) |

Cascade Lounge, the only project with no domain signal, is unchanged — proving
the deltas come from domain monitoring and nothing else.

---

## Focus integration

The Focus Engine consumes domain signals **only via Health and the Signals
category** (weight 0.10) — the same balanced path as GitHub. Milestone progress
(task-based execution) still dominates ranking, so domain issues nudge ordering
without overriding an active milestone. On the seed the Current Focus stays
**Home Cooked** even though it has an expiring domain, because its active
milestone progress outweighs the signal. Awareness, not hijacking.

---

## UI surfaces

- **Studio cards** (`src/components/studio/project-card.tsx`): a lightweight
  `🌐 Domain <Healthy|Watch|Warning|Critical>` line, tinted by severity, shown
  next to the GitHub line. No countdowns or clutter — just the health label, and
  only when the project owns a domain.
- **Signals screen** (`src/app/signals/page.tsx`): a dedicated **Domain signals**
  card (split by `source === "domain_monitor"`), separate from "Generated
  signals" and "Service health".
- **Focus screen** (`src/components/focus/domain-panel.tsx`): a **Domains** panel
  for the selected project showing domain, registrar, expiration (computed days
  remaining), SSL state, auto-renew, renewal date, and notes.

---

## Empty states & fallbacks

| Situation                 | Behavior                                                        |
| ------------------------- | -------------------------------------------------------------- |
| Project has no domain     | No domain line on the card; Focus panel says "No domain on file". |
| No `expiresAt`            | `daysRemaining` → `undefined`; no expiry signal; panel shows "Expiration unknown". |
| No `sslStatus` / `unknown`| No SSL signal; panel shows "Unknown" (neutral).                |
| No `registrar`            | Panel shows "Unknown registrar".                               |
| `autoRenew` undefined     | Treated as not-disabled; no auto-renew warning.                |
| No domains at all         | `domainHealthByProject` is `{}`; Studio cards omit the line.   |

Health stays Healthy when there is simply nothing to report — absence of data is
never treated as a problem.

---

## Future enhancements

- **Phase 2.13 — Vercel integration**: associate deployments/domains from Vercel.
- Live SSL/WHOIS refresh to populate `lastCheckedAt` and `sslStatus` from real
  checks (still read-only; awareness, not control).
- A registrar `integration` link to deep-link to the registrar dashboard.
- Configurable expiry thresholds per project.
