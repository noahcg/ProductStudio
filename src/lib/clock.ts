/**
 * The studio DATA anchor — the reference "now" for the mock dataset.
 *
 * The demo data (activity, alerts, last-activity) is dated around June 2026,
 * so every relative-time label ("2d ago", "Expires in 41 days") is computed
 * against this fixed point to stay stable and correct.
 *
 * This is intentionally NOT the wall clock. The header shows the viewer's real
 * live time (see `AppHeader`); the data labels use this anchor. When the app
 * moves to live data, relative times can switch to `new Date()` and this
 * anchor goes away.
 */
export const STUDIO_NOW = new Date("2026-06-07T14:41:00");

export function now(): Date {
  return new Date(STUDIO_NOW);
}
