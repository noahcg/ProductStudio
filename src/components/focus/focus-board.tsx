"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CircleDot,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Ban,
  Sparkles,
} from "lucide-react";
import type { Task, TaskInput, TaskStatus, Project, Milestone, Domain } from "@/lib/domain";
import type { ProjectFocus } from "@/lib/focus/engine";
import type { ProjectHealth } from "@/lib/health/engine";
import type { VercelProjectStatus } from "@/lib/integrations/vercel/types";
import type { SupabaseProjectStatus } from "@/lib/integrations/supabase/types";
import { taskStats } from "@/lib/tasks/stats";
import { cn } from "@/lib/utils";
import { Card, Badge, PageHeading, Button } from "@/components/ui";
import { ProgressRing } from "@/components/donut";
import { projectIcons } from "@/components/icons";
import { MeetingNotes } from "@/components/studio/meeting-notes";
import { TaskForm } from "./task-form";
import { HealthSummary } from "./health-summary";
import { DomainPanel } from "./domain-panel";
import { DeploymentPanel } from "./deployment-panel";
import { SupabasePanel } from "./supabase-panel";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  setTaskStatusAction,
} from "@/app/focus/actions";

type OptimisticAction =
  | { type: "add"; task: Task }
  | { type: "update"; task: Task }
  | { type: "remove"; id: string };

type Modal = { mode: "closed" } | { mode: "new" } | { mode: "edit"; task: Task };

const priorityDot: Record<string, string> = {
  critical: "bg-danger",
  high: "bg-warning",
  medium: "bg-muted",
  low: "bg-faint",
};

export function FocusBoard({
  projects,
  ranked,
  milestones,
  tasks,
  health,
  domains,
  vercel,
  supabase,
}: {
  projects: Project[];
  ranked: ProjectFocus[];
  milestones: Milestone[];
  tasks: Task[];
  health: ProjectHealth[];
  domains: Domain[];
  vercel: Record<string, VercelProjectStatus>;
  supabase: Record<string, SupabaseProjectStatus>;
}) {
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get("project") ?? projects[0]?.id ?? "");
  const [modal, setModal] = useState<Modal>({ mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [optimistic, applyOptimistic] = useOptimistic(tasks, (state: Task[], a: OptimisticAction) => {
    switch (a.type) {
      case "add":
        return [...state, a.task];
      case "update":
        return state.map((t) => (t.id === a.task.id ? a.task : t));
      case "remove":
        return state.filter((t) => t.id !== a.id);
    }
  });

  const project = projects.find((p) => p.id === selectedId);
  const milestone =
    milestones.find((m) => m.projectId === selectedId && m.status === "active") ??
    milestones.find((m) => m.projectId === selectedId);
  const milestoneTasks = milestone ? optimistic.filter((t) => t.milestoneId === milestone.id) : [];
  const stats = taskStats(milestoneTasks);
  const selectedHealth = health.find((h) => h.project.id === selectedId);
  const selectedDomains = domains.filter((d) => d.projectId === selectedId);
  const selectedDeployment = vercel[selectedId];
  const selectedSupabase = supabase[selectedId];
  const selectedRec = ranked.find((r) => r.project.id === selectedId);

  function close() {
    setModal({ mode: "closed" });
    setError(null);
  }

  function submitTask(fields: Omit<TaskInput, "projectId" | "milestoneId">) {
    if (!project) return;
    setError(null);
    const input: TaskInput = { projectId: project.id, milestoneId: milestone?.id, ...fields };
    const editing = modal.mode === "edit" ? modal.task : null;
    startTransition(async () => {
      if (editing) {
        applyOptimistic({ type: "update", task: { ...editing, ...input } });
        const res = await updateTaskAction(editing.id, input);
        if (!res.ok) return setError(res.error);
      } else {
        applyOptimistic({ type: "add", task: { id: `optimistic-${Date.now()}`, ...input } });
        const res = await createTaskAction(input);
        if (!res.ok) return setError(res.error);
      }
      close();
    });
  }

  function setStatus(task: Task, status: TaskStatus) {
    startTransition(async () => {
      applyOptimistic({
        type: "update",
        task: { ...task, status, completedAt: status === "completed" ? new Date().toISOString() : undefined },
      });
      const res = await setTaskStatusAction(task.id, status);
      if (!res.ok) setError(res.error);
    });
  }

  function removeTask(task: Task) {
    if (!confirm(`Delete “${task.title}”?`)) return;
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: task.id });
      const res = await deleteTaskAction(task.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Projects"
        subtitle="Open a project to manage its current tasks, goals, notes, and operational context."
      />

      {!project ? (
        <Card className="p-10 text-center text-sm text-muted">
          No projects yet. Add a project to start tracking tasks and notes.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <ProjectSwitcher
            projects={projects}
            tasks={optimistic}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <div className="flex flex-col gap-5">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="high">{milestone ? `${milestone.priority} Priority` : "No milestone"}</Badge>
                    <span className="text-xs text-muted">{project.status}</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-fg">{project.name}</h2>
                  <p className="mt-1 text-lg font-semibold text-fg">
                    {milestone?.title ?? project.nextMilestone}
                  </p>
                  {milestone?.summary && <p className="mt-1 max-w-lg text-sm text-muted">{milestone.summary}</p>}
                </div>
                {milestone && (
                  <ProgressRing value={milestone.progress} size={104} color="var(--success)" />
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Tasks</h3>
                <Button variant="subtle" className="text-xs" onClick={() => setModal({ mode: "new" })}>
                  <Plus className="h-3.5 w-3.5" /> Add task
                </Button>
              </div>

              {milestoneTasks.length > 0 ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-fg">
                      {stats.completed} / {stats.total} tasks complete
                    </span>
                    <Chip tone={stats.blocked ? "warn" : "ok"}>
                      {stats.blocked ? `${stats.blocked} blocked` : "No blocked tasks"}
                    </Chip>
                    <Chip tone="muted">{stats.remaining} remaining</Chip>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {milestoneTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggleComplete={() =>
                          setStatus(task, task.status === "completed" ? "todo" : "completed")
                        }
                        onToggleBlock={() =>
                          setStatus(task, task.status === "blocked" ? "todo" : "blocked")
                        }
                        onEdit={() => setModal({ mode: "edit", task })}
                        onDelete={() => removeTask(task)}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
                  {milestone
                    ? "No tasks for this milestone yet."
                    : "No tasks for this project yet."}
                  <div className="mt-3">
                    <Button variant="primary" onClick={() => setModal({ mode: "new" })}>
                      <Plus className="h-4 w-4" /> Add task
                    </Button>
                  </div>
                </div>
              )}
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            </Card>

            <MeetingNotes projects={projects} projectId={project.id} />
          </div>

          <div className="flex flex-col gap-5">
            {selectedRec && <ProjectSuggestion rec={selectedRec} isTop={ranked[0]?.project.id === selectedId} />}
            {selectedHealth && <HealthSummary health={selectedHealth} />}
            <DeploymentPanel status={selectedDeployment} />
            <SupabasePanel status={selectedSupabase} />
            <DomainPanel domains={selectedDomains} />
          </div>
        </div>
      )}

      <TaskForm
        open={modal.mode !== "closed"}
        initial={modal.mode === "edit" ? modal.task : null}
        milestoneTitle={milestone ? `${project?.name} — ${milestone.title}` : project?.name}
        pending={pending}
        error={error}
        onSubmit={submitTask}
        onClose={close}
      />
    </div>
  );
}

function ProjectSwitcher({
  projects,
  tasks,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  tasks: Task[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="h-fit p-3">
      <div className="px-2 pb-2 pt-1">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">Projects</h2>
        <p className="mt-1 text-xs text-muted">Select a workspace.</p>
      </div>
      <div className="space-y-1">
        {projects.map((project) => {
          const Icon = projectIcons[project.icon];
          const open = tasks.filter((task) => task.projectId === project.id && task.status !== "completed").length;
          const selected = project.id === selectedId;
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                selected ? "bg-accent/15 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{project.name}</span>
                <span className="block text-xs text-faint">{open} open tasks</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function ProjectSuggestion({ rec, isTop }: { rec: ProjectFocus; isTop: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">Suggestion</h3>
        {isTop && <Badge tone="violet" className="ml-auto">Top pick</Badge>}
      </div>
      {rec.recommendation && (
        <p className="mt-3 border-l-2 border-accent/50 pl-3 text-sm leading-relaxed text-fg">
          {rec.recommendation}
        </p>
      )}
      {rec.reasons[0] && <p className="mt-3 text-xs text-muted">{rec.reasons[0]}</p>}
    </Card>
  );
}

function Chip({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "warn"
      ? "bg-warning/15 text-warning"
      : tone === "ok"
        ? "bg-success/15 text-success"
        : "bg-surface-2 text-muted";
  return <span className={cn("rounded-md px-2 py-0.5 font-medium", cls)}>{children}</span>;
}

function TaskRow({
  task,
  onToggleComplete,
  onToggleBlock,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggleComplete: () => void;
  onToggleBlock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "completed";
  const blocked = task.status === "blocked";
  const ctrl =
    "grid h-6 w-6 place-items-center rounded-md text-faint transition-colors hover:bg-surface hover:text-fg";

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5">
      <button
        aria-label={done ? "Reopen task" : "Complete task"}
        onClick={onToggleComplete}
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
          done
            ? "border-success bg-success/20 text-success"
            : blocked
              ? "border-warning text-warning"
              : task.status === "in_progress"
                ? "border-accent text-accent"
                : "border-line-strong text-transparent hover:border-muted"
        )}
      >
        {done ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : blocked ? (
          <AlertTriangle className="h-3 w-3" />
        ) : task.status === "in_progress" ? (
          <CircleDot className="h-3 w-3" />
        ) : null}
      </button>

      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[task.priority])} />

      <span className={cn("flex-1 text-sm", done ? "text-muted line-through" : "text-fg")}>{task.title}</span>

      {blocked && <Badge tone="content">Blocked</Badge>}
      {task.status === "in_progress" && <Badge tone="violet">In progress</Badge>}

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button aria-label={blocked ? "Unblock" : "Block"} onClick={onToggleBlock} className={ctrl}>
          <Ban className="h-3.5 w-3.5" />
        </button>
        <button aria-label="Edit task" onClick={onEdit} className={ctrl}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button aria-label="Delete task" onClick={onDelete} className={cn(ctrl, "hover:text-danger")}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
