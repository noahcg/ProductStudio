import { Check, AlertTriangle } from "lucide-react";
import type { ProjectHealth } from "@/lib/health/engine";
import { Card } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";

function barColor(score: number): string {
  if (score >= 90) return "var(--success)";
  if (score >= 70) return "var(--info)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

/** Project Health summary — overall score + category breakdown with reasons. */
export function HealthSummary({ health }: { health: ProjectHealth }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">Project Health</h3>
        <HealthBadge score={health.score} status={health.status} />
      </div>

      <ul className="mt-4 space-y-3">
        {health.categories.map((c) => (
          <li key={c.category}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{c.label}</span>
              <span className="font-medium text-fg">{c.score}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${c.score}%`, background: barColor(c.score) }}
              />
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-faint">
              {c.reason.good ? (
                <Check className="h-3 w-3 text-success" strokeWidth={3} />
              ) : (
                <AlertTriangle className="h-3 w-3 text-warning" />
              )}
              {c.reason.text}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
