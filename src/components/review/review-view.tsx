import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  GitCommitHorizontal,
  Rocket,
  Flag,
  Compass,
} from "lucide-react";
import type {
  WeeklyReview,
  StoredReview,
  ProjectReview,
  ChangeDirection,
} from "@/lib/review/types";
import { Card, CardHeader, PageHeading } from "@/components/ui";
import { severityMeta } from "@/components/signals/severity";
import { cn, relativeTime } from "@/lib/utils";

const dirTone: Record<ChangeDirection, string> = {
  improved: "text-success",
  declined: "text-danger",
  stable: "text-muted",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Signed delta with arrow + tint. */
function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  const dir: ChangeDirection = value > 0 ? "improved" : value < 0 ? "declined" : "stable";
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold tabular-nums", dirTone[dir])}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function ReviewView({
  review,
  history,
}: {
  review: WeeklyReview;
  history: StoredReview[];
}) {
  const changedProjects = review.healthChanges.filter((h) => h.direction !== "stable").length;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Weekly Founder Review"
        subtitle={`${fmtDate(review.periodStartIso)} – ${fmtDate(review.periodEndIso)} · your portfolio at a glance`}
        right={
          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted">
            Generated {relativeTime(review.generatedAtIso)}
          </span>
        }
      />

      {/* Executive summary + recommendation */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <Compass className="h-4 w-4 text-accent" /> Executive summary
          </div>
          <div className="mt-3 space-y-2">
            {review.executiveSummary.map((line, i) => (
              <p key={i} className={cn("text-fg", i === 0 ? "text-lg font-semibold tracking-tight" : "text-sm text-muted")}>
                {line}
              </p>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <Flag className="h-4 w-4 text-accent" /> Recommended focus
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-fg">
            {review.recommendation.projectName}
          </div>
          <p className="mt-2 border-l-2 border-accent/50 pl-3 text-sm text-muted">
            {review.recommendation.reason}
          </p>
        </Card>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Tasks completed" value={review.tasks.completed} icon={<CheckCircle2 className="h-4 w-4" />} />
        <Stat label="Projects changed" value={changedProjects} icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="New decisions" value={review.decisions.length} icon={<Flag className="h-4 w-4" />} />
        <Stat
          label="Need attention"
          value={review.signals.filter((g) => g.severity === "warning" || g.severity === "critical").reduce((n, g) => n + g.count, 0)}
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Project summaries */}
          <Card>
            <CardHeader title="Project summaries" />
            <div className="grid grid-cols-1 gap-3 p-5 pt-3 sm:grid-cols-2">
              {review.projects.map((p) => (
                <ProjectSummaryCard key={p.projectId} p={p} />
              ))}
            </div>
          </Card>

          {/* Health changes */}
          <Card>
            <CardHeader title="Health changes" />
            <ul className="divide-y divide-line px-5 py-1">
              {review.healthChanges.map((h) => (
                <li key={h.projectId} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-fg">{h.projectName}</span>
                  <span className="flex items-center gap-2 tabular-nums text-muted">
                    {h.previous} <ArrowRight className="h-3 w-3 text-faint" /> {h.current}
                    <span className="ml-1">
                      <Delta value={h.delta} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Milestone summary */}
          <Card>
            <CardHeader title="Milestone progress" />
            <ul className="space-y-3 p-5 pt-3">
              {review.milestones.map((m) => (
                <li key={m.projectId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-fg">{m.title}</span>
                    <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                      {m.previous}% <ArrowRight className="h-3 w-3 text-faint" /> {m.current}%
                      <Delta value={m.delta} suffix="%" />
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-success/70" style={{ width: `${m.current}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Signals summary */}
          <Card>
            <CardHeader title="Signals" />
            {review.signals.length > 0 ? (
              <div className="space-y-4 p-5 pt-3">
                {review.signals.map((g) => (
                  <div key={g.severity}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", severityMeta[g.severity].dot)} />
                      <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                        {severityMeta[g.severity].label}
                      </span>
                      <span className="text-xs text-muted">· {g.count}</span>
                    </div>
                    <ul className="space-y-1 pl-4">
                      {g.items.map((it, i) => (
                        <li key={i} className="text-sm text-muted">
                          {it.title}
                          {it.projectName && <span className="text-faint"> · {it.projectName}</span>}
                        </li>
                      ))}
                      {g.count > g.items.length && (
                        <li className="text-xs text-faint">+{g.count - g.items.length} more</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-muted">No signals this period — all clear.</p>
            )}
          </Card>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-5">
          {/* Momentum */}
          <Card>
            <CardHeader title="Momentum" />
            <div className="space-y-3 p-5 pt-3">
              {review.momentum.strongest && (
                <MomentumRow kind="strongest" name={review.momentum.strongest.projectName} reason={review.momentum.strongest.reason} />
              )}
              {review.momentum.weakest && review.momentum.weakest.projectId !== review.momentum.strongest?.projectId && (
                <MomentumRow kind="weakest" name={review.momentum.weakest.projectName} reason={review.momentum.weakest.reason} />
              )}
            </div>
          </Card>

          {/* Task summary */}
          <Card>
            <CardHeader title="Tasks" />
            <div className="grid grid-cols-2 gap-3 p-5 pt-3">
              <MiniStat label="Completed" value={review.tasks.completed} />
              <MiniStat label="Created" value={review.tasks.created} />
              <MiniStat label="Blocked" value={review.tasks.blocked} warn={review.tasks.blocked > 0} />
              <MiniStat label="Reopened" value={review.tasks.reopened} />
            </div>
          </Card>

          {/* Activity summary */}
          <Card>
            <CardHeader title="Activity" />
            <div className="space-y-2.5 p-5 pt-3 text-sm">
              <ActivityRow icon={<GitCommitHorizontal className="h-4 w-4" />} label="Commits" value={review.activity.commits} />
              <ActivityRow icon={<Rocket className="h-4 w-4" />} label="Deployments" value={review.activity.deployments} />
              <ActivityRow icon={<Flag className="h-4 w-4" />} label="Milestone updates" value={review.activity.milestoneUpdates} />
            </div>
          </Card>

          {/* Roadmap summary */}
          <Card>
            <CardHeader title="Roadmap" />
            <div className="space-y-2.5 p-5 pt-3 text-sm">
              <ActivityRow label="Now" value={review.roadmap.now} />
              <ActivityRow label="Next" value={review.roadmap.next} />
              <ActivityRow label="Later" value={review.roadmap.later} />
              {review.roadmap.movements.length === 0 && (
                <p className="pt-1 text-xs text-faint">No roadmap moves recorded this period.</p>
              )}
            </div>
          </Card>

          {/* Decisions */}
          <Card>
            <CardHeader title="Decisions" />
            {review.decisions.length > 0 ? (
              <ul className="space-y-2 p-5 pt-3">
                {review.decisions.map((d, i) => (
                  <li key={i} className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <div className="text-sm font-medium text-fg">{d.title}</div>
                    <div className="mt-0.5 text-[11px] text-faint">{d.projectName} · {d.status}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-center text-sm text-muted">No new decisions this period.</p>
            )}
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader title="Earlier reviews" />
              <ul className="space-y-2 p-5 pt-3">
                {history.map((h) => (
                  <li key={h.id} className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <div className="text-xs font-medium text-fg">
                      {fmtDate(h.periodStartIso)} – {fmtDate(h.periodEndIso)}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{h.summary}</p>
                    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-faint">
                      <Flag className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                      {h.recommendation}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-faint">{icon}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-fg tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </Card>
  );
}

function ProjectSummaryCard({ p }: { p: ProjectReview }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-fg">{p.projectName}</span>
        <Delta value={p.healthDelta} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
        <SummaryField label="Tasks done" value={String(p.tasksCompleted)} />
        <SummaryField
          label="Milestone"
          value={p.milestoneProgressDelta !== 0 ? `+${p.milestoneProgressDelta}%` : `${p.milestoneProgressCurrent}%`}
        />
        <SummaryField label="Decisions" value={String(p.newDecisions)} />
        <SummaryField label="Signals" value={String(p.signalCount)} warn={p.signalCount > 0} />
      </div>
      <div className="mt-3 text-xs font-medium text-muted">{p.status}</div>
    </div>
  );
}

function SummaryField({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cn("font-semibold", warn ? "text-warning" : "text-fg")}>{value}</div>
    </div>
  );
}

function MomentumRow({ kind, name, reason }: { kind: "strongest" | "weakest"; name: string; reason: string }) {
  const up = kind === "strongest";
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
      <div className="flex items-center gap-2">
        {up ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-warning" />}
        <span className="text-xs font-semibold uppercase tracking-wide text-faint">
          {up ? "Strongest momentum" : "Weakest momentum"}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-semibold text-fg">{name}</div>
      <p className="mt-0.5 text-xs text-muted">{reason}</p>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2/40 p-3">
      <div className={cn("text-xl font-bold tabular-nums", warn ? "text-warning" : "text-fg")}>{value}</div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}

function ActivityRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted">
        {icon && <span className="text-faint">{icon}</span>}
        {label}
      </span>
      <span className="font-semibold text-fg tabular-nums">{value}</span>
    </div>
  );
}
