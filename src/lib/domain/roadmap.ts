import type { RoadmapItemId, ProjectId, MilestoneId } from "./ids";

export type RoadmapColumn = "now" | "next" | "later";

export type Effort = "S" | "M" | "L";

export type RoadmapPriority = "High" | "Medium" | "Low";

export type RoadmapStatus = "planned" | "in_progress" | "done";

/**
 * A planning item on a project's Now / Next / Later roadmap. Owned by a
 * project; may correspond to a milestone. `sortOrder` is the mutable
 * within-column ordering key (move/reorder operations change column + sortOrder).
 */
export interface RoadmapItem {
  id: RoadmapItemId;
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  title: string;
  description?: string;
  column: RoadmapColumn;
  priority: RoadmapPriority;
  status: RoadmapStatus;
  effort: Effort;
  sortOrder: number;
  targetDate?: string;
  tag?: string;
}

/** Fields accepted when creating/editing a roadmap item. */
export interface RoadmapInput {
  projectId: ProjectId;
  title: string;
  description?: string;
  column: RoadmapColumn;
  priority: RoadmapPriority;
  status: RoadmapStatus;
  effort: Effort;
  targetDate?: string;
}

/** A column/order change produced by move & reorder operations. */
export interface RoadmapPlacement {
  id: RoadmapItemId;
  column: RoadmapColumn;
  sortOrder: number;
}
