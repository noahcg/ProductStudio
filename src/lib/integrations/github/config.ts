/**
 * GitHub integration configuration.
 *
 * GitHub is an integration source — NOT the source of truth. It only feeds the
 * activity feed, signals, and health/focus momentum. Projects, milestones,
 * roadmaps, decisions, and focus remain owned by Product Studio.
 */

/** Project (slug) → connected repositories. Supports multiple repos per project. */
export const REPO_MAP: Record<string, string[]> = {
  "home-cooked": ["noahg/home-cooked"],
  "wardrobe-harmony": ["noahg/wardrobe-harmony"],
  "personal-trainer": ["noahg/personal-trainer"],
};

export type GitHubMode = "live" | "off";

/**
 * Resolve the GitHub mode:
 *  - `GITHUB_MODE` env wins if set (live | off)
 *  - else `live` when a `GITHUB_TOKEN` is present
 *  - else `off` so no activity is invented before the integration is connected
 */
export function githubMode(): GitHubMode {
  const explicit = process.env.GITHUB_MODE as GitHubMode | undefined;
  if (explicit === "live" || explicit === "off") return explicit;
  return process.env.GITHUB_TOKEN ? "live" : "off";
}

export function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN;
}

/** Repos connected to a project (empty if none mapped). */
export function reposForProject(projectId: string): string[] {
  return REPO_MAP[projectId] ?? [];
}

// Thresholds for GitHub-derived signals.
export const GITHUB_THRESHOLDS = {
  noActivityDays: 14, // warning: no repo activity in N days
  stalePrDays: 7, // watch: open PR older than N days
} as const;
