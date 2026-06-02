import type { RoadmapItem } from "../types";

export const roadmap: RoadmapItem[] = [
  // NOW
  { id: "r1", title: "Family Sharing MVP", projectId: "home-cooked", column: "now", effort: "M", tag: "milestone" },
  { id: "r2", title: "Settings UI refresh", projectId: "home-cooked", column: "now", effort: "S" },
  { id: "r3", title: "Closet Import", projectId: "wardrobe-harmony", column: "now", effort: "L", tag: "milestone" },
  // NEXT
  { id: "r4", title: "Recipe import from URL", projectId: "home-cooked", column: "next", effort: "M" },
  { id: "r5", title: "Color-match recommendations", projectId: "wardrobe-harmony", column: "next", effort: "L" },
  { id: "r6", title: "Client scheduling", projectId: "personal-trainer", column: "next", effort: "M", tag: "milestone" },
  { id: "r7", title: "Spring content drop", projectId: "cascade-lounge", column: "next", effort: "S" },
  // LATER
  { id: "r8", title: "Mobile app shell", projectId: "home-cooked", column: "later", effort: "L" },
  { id: "r9", title: "Stripe billing", projectId: "personal-trainer", column: "later", effort: "M" },
  { id: "r10", title: "Newsletter automation", projectId: "cascade-lounge", column: "later", effort: "S" },
];
