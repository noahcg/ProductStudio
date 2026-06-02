"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Sparkles, ArrowRight, CircleDot } from "lucide-react";
import { focusForProject } from "@/lib/data/focus";
import type { ProjectFocus } from "@/lib/focus/engine";
import type { Task, Project, Focus } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Card, Badge, PageHeading } from "@/components/ui";
import { ProgressRing } from "@/components/donut";
import { projectIcons, accentStyles } from "@/components/icons";

export function FocusBoard({
  projects,
  ranked,
  baseFocus: initialFocus,
}: {
  projects: Project[];
  ranked: ProjectFocus[];
  baseFocus: Focus;
}) {
  const params = useSearchParams();
  // The Focus Engine ranking (computed server-side).
  const recs = ranked;
  const initial = params.get("project") ?? recs[0]?.project.id ?? "";

  const [projectId, setProjectId] = useState(initial);
  const baseFocus = useMemo(
    () => focusForProject(projectId, projects, initialFocus),
    [projectId, projects, initialFocus]
  );

  // Local task completion state, keyed so switching projects resets cleanly.
  const [tasks, setTasks] = useState<Task[]>(baseFocus.tasks);
  const [activeProject, setActiveProject] = useState(projectId);
  if (activeProject !== projectId) {
    setActiveProject(projectId);
    setTasks(baseFocus.tasks);
  }

  const project = projects.find((p) => p.id === projectId);

  // Graceful empty state (e.g. database connected but no projects yet).
  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Focus"
          subtitle="Your single most important milestone right now — and what to do next."
        />
        <Card className="p-10 text-center text-sm text-muted">
          No projects yet. Add a project to start tracking focus.
        </Card>
      </div>
    );
  }

  const Icon = projectIcons[project.icon];
  const accent = accentStyles[project.accent];

  const done = tasks.filter((t) => t.state === "done").length;
  const remaining = tasks.length - done;
  // Headline ring tracks curated milestone progress (consistent with Studio);
  // the task list below is the live, granular tracker.
  const progress = baseFocus.progress;

  function toggle(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, state: t.state === "done" ? "todo" : "done" } : t
      )
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Focus"
        subtitle="Your single most important milestone right now — and what to do next."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Active milestone */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={cn("grid h-12 w-12 place-items-center rounded-xl ring-1", `bg-surface-2 ${accent.ring}`)}>
                <Icon className="h-6 w-6 text-fg" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="high">{baseFocus.priority} Priority</Badge>
                  <span className="text-xs text-muted">{project.name}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-fg">{project.nextMilestone}</h2>
                <p className="mt-1 max-w-lg text-sm text-muted">{baseFocus.summary}</p>
              </div>
            </div>
            <ProgressRing value={progress} size={104} color={accent.bar} />
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">Milestone tasks</h3>
              <span className="text-xs text-muted">{remaining} remaining</span>
            </div>
            <ul className="space-y-1.5">
              {tasks.map((task) => {
                const isDone = task.state === "done";
                return (
                  <li key={task.id}>
                    <button
                      onClick={() => toggle(task.id)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3 text-left transition-colors hover:border-line-strong"
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                          isDone
                            ? "border-success bg-success/20 text-success"
                            : task.state === "active"
                              ? "border-accent text-accent"
                              : "border-line-strong text-transparent group-hover:border-muted"
                        )}
                      >
                        {isDone ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : task.state === "active" ? (
                          <CircleDot className="h-3 w-3" />
                        ) : null}
                      </span>
                      <span className={cn("flex-1 text-sm", isDone ? "text-muted line-through" : "text-fg")}>
                        {task.label}
                      </span>
                      {task.estimate && !isDone && (
                        <span className="text-xs text-faint">{task.estimate}</span>
                      )}
                      {task.state === "active" && !isDone && (
                        <Badge tone="violet">In progress</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        {/* Recommendation engine */}
        <Card className="flex h-full flex-col p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-[15px] font-semibold tracking-tight text-fg">What to work on next</h3>
          </div>
          <p className="mt-1 text-xs text-muted">Ranked across your portfolio by momentum, blockers, and urgency.</p>

          <ul className="mt-4 space-y-2.5">
            {recs.map((rec, i) => {
              const RIcon = projectIcons[rec.project.icon];
              const selected = rec.project.id === projectId;
              return (
                <li key={rec.project.id}>
                  <button
                    onClick={() => setProjectId(rec.project.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-accent/50 bg-accent/10"
                        : "border-line bg-surface-2/40 hover:border-line-strong"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface text-muted">
                        {i === 0 ? <span className="text-xs font-bold text-accent">#1</span> : <RIcon className="h-4 w-4" />}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-fg">{rec.project.name}</span>
                      <span className="text-xs font-medium text-faint">{rec.score} pts</span>
                    </div>
                    {rec.reasons[0] && (
                      <p className="mt-1.5 pl-9 text-xs text-muted">{rec.reasons[0]}</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto pt-4">
            <RecReasons rec={recs.find((r) => r.project.id === projectId)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RecReasons({ rec }: { rec?: ProjectFocus }) {
  if (!rec) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-3.5">
      {rec.recommendation && (
        <p className="mb-3 border-l-2 border-accent/50 pl-2.5 text-xs font-medium text-fg">
          {rec.recommendation}
        </p>
      )}
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">Reasons</div>
      <ul className="space-y-1.5">
        {rec.reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted">
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
