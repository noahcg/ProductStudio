import { connection } from "next/server";
import { ArrowRight, Star } from "lucide-react";
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
import { MorningProjects } from "@/components/studio/morning-projects";
import { currency } from "@/lib/utils";

export default async function StudioPage() {
  await connection();
  const [weekly, profile, stats] = await Promise.all([
    getWeeklySummary(),
    getProfile(),
    getStudioStats(),
  ]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <CurrentFocus
            name={profile.name}
            stats={{
              active: stats.active,
              needsAttention: stats.needsAttention,
              monthlySpend: currency(stats.monthlySpend),
            }}
          />
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
            {weekly.updates > 0 ? (
              <>You shipped <strong>{weekly.updates} updates</strong> across {weekly.products} products this week. Keep the momentum going.</>
            ) : (
              <>No updates logged this week. Start with the next task for <strong>Home Cooked</strong>.</>
            )}
          </p>
        </div>
        <LinkButton href={weekly.updates > 0 ? "/roadmaps" : "/projects?project=home-cooked"} variant="subtle" className="text-sm">
          {weekly.updates > 0 ? "Weekly Summary" : "Open Home Cooked"} <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </div>
  );
}
