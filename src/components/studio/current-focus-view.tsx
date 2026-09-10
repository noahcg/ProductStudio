"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CircleDot, Sparkles } from "lucide-react";
import type { Focus } from "@/lib/domain";
import { Card, Badge, LinkButton } from "@/components/ui";
import { ProgressRing } from "@/components/donut";
import { openTasksByReminder, taskReminder } from "@/lib/tasks/reminders";
import { cn } from "@/lib/utils";
import { Greeting } from "./greeting";

export function CurrentFocusView({
  focus,
  initialNow,
  name,
  stats,
}: {
  focus: Focus;
  initialNow: string;
  name: string;
  stats: { active: number; needsAttention: number; monthlySpend: string };
}) {
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

  function moveGlass(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--glass-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    event.currentTarget.style.setProperty("--glass-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  }

  function resetGlass(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.removeProperty("--glass-x");
    event.currentTarget.style.removeProperty("--glass-y");
  }

  return (
    <Card onPointerMove={moveGlass} onPointerLeave={resetGlass} className="focus-hero relative flex h-full flex-col overflow-hidden">
      <div className="focus-hero-glow" aria-hidden="true" />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Today&apos;s focus
            </div>
            <Greeting name={name} />
          </div>
          <dl className="grid grid-cols-3 overflow-hidden rounded-xl border border-line/80 bg-bg/35 text-center backdrop-blur-sm lg:min-w-[318px]">
            <FocusStat label="Active" value={String(stats.active)} />
            <FocusStat label="Attention" value={String(stats.needsAttention)} tone={stats.needsAttention > 0 ? "warn" : undefined} />
            <FocusStat label="Spend" value={stats.monthlySpend} />
          </dl>
        </div>
        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_150px] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-muted">Current focus</span>
              <Badge tone={overdue ? "content" : "neutral"}>{overdue ? "Needs attention" : `${focus.priority} priority`}</Badge>
            </div>
            <h2 className="max-w-2xl text-2xl font-bold leading-tight tracking-[-0.035em] text-fg sm:text-3xl">{focus.projectId ? project : "Choose a project to focus on."}</h2>
            {goal && <p className="mt-1 text-lg font-medium leading-tight text-muted sm:text-xl">{goal}</p>}
            {focus.summary && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{focus.summary}</p>}
          </div>
          {focus.projectId && <div className="flex items-center gap-3 lg:justify-end"><ProgressRing value={focus.progress} /><span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Complete</span></div>}
        </div>
        {(overdue > 0 || today > 0) && <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-bg/30 px-3.5 py-3 text-sm" role="status">
          <Bell className={cn("h-4 w-4", overdue ? "text-danger" : "text-accent")} />
          <span className="text-fg">{[overdue > 0 ? `${overdue} overdue` : "", today > 0 ? `${today} scheduled today` : ""].filter(Boolean).join(" · ")}</span>
        </div>}
        <div className="mt-5 rounded-xl border border-line bg-bg/30 p-2 backdrop-blur-sm">
          <ul className="space-y-1">
            {openTasks.map((task) => {
              const reminder = taskReminder(task, now);
              return <li key={task.id}>
                <a href={href} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">
                  <CircleDot className={cn("h-5 w-5 shrink-0", reminder?.kind === "Overdue" ? "text-danger" : task.status === "in_progress" ? "text-accent" : "text-faint")} />
                  <span className="min-w-0 flex-1 break-words text-fg">{task.title}</span>
                  <span className={cn("shrink-0 text-xs", reminder?.kind === "Overdue" ? "text-danger" : reminder?.kind === "Today" ? "text-accent" : "text-muted")}>
                    {reminder?.label ?? "Unscheduled"}{task.status === "in_progress" ? " · In progress" : ""}
                  </span>
                </a>
              </li>;
            })}
            {openTasks.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">{focus.tasks.length ? "All tasks complete." : "No tasks yet. Open the project to add one."}</li>}
          </ul>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-5">
          <div className="text-sm"><span className="text-lg font-semibold text-fg">{openTasks.length}</span>{" "}<span className="text-muted">{openTasks.length === 1 ? "Task" : "Tasks"} remaining</span></div>
          <LinkButton href={href} variant="primary" className="rounded-xl px-4 py-2.5">Open project <ArrowRight className="h-4 w-4" /></LinkButton>
        </div>
      </div>
    </Card>
  );
}

function FocusStat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="border-r border-line/80 px-3 py-3 last:border-r-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className={cn("mt-1 text-base font-semibold tracking-tight text-fg", tone === "warn" && "text-warning")}>{value}</dd>
    </div>
  );
}
