import type { Decision } from "../types";

export const decisions: Decision[] = [
  {
    id: "d1",
    title: "Use Supabase row-level security for sharing",
    projectId: "home-cooked",
    status: "Decided",
    dateIso: "2026-06-02T00:00:00",
    rationale:
      "RLS keeps permission logic in one place and avoids leaking other families' data through the API layer.",
    options: ["App-layer checks", "Supabase RLS", "Separate share service"],
    chosen: "Supabase RLS",
  },
  {
    id: "d2",
    title: "Defer native mobile until web retention proves out",
    projectId: "home-cooked",
    status: "Decided",
    dateIso: "2026-05-20T00:00:00",
    rationale: "PWA covers 80% of mobile needs at ~10% of the cost while the core loop is still changing.",
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
    options: ["Per-seat", "Per-active-client", "Flat tier"],
  },
  {
    id: "d4",
    title: "Whether to keep Cascade Lounge in the portfolio",
    projectId: "cascade-lounge",
    status: "Revisit",
    dateIso: "2026-05-15T00:00:00",
    rationale: "Content engagement is flat. Revisit at end of Q2 with traffic data.",
  },
];
