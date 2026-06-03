import type { Domain } from "../domain";

/**
 * Domains owned by projects (one per project). Realistic, varied monitoring
 * states relative to the studio clock (2026-06-07):
 *  - Home Cooked     : expires in ~18 days → expiration WARNING
 *  - WardrobeHarmony : SSL invalid → CRITICAL
 *  - PersonalTrainer : expires in ~45 days (WATCH) + auto-renew off (WARNING)
 *  - Cascade Lounge  : healthy
 *
 * `expiresAt` is the stored fact; days remaining is computed by the monitoring
 * service, never stored.
 */
export const domains: Domain[] = [
  {
    id: "dom-home-cooked",
    projectId: "home-cooked",
    name: "tryhomecooked.com",
    registrar: "Cloudflare",
    integration: "cloudflare",
    expiresAt: "2026-06-25",
    autoRenew: true,
    sslStatus: "healthy",
    lastCheckedAt: "2026-06-07T06:00:00",
  },
  {
    id: "dom-wardrobe-harmony",
    projectId: "wardrobe-harmony",
    name: "wardrobeharmony.app",
    registrar: "Namecheap",
    integration: "cloudflare",
    expiresAt: "2026-10-05",
    autoRenew: true,
    sslStatus: "invalid",
    notes: "Certificate failed to renew after DNS change.",
    lastCheckedAt: "2026-06-07T06:00:00",
  },
  {
    id: "dom-personal-trainer",
    projectId: "personal-trainer",
    name: "personaltrainer.app",
    registrar: "Cloudflare",
    integration: "cloudflare",
    expiresAt: "2026-07-22",
    autoRenew: false,
    sslStatus: "healthy",
    lastCheckedAt: "2026-06-07T06:00:00",
  },
  {
    id: "dom-cascade-lounge",
    projectId: "cascade-lounge",
    name: "thecascadelounge.com",
    registrar: "Cloudflare",
    integration: "cloudflare",
    expiresAt: "2026-12-24",
    autoRenew: true,
    sslStatus: "healthy",
    lastCheckedAt: "2026-06-07T06:00:00",
  },
];
