export type ProjectStatus = "Active" | "Planning" | "Content" | "Paused" | "Shipped";

export type ProjectAccent = "amber" | "violet" | "blue" | "orange" | "green" | "teal";

export interface Project {
  id: string;
  name: string;
  tagline: string;
  status: ProjectStatus;
  /** progress toward the next milestone, 0–100 */
  progress: number;
  nextMilestone: string;
  openTasks: number;
  blockers: number;
  lastActivityIso: string;
  accent: ProjectAccent;
  /** lucide icon key, resolved in the UI */
  icon: "chef" | "shirt" | "dumbbell" | "sofa";
  repo?: string;
  domain?: string;
}

export type TaskState = "done" | "active" | "todo";

export interface FocusTask {
  id: string;
  label: string;
  state: TaskState;
  estimate?: string;
}

export interface Focus {
  projectId: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  summary: string;
  progress: number;
  tasks: FocusTask[];
}

export type SignalLevel = "ok" | "warn" | "down";

export interface Signal {
  id: string;
  service: string;
  detail: string;
  level: SignalLevel;
  integration: Integration["key"];
}

export type ActivityKind = "commit" | "issue" | "deploy" | "domain" | "infra";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  projectId?: string;
  whenIso: string;
  ok?: boolean;
}

export interface Alert {
  id: string;
  kind: "stale" | "domain" | "blocker" | "budget";
  projectId?: string;
  title: string;
  detail: string;
  meta?: string;
  cta: string;
}

export interface SpendCategory {
  label: string;
  amount: number;
  color: string;
}

export interface Integration {
  key: "github" | "vercel" | "supabase" | "cloudflare" | "openai" | "anthropic";
  name: string;
  connected: boolean;
  detail: string;
}

export type RoadmapColumn = "now" | "next" | "later";

export interface RoadmapItem {
  id: string;
  title: string;
  projectId: string;
  column: RoadmapColumn;
  effort: "S" | "M" | "L";
  tag?: string;
}

export type DecisionStatus = "Decided" | "Open" | "Revisit";

export interface Decision {
  id: string;
  title: string;
  projectId?: string;
  status: DecisionStatus;
  dateIso: string;
  rationale: string;
  options?: string[];
  chosen?: string;
}
