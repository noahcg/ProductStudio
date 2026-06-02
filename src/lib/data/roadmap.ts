import type { RoadmapItem } from "../domain";

/**
 * Mutable in-memory roadmap store (mock mode). The write functions in
 * `mock-source.ts` mutate this array so create/edit/delete/move/reorder work
 * without a database. Ephemeral; Supabase is the durable store when configured.
 */
export const roadmap: RoadmapItem[] = [
  // NOW
  { id: "r1", title: "Family Sharing MVP", projectId: "home-cooked", milestoneId: "m-home-cooked", column: "now", effort: "M", priority: "High", status: "in_progress", sortOrder: 1, tag: "milestone" },
  { id: "r2", title: "Settings UI refresh", projectId: "home-cooked", column: "now", effort: "S", priority: "Medium", status: "in_progress", sortOrder: 2 },
  { id: "r3", title: "Closet Import", projectId: "wardrobe-harmony", milestoneId: "m-wardrobe-harmony", column: "now", effort: "L", priority: "High", status: "in_progress", sortOrder: 3, tag: "milestone" },
  // NEXT
  { id: "r4", title: "Recipe import from URL", projectId: "home-cooked", column: "next", effort: "M", priority: "Medium", status: "planned", sortOrder: 4 },
  { id: "r5", title: "Color-match recommendations", projectId: "wardrobe-harmony", column: "next", effort: "L", priority: "Medium", status: "planned", sortOrder: 5 },
  { id: "r6", title: "Client scheduling", projectId: "personal-trainer", milestoneId: "m-personal-trainer", column: "next", effort: "M", priority: "High", status: "planned", sortOrder: 6, tag: "milestone" },
  { id: "r7", title: "Spring content drop", projectId: "cascade-lounge", column: "next", effort: "S", priority: "Medium", status: "planned", sortOrder: 7 },
  // LATER
  { id: "r8", title: "Mobile app shell", projectId: "home-cooked", column: "later", effort: "L", priority: "Medium", status: "planned", sortOrder: 8 },
  { id: "r9", title: "Stripe billing", projectId: "personal-trainer", column: "later", effort: "M", priority: "Medium", status: "planned", sortOrder: 9 },
  { id: "r10", title: "Newsletter automation", projectId: "cascade-lounge", column: "later", effort: "S", priority: "Medium", status: "planned", sortOrder: 10 },
];
