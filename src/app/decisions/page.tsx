import { CheckCircle2, CircleHelp, RotateCcw } from "lucide-react";
import { getDecisions, getProjectMap } from "@/lib/data";
import type { DecisionStatus } from "@/lib/types";
import { Card, Badge, PageHeading } from "@/components/ui";
import { cn } from "@/lib/utils";

const statusMeta: Record<
  DecisionStatus,
  { tone: "high" | "planning" | "content"; icon: typeof CheckCircle2 }
> = {
  Decided: { tone: "high", icon: CheckCircle2 },
  Open: { tone: "planning", icon: CircleHelp },
  Revisit: { tone: "content", icon: RotateCcw },
};

export default async function DecisionsPage() {
  const [decisions, projectMap] = await Promise.all([getDecisions(), getProjectMap()]);
  const open = decisions.filter((d) => d.status !== "Decided").length;

  return (
    <div>
      <PageHeading
        title="Decisions"
        subtitle="A running log of the calls you've made — and the ones still open."
        right={
          <div className="flex items-center gap-2 text-sm">
            <Badge tone="planning">{open} open</Badge>
            <Badge tone="high">{decisions.length - open} decided</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {decisions.map((d) => {
          const project = d.projectId ? projectMap.get(d.projectId) : undefined;
          const meta = statusMeta[d.status];
          const Icon = meta.icon;
          return (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                      d.status === "Decided"
                        ? "bg-success/15 text-success"
                        : d.status === "Open"
                          ? "bg-info/15 text-info"
                          : "bg-warning/15 text-warning"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold leading-snug text-fg">{d.title}</h3>
                    <div className="mt-0.5 text-xs text-muted">
                      {project ? project.name : "Studio"} ·{" "}
                      {new Date(d.dateIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
                <Badge tone={meta.tone}>{d.status}</Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted">{d.rationale}</p>

              {d.options && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.options.map((opt) => {
                    // Only a Decided decision has a winner and "rejected" options;
                    // for Open/Revisit the options are live candidates, not struck out.
                    const decided = d.status === "Decided";
                    const chosen = decided && opt === d.chosen;
                    const rejected = decided && !chosen;
                    return (
                      <span
                        key={opt}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs ring-1 ring-inset",
                          chosen
                            ? "bg-success/15 text-success ring-success/30"
                            : rejected
                              ? "bg-surface-2 text-muted ring-line line-through decoration-faint/60"
                              : "bg-surface-2 text-muted ring-line"
                        )}
                      >
                        {opt}
                      </span>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
