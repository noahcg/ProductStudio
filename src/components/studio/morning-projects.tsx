import { ArrowRight, CircleDot, ListTodo } from "lucide-react";
import { getMilestones, getProjects, getProjectHealth, getTasks } from "@/lib/data";
import type { Project, Task } from "@/lib/domain";
import { Card, LinkButton, Progress } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";
import { accentStyles, projectIcons } from "@/components/icons";
import { cn } from "@/lib/utils";

const statusOrder: Record<Task["status"], number> = {
  in_progress: 0,
  todo: 1,
  completed: 3,
};

export async function MorningProjects() {
  const [projects, milestones, tasks, health] = await Promise.all([
    getProjects(),
    getMilestones(),
    getTasks(),
    getProjectHealth(),
  ]);
  const healthById = new Map(health.map((h) => [h.project.id, h]));
  const milestoneByProject = new Map(milestones.map((m) => [m.projectId, m]));

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">Today By Project</h2>
          <p className="mt-1 text-xs text-muted">Open work, grouped where your brain expects it.</p>
        </div>
        <LinkButton href="/projects" className="flex items-center gap-1 text-sm">
          Manage projects <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {projects.map((project) => (
          <ProjectTaskCard
            key={project.id}
            project={project}
            tasks={tasksForProject(tasks, project.id)}
            milestoneTitle={milestoneByProject.get(project.id)?.title ?? project.nextMilestone}
            health={healthById.get(project.id)}
          />
        ))}
      </div>
    </Card>
  );
}

function ProjectTaskCard({
  project,
  tasks,
  milestoneTitle,
  health,
}: {
  project: Project;
  tasks: Task[];
  milestoneTitle: string;
  health?: Awaited<ReturnType<typeof getProjectHealth>>[number];
}) {
  const Icon = projectIcons[project.icon];
  const accent = accentStyles[project.accent];
  const visible = tasks.slice(0, 4);
  const remaining = Math.max(tasks.length - visible.length, 0);

  return (
    <section className="rounded-lg border border-line bg-surface/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 ring-1", accent.ring)}>
            <Icon className="h-4.5 w-4.5 text-fg" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-fg">{project.name}</h3>
            <p className="truncate text-xs text-muted">{milestoneTitle}</p>
          </div>
        </div>
        {health && <HealthBadge score={health.score} status={health.status} showStatus={false} />}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Progress value={project.progress} color={accent.bar} />
        <span className="w-9 text-right text-xs font-medium text-muted">{project.progress}%</span>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.length > 0 ? (
          visible.map((task) => <TaskLine key={task.id} task={task} />)
        ) : (
          <li className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-muted">
            No open tasks.
          </li>
        )}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <ListTodo className="h-3.5 w-3.5" />
          {tasks.length} open{remaining > 0 ? `, ${remaining} more` : ""}
        </span>
        <LinkButton href={`/projects?project=${project.id}`} className="text-xs">
          Open <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </section>
  );
}

function TaskLine({ task }: { task: Task }) {
  const active = task.status === "in_progress";
  return (
    <li className="flex items-start gap-2 rounded-md bg-surface-2/45 px-3 py-2 text-xs">
      <CircleDot className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", active ? "text-accent" : "text-faint")} />
      <span className="min-w-0 flex-1 text-fg">{task.title}</span>
    </li>
  );
}

function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks
    .filter((task) => task.projectId === projectId && task.status !== "completed")
    .sort((a, b) => {
      const byStatus = statusOrder[a.status] - statusOrder[b.status];
      if (byStatus !== 0) return byStatus;
      return a.createdAt.localeCompare(b.createdAt);
    });
}
