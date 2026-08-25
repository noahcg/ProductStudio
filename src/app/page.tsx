import { Activity, AlertTriangle, ArrowRight, DollarSign, Star } from "lucide-react";
import {
  getWeeklySummary,
  getProfile,
  getStudioStats,
} from "@/lib/data";
import { LinkButton } from "@/components/ui";
import { CurrentFocus } from "@/components/studio/current-focus";
import { NeedsAttention } from "@/components/studio/needs-attention";
import { RecentActivity } from "@/components/studio/recent-activity";
import { MonthlySpend } from "@/components/studio/monthly-spend";
import { LatestReview } from "@/components/studio/latest-review";
import { Greeting } from "@/components/studio/greeting";
import { MorningProjects } from "@/components/studio/morning-projects";
import { currency } from "@/lib/utils";

export default async function StudioPage() {
  const [weekly, profile, stats] = await Promise.all([
    getWeeklySummary(),
    getProfile(),
    getStudioStats(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <Greeting name={profile.name} />
        <div className="flex flex-wrap items-center gap-2">
          <QuietStat icon={<Activity className="h-4 w-4" />} label="Active" value={String(stats.active)} />
          <QuietStat icon={<AlertTriangle className="h-4 w-4" />} label="Attention" value={String(stats.needsAttention)} tone="warn" />
          <QuietStat icon={<DollarSign className="h-4 w-4" />} label="Spend" value={currency(stats.monthlySpend)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <CurrentFocus />
          <MorningProjects />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <NeedsAttention />
            <RecentActivity />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <LatestReview />
          <MonthlySpend />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 shrink-0 fill-warning/20 text-warning" />
          <p className="text-sm leading-relaxed text-fg">
            You shipped <strong>{weekly.updates} updates</strong> across {weekly.products} products this week. Keep the momentum going.
          </p>
        </div>
        <LinkButton href="/roadmaps" variant="subtle" className="text-sm">
          Weekly Summary <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </div>
  );
}

function QuietStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface/55 px-3 py-2 text-sm">
      <span className={tone === "warn" ? "text-warning" : "text-muted"}>{icon}</span>
      <span className="font-semibold text-fg">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
