import type { HealthStatus } from "@/lib/health/engine";
import { cn } from "@/lib/utils";

const tone: Record<HealthStatus, { dot: string; text: string }> = {
  Healthy: { dot: "bg-success", text: "text-success" },
  Stable: { dot: "bg-info", text: "text-info" },
  "Attention Needed": { dot: "bg-warning", text: "text-warning" },
  "At Risk": { dot: "bg-danger", text: "text-danger" },
};

/** Compact "92 Healthy" health indicator with a status-colored dot. */
export function HealthBadge({
  score,
  status,
  showStatus = true,
  className,
}: {
  score: number;
  status: HealthStatus;
  showStatus?: boolean;
  className?: string;
}) {
  const t = tone[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} />
      <span className="shrink-0 font-semibold text-fg">{score}</span>
      {showStatus && <span className={cn("min-w-0 truncate", t.text)}>{status}</span>}
    </span>
  );
}
