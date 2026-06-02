import { getRoadmap, getProjectMap } from "@/lib/data";
import type { RoadmapColumn } from "@/lib/types";
import { Card, Badge, PageHeading } from "@/components/ui";
import { projectIcons, accentStyles } from "@/components/icons";
import { cn } from "@/lib/utils";

const COLUMNS: { key: RoadmapColumn; title: string; hint: string; dot: string }[] = [
  { key: "now", title: "Now", hint: "Shipping this cycle", dot: "bg-success" },
  { key: "next", title: "Next", hint: "Up after Now", dot: "bg-info" },
  { key: "later", title: "Later", hint: "Parked / future", dot: "bg-faint" },
];

const effortLabel = { S: "Small", M: "Medium", L: "Large" };

export default async function RoadmapsPage() {
  const [roadmap, projectMap] = await Promise.all([getRoadmap(), getProjectMap()]);

  return (
    <div>
      <PageHeading
        title="Roadmaps"
        subtitle="Now / Next / Later planning across every product in the studio."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = roadmap.filter((r) => r.column === col.key);
          return (
            <div key={col.key} className="flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-fg">{col.title}</h2>
                <span className="text-xs text-faint">· {col.hint}</span>
                <span className="ml-auto text-xs font-medium text-muted">{items.length}</span>
              </div>

              <div className="flex flex-col gap-3">
                {items.map((item) => {
                  const project = projectMap.get(item.projectId)!;
                  const Icon = projectIcons[project.icon];
                  const accent = accentStyles[project.accent];
                  return (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1", `bg-surface-2 ${accent.ring}`)}>
                            <Icon className="h-3.5 w-3.5 text-fg" />
                          </span>
                          <span className="text-xs text-muted">{project.name}</span>
                        </div>
                        {item.tag === "milestone" && <Badge tone="violet">Milestone</Badge>}
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold text-fg">{item.title}</h3>
                      <div className="mt-3 flex items-center gap-2 text-xs text-faint">
                        <span
                          className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-muted"
                          title={effortLabel[item.effort]}
                        >
                          {effortLabel[item.effort]}
                        </span>
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-faint">
                    Nothing here yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
