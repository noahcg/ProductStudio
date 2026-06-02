import { ArrowRight, Star } from "lucide-react";
import { projects } from "@/lib/data";
import { LinkButton } from "@/components/ui";
import { StatRow } from "@/components/studio/stat-row";
import { ProjectCard } from "@/components/studio/project-card";
import { CurrentFocus } from "@/components/studio/current-focus";
import { NeedsAttention } from "@/components/studio/needs-attention";
import { SignalsPanel } from "@/components/studio/signals-panel";
import { RecentActivity } from "@/components/studio/recent-activity";
import { MonthlySpend } from "@/components/studio/monthly-spend";
import { Greeting } from "@/components/studio/greeting";

export default function StudioPage() {
  return (
    <div className="space-y-6">
      {/* Greeting + stats */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <Greeting />
        <StatRow />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight text-fg">Your Projects</h2>
              <LinkButton href="/roadmaps" className="flex items-center gap-1 text-sm">
                View all projects <ArrowRight className="h-3.5 w-3.5" />
              </LinkButton>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <NeedsAttention />
            <SignalsPanel />
            <RecentActivity />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <CurrentFocus />
          <MonthlySpend />
        </div>
      </div>

      {/* Footer banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 fill-warning/20 text-warning" />
          <p className="text-sm text-fg">
            You shipped <strong>3 updates</strong> across 2 products this week. Keep the momentum going.
          </p>
        </div>
        <LinkButton href="/roadmaps" variant="subtle" className="text-sm">
          Weekly Summary <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </div>
  );
}
