# Phase 2.12 — Domain Monitoring

> Adds **Domain Monitoring** as a first-class capability: Product Studio now
> understands which domains exist, which project owns them, when they expire,
> their SSL health, and their auto-renew status — and whether any of that needs
> attention. **Goal: awareness, not control.** No registrar/DNS APIs, no domain
> management, no application redesign.

See [`docs/domain-monitoring/DOMAIN_MONITORING.md`](../domain-monitoring/DOMAIN_MONITORING.md)
for the full model, signal rules, and integration design.

## What shipped

**Data model** — `src/lib/domain/domain.ts`
- `Domain` now carries monitoring fields: `registrar?`, `expiresAt?`,
  `autoRenew?`, `sslStatus`, `notes?`, `lastCheckedAt?`. Removed the old
  `expiresInDays`/`status` (a stored countdown is forbidden — it goes stale).
- `SslStatus = healthy | expiring | invalid | missing | unknown`.
- Migration `supabase/migrations/20260602180000_domain_monitoring.sql` adds
  `auto_renew`, `ssl_status`, `notes`, `last_checked_at`; keeps `expires_at` as
  the stored fact. Supabase mapper + seed updated for all four projects.

**DomainMonitoringService** — `src/lib/domains/monitor.ts` (pure, deterministic, no I/O)
- `daysRemaining()` computes the countdown from `expiresAt` — never stored.
- `computeDomainSignals()` emits expiry / auto-renew / SSL signals
  (`source: "domain_monitor"`).
- `domainHealth()` / `domainHealthByProject()` reduce signals to a
  Healthy/Watch/Warning/Critical label.

**Pipeline** — `src/lib/data/index.ts`
- Domain signals were moved **out** of the core Signals Engine and merged into
  the pipeline's `generatedSignals`, so Health and Focus consume them through the
  existing "Signals" health category (weight 0.10) — no new coupling.
- New accessors: `getDomainsForProject`, `getDomainHealthByProject`.

**UI**
- Studio cards: lightweight `🌐 Domain <health>` line (`project-card.tsx`).
- Signals screen: dedicated **Domain signals** group (`signals/page.tsx`).
- Focus screen: **Domains** panel with full detail (`focus/domain-panel.tsx`).

## Seed domains (relative to studio clock 2026-06-07)

| Project          | Domain                 | Expiry  | Auto-renew | SSL     | Result                         |
| ---------------- | ---------------------- | ------- | ---------- | ------- | ------------------------------ |
| Home Cooked      | tryhomecooked.com      | ~18d    | on         | healthy | expiration **WARNING**         |
| WardrobeHarmony  | wardrobeharmony.app    | ~120d   | on         | invalid | SSL **CRITICAL**               |
| PersonalTrainer  | personaltrainer.app    | ~45d    | **off**    | healthy | expiry **WATCH** + auto **WARNING** |
| Cascade Lounge   | thecascadelounge.com   | ~200d   | on         | healthy | **Healthy** (no signal)        |

## Validation — all 12 points PASS

Verified via `npm run build` (clean), a standalone engine test
(`tsx`), and live HTTP checks against `npm run start`.

1. **Domain signals generated** — 4 signals on the seed. ✅
2. **Expiration severities** — 18d→warning, 45d→watch, (0–7→critical, expired→
   critical by rule). ✅
3. **Auto-renew disabled → warning** — PersonalTrainer fires
   `domain_autorenew_disabled` (warning). ✅
4. **SSL severities** — WardrobeHarmony `invalid`→critical (missing→critical,
   expiring→watch, healthy→none by rule). ✅
5. **Health consumes domain signals** — scores drop 91→89, 79→76, 63→61 for the
   three projects with signals; Cascade Lounge (no signal) unchanged at 73. ✅
6. **Focus consumes domain signals** — via Health/Signals category; Current Focus
   stays Home Cooked (active milestone not overridden). ✅
7. **Studio visually unchanged** — cards gain only a one-line domain-health
   indicator; layout intact (HTTP 200). ✅
8. **Signals screen displays domain issues** — dedicated "Domain signals" group
   shows the expiry/SSL/auto-renew items. ✅
9. **Decisions still work** — `/decisions` renders "row-level security" (200). ✅
10. **Roadmaps still work** — `/roadmaps` renders "Family Sharing MVP" (200). ✅
11. **Tasks still work** — `/focus` renders Tasks + Add task (200). ✅
12. **GitHub still works** — GitHub signals (no-activity, stale PR) still present
    on the Signals screen, separate from domain signals. ✅

## Constraints honored

No external registrar APIs · No Vercel integration · No Supabase usage
monitoring · No AI spend tracking · No application redesign · No domain
management product. Awareness, not control.

## Next

Phase 2.13 — Vercel Integration.
