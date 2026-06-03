import type { SignalSeverity } from "@/lib/signals/engine";
import { cn } from "@/lib/utils";

export const severityMeta: Record<
  SignalSeverity,
  { label: string; dot: string; chip: string; rank: number }
> = {
  critical: { label: "Critical", dot: "bg-danger", chip: "bg-danger/15 text-danger", rank: 4 },
  warning: { label: "Warning", dot: "bg-warning", chip: "bg-warning/15 text-warning", rank: 3 },
  watch: { label: "Watch", dot: "bg-info", chip: "bg-info/15 text-info", rank: 2 },
  info: { label: "Info", dot: "bg-faint", chip: "bg-surface-2 text-muted", rank: 1 },
};

export function SeverityBadge({ severity, className }: { severity: SignalSeverity; className?: string }) {
  const m = severityMeta[severity];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", m.chip, className)}>
      {m.label}
    </span>
  );
}
