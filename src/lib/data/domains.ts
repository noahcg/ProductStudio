import type { Domain } from "../domain";

/**
 * Domains owned by projects. First-class entity (previously a string on
 * Project). Registered/monitored via the Cloudflare integration. The
 * WardrobeHarmony domain is the one nearing renewal that drives the
 * Needs Attention alert.
 */
export const domains: Domain[] = [
  {
    id: "dom-home-cooked",
    projectId: "home-cooked",
    name: "tryhomecooked.com",
    registrar: "Cloudflare",
    integration: "cloudflare",
    expiresInDays: 327,
    status: "healthy",
  },
  {
    id: "dom-wardrobe-harmony",
    projectId: "wardrobe-harmony",
    name: "wardrobeharmony.com",
    registrar: "Cloudflare",
    integration: "cloudflare",
    expiresInDays: 41,
    status: "expiring",
  },
  {
    id: "dom-cascade-lounge",
    projectId: "cascade-lounge",
    name: "cascadelounge.co",
    registrar: "Cloudflare",
    integration: "cloudflare",
    expiresInDays: 198,
    status: "healthy",
  },
];
