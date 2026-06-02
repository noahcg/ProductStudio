import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import { signals } from "@/lib/data";
import { Card, CardHeader, LinkButton, StatusDot } from "@/components/ui";
import { integrationIcons } from "@/components/icons";
import { cn } from "@/lib/utils";

export function SignalsPanel() {
  const allOk = signals.every((s) => s.level === "ok");

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Signals"
        action={
          <span className="flex items-center gap-2 text-xs font-medium text-muted">
            {allOk ? "All systems operational" : "Attention needed"}
            <StatusDot tone={allOk ? "ok" : "warn"} />
          </span>
        }
      />
      <ul className="divide-y divide-line px-5 py-2">
        {signals.map((signal) => {
          const Icon = integrationIcons[signal.integration];
          return (
            <li key={signal.id} className="flex items-center gap-3 py-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-fg">{signal.service}</div>
                <div className="text-xs text-muted">{signal.detail}</div>
              </div>
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full",
                  signal.level === "ok" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                )}
              >
                {signal.level === "ok" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-line px-5 py-3">
        <LinkButton href="/signals" className="text-sm">
          View all signals <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </Card>
  );
}
