import { Database, CircleCheck, AlertTriangle, CircleX, CircleDashed } from "lucide-react";
import type {
  SupabaseProjectStatus,
  SupabaseProjectState,
  SupabaseHealth,
  UsageMetric,
} from "@/lib/integrations/supabase/types";
import { SUPABASE_THRESHOLDS } from "@/lib/integrations/supabase/config";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";

const healthTone: Record<SupabaseHealth, string> = {
  Healthy: "text-success",
  Warning: "text-warning",
  Critical: "text-danger",
};

const stateMeta: Record<SupabaseProjectState, { label: string; tone: string; Icon: typeof CircleCheck }> = {
  healthy: { label: "Healthy", tone: "text-success", Icon: CircleCheck },
  degraded: { label: "Degraded", tone: "text-warning", Icon: AlertTriangle },
  unavailable: { label: "Unavailable", tone: "text-danger", Icon: CircleX },
  unknown: { label: "Unknown", tone: "text-faint", Icon: CircleDashed },
};

/** Tint a usage bar by its threshold tier. */
function usageTone(percent: number, t: { watch: number; warning: number; critical: number }): string {
  if (percent >= t.critical) return "text-danger";
  if (percent >= t.warning) return "text-warning";
  if (percent >= t.watch) return "text-info";
  return "text-muted";
}
function barTone(percent: number, t: { watch: number; warning: number; critical: number }): string {
  if (percent >= t.critical) return "bg-danger";
  if (percent >= t.warning) return "bg-warning";
  if (percent >= t.watch) return "bg-info";
  return "bg-success";
}

export function SupabasePanel({ status }: { status?: SupabaseProjectStatus }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-accent" />
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">Supabase</h3>
        {status?.connected && (
          <span className={cn("ml-auto text-xs font-medium", healthTone[status.health])}>{status.health}</span>
        )}
      </div>

      {!status || !status.connected ? (
        <p className="mt-3 text-xs text-muted">
          {status && status.supabaseProjects.length > 0
            ? "Supabase metrics unavailable."
            : "No Supabase project configured."}
        </p>
      ) : (
        <div className="mt-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-faint">Project status</span>
            <State state={status.state} />
          </div>
          {status.state === "unavailable" ? (
            <p className="text-danger">Project unavailable — metrics cannot be read.</p>
          ) : (
            <>
              <Meter label="Database" metric={status.database} t={SUPABASE_THRESHOLDS.database} />
              <Meter label="Storage" metric={status.storage} t={SUPABASE_THRESHOLDS.storage} />
              <Meter label="Bandwidth" metric={status.bandwidth} t={SUPABASE_THRESHOLDS.bandwidth} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function State({ state }: { state: SupabaseProjectState }) {
  const meta = stateMeta[state];
  return (
    <span className={cn("flex items-center gap-1.5 font-medium", meta.tone)}>
      <meta.Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function Meter({
  label,
  metric,
  t,
}: {
  label: string;
  metric?: UsageMetric;
  t: { watch: number; warning: number; critical: number };
}) {
  if (!metric) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-faint">{label}</span>
        <span className="text-muted">—</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-faint">{label}</span>
        <span className={cn("font-medium", usageTone(metric.percent, t))}>
          {metric.percent}% <span className="text-faint">· {metric.usage}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={cn("h-full rounded-full transition-[width]", barTone(metric.percent, t))}
          style={{ width: `${Math.min(metric.percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
