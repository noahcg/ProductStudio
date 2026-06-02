import type { RoadmapItemId, ProjectId, MilestoneId } from "./ids";

export type RoadmapColumn = "now" | "next" | "later";

export type Effort = "S" | "M" | "L";

/**
 * A planning item on a project's Now / Next / Later roadmap. Owned by a
 * project; may correspond to a milestone (e.g. a "milestone"-tagged item).
 */
export interface RoadmapItem {
  id: RoadmapItemId;
  projectId: ProjectId;
  milestoneId?: MilestoneId;
  title: string;
  column: RoadmapColumn;
  effort: Effort;
  tag?: string;
}
