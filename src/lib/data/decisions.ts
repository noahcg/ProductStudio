import type { Decision } from "../domain";

/**
 * Mutable in-memory decisions store.
 *
 * In mock mode this array IS the data source for the Decisions feature — the
 * write functions in `mock-source.ts` mutate it, so create/edit/delete work
 * end-to-end without a database. It is ephemeral (resets when the server
 * restarts); Supabase is the durable store when configured.
 */
export const decisions: Decision[] = [
  {
    id: "d1",
    title: "Use Supabase row-level security for sharing",
    projectId: "home-cooked",
    status: "Decided",
    dateIso: "2026-06-02T00:00:00",
    decision: "Adopt Supabase row-level security for all sharing permissions.",
    rationale:
      "RLS keeps permission logic in one place and avoids leaking other families' data through the API layer.",
    tradeoffs: "Slightly harder local testing and policy debugging vs. app-layer checks.",
    tags: ["security", "architecture", "sharing"],
    options: ["App-layer checks", "Supabase RLS", "Separate share service"],
    chosen: "Supabase RLS",
  },
  {
    id: "d2",
    title: "Defer native mobile until web retention proves out",
    projectId: "home-cooked",
    status: "Decided",
    dateIso: "2026-05-20T00:00:00",
    decision: "Ship a PWA first; revisit native apps after web retention proves out.",
    rationale: "PWA covers 80% of mobile needs at ~10% of the cost while the core loop is still changing.",
    tradeoffs: "No push notifications or app-store presence in the near term.",
    tags: ["mobile", "strategy"],
    options: ["React Native now", "PWA first"],
    chosen: "PWA first",
  },
  {
    id: "d3",
    title: "Pricing model for PersonalTrainer",
    projectId: "personal-trainer",
    status: "Open",
    dateIso: "2026-06-01T00:00:00",
    rationale: "Per-seat vs per-client pricing — need to interview 5 trainers before committing.",
    tradeoffs:
      "Per-seat is simpler to bill; per-active-client aligns price with value but is harder to forecast.",
    tags: ["pricing", "gtm"],
    options: ["Per-seat", "Per-active-client", "Flat tier"],
  },
  {
    id: "d4",
    title: "Whether to keep Cascade Lounge in the portfolio",
    projectId: "cascade-lounge",
    status: "Revisit",
    dateIso: "2026-05-15T00:00:00",
    rationale: "Content engagement is flat. Revisit at end of Q2 with traffic data.",
    tradeoffs: "Keeping it spreads focus; cutting it frees time for revenue products.",
    tags: ["portfolio"],
  },
];
