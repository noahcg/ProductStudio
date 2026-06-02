import { ArrowRight, Globe } from "lucide-react";
import { alerts, getProject } from "@/lib/data";
import { Card, CardHeader, LinkButton } from "@/components/ui";
import { projectIcons, accentStyles } from "@/components/icons";
import { cn } from "@/lib/utils";

export function NeedsAttention() {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Needs Attention
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger/20 px-1.5 text-[11px] font-semibold text-danger">
              {alerts.length}
            </span>
          </span>
        }
      />
      <div className="space-y-3 p-5 pt-4">
        {alerts.map((alert) => {
          const project = getProject(alert.projectId);
          const Icon = project ? projectIcons[project.icon] : Globe;
          const accent = project ? accentStyles[project.accent] : null;
          return (
            <div
              key={alert.id}
              className="rounded-xl border border-line bg-surface-2/60 p-3.5"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1",
                    accent ? `bg-surface ${accent.ring}` : "bg-surface ring-line-strong"
                  )}
                >
                  <Icon className="h-4 w-4 text-fg" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-fg">{alert.title}</div>
                  <div className="text-xs text-muted">{alert.detail}</div>
                  {alert.meta && (
                    <div className="mt-0.5 text-xs text-faint">{alert.meta}</div>
                  )}
                </div>
                <LinkButton href={alert.kind === "domain" ? "/money" : "/roadmaps"} variant="subtle" className="shrink-0 text-xs">
                  {alert.cta}
                </LinkButton>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto border-t border-line px-5 py-3">
        <LinkButton href="/signals" className="text-sm">
          View all alerts <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </Card>
  );
}
