import type { SignalSeverity } from "../signals/engine";

/**
 * Weekly Founder Review — the deterministic, no-AI "chief-of-staff" synthesis of
 * everything that happened across the portfolio in a period. Built by
 * `generateWeeklyReview` (see `engine.ts`) from existing Product Studio data +
 * the Signals/Health/Focus engines. Same inputs + clock → identical review.
 */

export type ReviewPeriodKey = "7d" | "30d";

export type ChangeDirection = "improved" | "declined" | "stable";

export interface HealthChange {
  projectId: string;
  projectName: string;
  previous: number;
  current: number;
  delta: number;
  direction: ChangeDirection;
}

export interface ProjectReview {
  projectId: string;
  projectName: string;
  healthPrevious: number;
  healthCurrent: number;
  healthDelta: number;
  healthDirection: ChangeDirection;
  tasksCompleted: number;
  milestoneTitle?: string;
  milestoneProgressPrevious: number;
  milestoneProgressCurrent: number;
  milestoneProgressDelta: number;
  newDecisions: number;
  signalCount: number; // warning + critical signals
  /** One-line chief-of-staff verdict, e.g. "Healthy momentum." */
  status: string;
}

export interface TaskSummary {
  completed: number;
  created: number;
  blocked: number;
  reopened: number;
}

export interface MilestoneProgress {
  projectId: string;
  projectName: string;
  title: string;
  previous: number;
  current: number;
  delta: number;
}

export interface RoadmapSummary {
  now: number;
  next: number;
  later: number;
  /** Human movement notes, e.g. "Moved from Next → Now". Empty when none tracked. */
  movements: string[];
}

export interface DecisionSummaryItem {
  projectName: string;
  title: string;
  status: string;
  isNew: boolean;
}

export interface SignalSummaryGroup {
  severity: SignalSeverity;
  count: number;
  /** A few representative items (capped) — "show only meaningful items". */
  items: { projectName?: string; title: string }[];
}

export interface ActivitySummary {
  commits: number;
  deployments: number;
  milestoneUpdates: number;
  total: number;
}

export interface MomentumPoint {
  projectId: string;
  projectName: string;
  score: number;
  reason: string;
}

export interface FocusRecommendation {
  projectId: string;
  projectName: string;
  reason: string;
}

export interface WeeklyReview {
  id: string;
  periodKey: ReviewPeriodKey;
  periodStartIso: string;
  periodEndIso: string;
  generatedAtIso: string;
  /** Executive summary as a few plain sentences (chief-of-staff voice). */
  executiveSummary: string[];
  recommendation: FocusRecommendation;
  projects: ProjectReview[];
  healthChanges: HealthChange[];
  tasks: TaskSummary;
  milestones: MilestoneProgress[];
  roadmap: RoadmapSummary;
  decisions: DecisionSummaryItem[];
  signals: SignalSummaryGroup[];
  activity: ActivitySummary;
  momentum: { strongest?: MomentumPoint; weakest?: MomentumPoint };
  /** True when nothing material changed — a deliberately calm "quiet week". */
  quiet: boolean;
}

/** Compact, persisted form for review history (mirrors the `reviews` table). */
export interface StoredReview {
  id: string;
  periodStartIso: string;
  periodEndIso: string;
  generatedAtIso: string;
  summary: string;
  recommendation: string;
  metadata?: Record<string, unknown>;
}
