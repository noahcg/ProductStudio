import { ArrowRight, Compass, CheckCircle2, TrendingUp, Flag } from "lucide-react";
import { getWeeklyReview } from "@/lib/data";
import { Card, LinkButton } from "@/components/ui";

/**
 * Compact "Latest Review" card for the Studio screen — the chief-of-staff
 * headline + a link into the full Weekly Founder Review. Kept minimal.
 */
export async function LatestReview() {
  const review = await getWeeklyReview("7d");
  const changed = review.healthChanges.filter((h) => h.direction !== "stable").length;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 text-accent" />
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">Weekly Review</h2>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-3">
        {review.executiveSummary[0]}
      </p>

      <dl className="mt-4 space-y-2.5 text-sm">
        <Row icon={<CheckCircle2 className="h-4 w-4" />} label="Completed">
          {review.tasks.completed} task{review.tasks.completed === 1 ? "" : "s"}
        </Row>
        <Row icon={<TrendingUp className="h-4 w-4" />} label="Health changes">
          {changed} project{changed === 1 ? "" : "s"}
        </Row>
        <Row icon={<Flag className="h-4 w-4" />} label="Recommendation">
          <span className="font-medium text-fg">{review.recommendation.projectName}</span>
        </Row>
      </dl>

      <div className="mt-auto pt-4">
        <LinkButton href="/review" variant="primary" className="w-full justify-center">
          View Review <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </div>
    </Card>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-faint">
        {icon}
        <span className="text-muted">{label}</span>
      </span>
      <span className="text-fg">{children}</span>
    </div>
  );
}
