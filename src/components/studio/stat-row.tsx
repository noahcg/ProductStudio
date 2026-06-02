import { Box, Activity, AlertTriangle, CalendarDays } from "lucide-react";
import { studioStats } from "@/lib/data";
import { currency } from "@/lib/utils";

const items = [
  { icon: Box, value: String(studioStats.projects), label: "Projects", color: "text-accent" },
  { icon: Activity, value: String(studioStats.active), label: "Active", color: "text-success" },
  { icon: AlertTriangle, value: String(studioStats.needsAttention), label: "Needs Attention", color: "text-warning" },
  { icon: CalendarDays, value: currency(studioStats.monthlySpend), label: "Monthly Spend", color: "text-info" },
];

export function StatRow() {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      {items.map(({ icon: Icon, value, label, color }) => (
        <div key={label} className="flex items-center gap-2.5">
          <Icon className={`h-5 w-5 ${color}`} />
          <div className="leading-tight">
            <div className="text-lg font-semibold text-fg">{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
