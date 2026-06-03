import type { GeneratedSignal, SignalSeverity, SignalSource } from "../signals/engine";
import type { WeeklyReview } from "../review/types";

/**
 * Attention Inbox — the header bell's data.
 *
 * These are NOT social notifications; they are **attention signals** answering
 * "what should I be aware of right now?". Derived entirely from existing systems
 * (the generated Signals stream + Weekly Founder Review availability) — no new
 * notifications table, no new route.
 *
 * The generated Signals stream already unifies the Signals Engine, GitHub,
 * Domain, Vercel, and Supabase observations (and the same conditions power the
 * Needs Attention panel), so the inbox reads from it rather than re-uniting
 * sources (which would double-count).
 */

export interface AttentionItem {
  id: string;
  severity: SignalSeverity; // critical | warning | watch (info is excluded)
  projectId?: string;
  projectName?: string;
  title: string;
  description: string;
  source: string; // friendly label
  createdAt?: string;
  actionLabel: string;
  actionHref: string;
}

export interface AttentionInbox {
  /** Critical → Warning → Watch, in that order. */
  items: AttentionItem[];
  /** Badge count: actionable items only (critical + warning + review-ready). */
  count: number;
  critical: number;
  warning: number;
  watch: number;
  /** A non-quiet Weekly Founder Review is available to read. */
  reviewReady: boolean;
  reviewRecommendation?: string;
}

const SOURCE_LABEL: Record<SignalSource, string> = {
  signals_engine: "Signals",
  github_integration: "GitHub",
  domain_monitor: "Domains",
  vercel_integration: "Vercel",
  supabase_integration: "Supabase",
};

const SEVERITY_RANK: Record<SignalSeverity, number> = { critical: 0, warning: 1, watch: 2, info: 3 };

/**
 * Build the inbox from generated signals + the current review. Pure: same inputs
 * → same inbox. `projectNameById` resolves a signal's owning project for display
 * and routing.
 */
export function buildAttentionInbox(
  signals: GeneratedSignal[],
  projectNameById: Map<string, string>,
  review?: WeeklyReview
): AttentionInbox {
  // Only actionable severities surface in the inbox (info is never shown).
  const actionable = signals
    .filter((s) => s.severity === "critical" || s.severity === "warning" || s.severity === "watch")
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        (a.projectId ?? "").localeCompare(b.projectId ?? "") ||
        a.title.localeCompare(b.title)
    );

  const items: AttentionItem[] = actionable.map((s) => {
    const projectName = s.projectId ? projectNameById.get(s.projectId) : undefined;
    // Project-scoped → act in Focus; studio-level → the Signals screen.
    const actionLabel = s.projectId ? "View Focus" : "View Signals";
    const actionHref = s.projectId ? `/focus?project=${s.projectId}` : "/signals";
    return {
      id: s.id,
      severity: s.severity,
      projectId: s.projectId,
      projectName,
      title: s.title,
      description: s.description,
      source: SOURCE_LABEL[s.source] ?? "Signals",
      createdAt: s.createdAt,
      actionLabel,
      actionHref,
    };
  });

  const critical = items.filter((i) => i.severity === "critical").length;
  const warning = items.filter((i) => i.severity === "warning").length;
  const watch = items.filter((i) => i.severity === "watch").length;

  // A quiet week's review isn't worth flagging.
  const reviewReady = !!review && !review.quiet;

  // Badge = actionable only: warning + critical signals (+ a ready review).
  const count = critical + warning + (reviewReady ? 1 : 0);

  return {
    items,
    count,
    critical,
    warning,
    watch,
    reviewReady,
    reviewRecommendation: reviewReady ? review!.recommendation.projectName : undefined,
  };
}
