"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CircleDot } from "lucide-react";
import type { Focus } from "@/lib/domain";
import { Card, Badge, LinkButton } from "@/components/ui";
import { ProgressRing } from "@/components/donut";
import { openTasksByReminder, taskReminder } from "@/lib/tasks/reminders";
import { cn } from "@/lib/utils";

export function CurrentFocusView({ focus, initialNow }: { focus: Focus; initialNow: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      setNow(new Date());
      router.refresh();
    }
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const [project, ...goalParts] = focus.title.split(" — ");
  const goal = goalParts.join(" — ");
  const openTasks = openTasksByReminder(focus.tasks, now);
  const overdue = openTasks.filter((task) => taskReminder(task, now)?.kind === "Overdue").length;
  const today = openTasks.filter((task) => taskReminder(task, now)?.kind === "Today").length;
  const href = focus.projectId ? `/projects?project=${encodeURIComponent(focus.projectId)}` : "/projects";

  return (
    <Card className="flex h-full flex-col p-5">
      <h2 className="text-[15px] font-semibold tracking-tight text-fg">Current Focus</h2>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <Badge tone={overdue ? "content" : "neutral"} className="mb-2">{overdue ? "Needs attention" : `${focus.priority} priority`}</Badge>
          <h3 className="text-xl font-bold leading-tight text-fg">{focus.projectId ? project : "Choose a project to focus on."}</h3>
          {goal && <p className="text-xl font-bold leading-tight text-fg">{goal}</p>}
        </div>
        {focus.projectId && <ProgressRing value={focus.progress} />}
      </div>
      {focus.summary && <p className="mt-4 text-sm leading-relaxed text-muted">{focus.summary}</p>}
      {(overdue > 0 || today > 0) && <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm" role="status">
        <Bell className={cn("h-4 w-4", overdue ? "text-danger" : "text-accent")} />
        <span className="text-fg">{[overdue > 0 ? `${overdue} overdue` : "", today > 0 ? `${today} scheduled today` : ""].filter(Boolean).join(" · ")}</span>
      </div>}
      <ul className="mt-5 space-y-3 pb-5">
        {openTasks.map((task) => {
          const reminder = taskReminder(task, now);
          return <li key={task.id}>
            <a href={href} className="flex items-start gap-3 rounded-lg p-2 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">
              <CircleDot className={cn("mt-0.5 h-5 w-5 shrink-0", reminder?.kind === "Overdue" ? "text-danger" : task.status === "in_progress" ? "text-accent" : "text-faint")} />
              <span className="min-w-0">
                <span className="block break-words text-fg">{task.title}</span>
                <span className={cn("mt-1 block text-xs", reminder?.kind === "Overdue" ? "text-danger" : reminder?.kind === "Today" ? "text-accent" : "text-muted")}>
                  {reminder?.label ?? "Unscheduled"}{task.status === "in_progress" ? " · In progress" : ""}
                </span>
              </span>
            </a>
          </li>;
        })}
        {openTasks.length === 0 && <li className="text-sm text-muted">{focus.tasks.length ? "All tasks complete." : "No tasks yet. Open the project to add one."}</li>}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="text-sm"><span className="text-lg font-semibold text-fg">{openTasks.length}</span>{" "}<span className="text-muted">{openTasks.length === 1 ? "Task" : "Tasks"} remaining</span></div>
        <LinkButton href={href} variant="primary">Open Project <ArrowRight className="h-4 w-4" /></LinkButton>
      </div>
    </Card>
  );
}
