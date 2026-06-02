/**
 * Entity identifiers and shared keys for the Product Studio domain.
 *
 * These are string aliases (not branded types) — zero runtime cost, but they
 * document foreign-key relationships and ownership in signatures. Every child
 * entity carries the `ProjectId` of the project that owns it.
 */
export type ProjectId = string;
export type MilestoneId = string;
export type TaskId = string;
export type RoadmapItemId = string;
export type DecisionId = string;
export type ActivityId = string;
export type SignalId = string;
export type ExpenseId = string;
export type DomainId = string;
export type AlertId = string;

/**
 * The external services Product Studio can connect to. These are
 * **integrations only** — sources/sinks of data. Product Studio remains the
 * source of truth; an integration key never owns an entity, it only annotates
 * where a value originated (e.g. a signal reported by Vercel).
 */
export type IntegrationKey =
  | "github"
  | "vercel"
  | "supabase"
  | "cloudflare"
  | "openai"
  | "anthropic";
