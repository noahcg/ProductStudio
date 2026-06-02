import type { Decision } from "@/lib/domain";

export interface DecisionFilters {
  projectId: string; // "all" or a project id (slug)
  query: string;
}

/** Pure filter for the Decisions list — by project and free-text search. */
export function filterDecisions(decisions: Decision[], filters: DecisionFilters): Decision[] {
  const q = filters.query.trim().toLowerCase();
  return decisions.filter((d) => {
    if (filters.projectId !== "all" && d.projectId !== filters.projectId) return false;
    if (!q) return true;
    const haystack = [
      d.title,
      d.decision ?? "",
      d.rationale,
      d.tradeoffs ?? "",
      d.status,
      ...d.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
