import { Check, ArrowRight } from "lucide-react";
import { getActivity, getProjectMap } from "@/lib/data";
import { Card, CardHeader, LinkButton } from "@/components/ui";
import { activityIcons } from "@/components/icons";
import { relativeTime } from "@/lib/utils";

export async function RecentActivity() {
  const [activity, projectMap] = await Promise.all([getActivity(), getProjectMap()]);

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recent Activity"
        action={
          <LinkButton href="/signals" className="flex items-center gap-1 text-sm">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </LinkButton>
        }
      />
      <ul className="px-5 py-3">
        {activity.slice(0, 6).map((item) => {
          const Icon = activityIcons[item.kind];
          const project = item.projectId ? projectMap.get(item.projectId) : undefined;
          return (
            <li key={item.id} className="flex gap-3 py-2.5">
              <div className="flex flex-col items-center">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1 border-l border-line pl-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
                  {item.title}
                  {item.ok && <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />}
                </div>
                <div className="text-xs text-muted">
                  {project ? project.name : "System"} · {relativeTime(item.whenIso)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
