import type { StoredReview } from "../review/types";

/**
 * Stored Weekly Founder Review history (mock mode).
 *
 * The *current* review is generated deterministically on demand by the review
 * engine. This fixture holds previously-generated reviews so "review history" is
 * available now and the feature is future-proofed; in Supabase mode the durable
 * store is the `reviews` table (see the 2026-06-03 migration).
 *
 * Compact `StoredReview` shape (mirrors the table). The full payload would live
 * in `metadata`; here we keep the headline summary + recommendation.
 */
export const storedReviews: StoredReview[] = [
  {
    id: "review-2026-05-24-2026-05-31",
    periodStartIso: "2026-05-24T14:41:00.000Z",
    periodEndIso: "2026-05-31T14:41:00.000Z",
    generatedAtIso: "2026-05-31T14:41:00.000Z",
    summary:
      "Steady week led by Home Cooked. Family Sharing MVP advanced toward its final tasks; WardrobeHarmony kept importing while PersonalTrainer stayed in planning.",
    recommendation: "PersonalTrainer — no active milestone, planning has stalled.",
    metadata: { tasksCompleted: 6, healthChanges: 4 },
  },
];
