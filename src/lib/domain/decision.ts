import type { DecisionId, ProjectId } from "./ids";

export type DecisionStatus = "Decided" | "Open" | "Revisit";

/**
 * A logged product decision (Product Studio's "memory"). Owned by a project
 * (or studio-level when `projectId` is absent).
 */
export interface Decision {
  id: DecisionId;
  projectId?: ProjectId;
  title: string;
  status: DecisionStatus;
  dateIso: string;
  rationale: string;
  options?: string[];
  chosen?: string;
}
