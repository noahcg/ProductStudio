import { Check, ArrowRight } from "lucide-react";
import { getFocus } from "@/lib/data";
import { Card, Badge, LinkButton } from "@/components/ui";
import { ProgressRing } from "@/components/donut";
import { cn } from "@/lib/utils";

export async function CurrentFocus() {
  const focus = await getFocus();
  const remaining = focus.tasks.filter((t) => t.state !== "done").length;
  const [project, milestone] = focus.title.split(" — ");

  return (
    <Card className="flex h-full flex-col p-5">
      <h2 className="text-[15px] font-semibold tracking-tight text-fg">Current Focus</h2>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <Badge tone="high" className="mb-2">High Priority</Badge>
          <h3 className="text-xl font-bold leading-tight text-fg">{project}</h3>
          <p className="text-xl font-bold leading-tight text-fg">{milestone}</p>
        </div>
        <ProgressRing value={focus.progress} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{focus.summary}</p>

      <ul className="mt-5 space-y-3">
        {focus.tasks.slice(0, 4).map((task) => {
          const done = task.state === "done";
          return (
            <li key={task.id} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  done
                    ? "border-success bg-success/20 text-success"
                    : task.state === "active"
                      ? "border-accent text-accent"
                      : "border-line-strong text-transparent"
                )}
              >
                {done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={cn(done ? "text-muted line-through" : "text-fg")}>{task.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
        <div className="text-sm">
          <span className="text-lg font-semibold text-fg">{remaining}</span>{" "}
          <span className="text-muted">Tasks remaining</span>
        </div>
        <LinkButton href="/focus" variant="primary">
          View Focus <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </div>
    </Card>
  );
}
