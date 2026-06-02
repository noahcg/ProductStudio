import type { DecisionId, ProjectId } from "./ids";

export type DecisionStatus = "Decided" | "Open" | "Revisit";

/**
 * A logged product decision (Product Studio's "memory"). Owned by a project
 * (or studio-level when `projectId` is absent).
 *
 * `decision` is the actual call made; `rationale` is why; `tradeoffs` is what
 * was given up; `tags` are free-form labels for filter/search.
 */
export interface Decision {
  id: DecisionId;
  projectId?: ProjectId;
  title: string;
  status: DecisionStatus;
  /** ISO timestamp the decision was made/logged (column: dated_at ≙ decided_at) */
  dateIso: string;
  decision?: string;
  rationale: string;
  tradeoffs?: string;
  tags: string[];
  /** Legacy fields retained for existing seeded decisions' display. */
  options?: string[];
  chosen?: string;
}

/** Fields accepted when creating/updating a decision. */
export interface DecisionInput {
  projectId?: ProjectId;
  title: string;
  status: DecisionStatus;
  dateIso: string;
  decision?: string;
  rationale: string;
  tradeoffs?: string;
  tags: string[];
}
