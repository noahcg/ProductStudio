"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CircleDot,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Settings,
} from "lucide-react";
import type { Task, TaskInput, TaskStatus, Product, ProductInput, Project, ProjectInput, Milestone, Domain } from "@/lib/domain";
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
import { ProjectForm } from "@/components/projects/project-form";
import { ProductForm } from "@/components/products/product-form";
import { TaskCalendar } from "./task-calendar";
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
import {
  createProjectAction,
  createProductAction,
  updateProjectAction,
  deleteProjectAction,
} from "@/app/projects/actions";

type OptimisticAction =
  | { type: "add"; task: Task }
  | { type: "update"; task: Task }
  | { type: "remove"; id: string };

type TaskModal = { mode: "closed" } | { mode: "new"; date?: string } | { mode: "edit"; task: Task };
type ProjectModal = { mode: "closed" } | { mode: "new" } | { mode: "edit"; project: Project };

export function FocusBoard({
  products,
  projects,
  ranked,
  milestones,
  tasks,
  health,
  domains,
  vercel,
  supabase,
}: {
  products: Product[];
  projects: Project[];
  ranked: ProjectFocus[];
  milestones: Milestone[];
  tasks: Task[];
  health: ProjectHealth[];
  domains: Domain[];
  vercel: Record<string, VercelProjectStatus>;
  supabase: Record<string, SupabaseProjectStatus>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [localProducts, setLocalProducts] = useState(products);
  const [localProjects, setLocalProjects] = useState(projects);
  const [selectedProductId, setSelectedProductId] = useState(params.get("product") ?? projects[0]?.productId ?? products[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(params.get("project") ?? projects[0]?.id ?? "");
  const [taskModal, setTaskModal] = useState<TaskModal>({ mode: "closed" });
  const [projectModal, setProjectModal] = useState<ProjectModal>({ mode: "closed" });
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
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

  const projectsForProduct = localProjects.filter((p) => p.productId === selectedProductId);
  const selectedProduct = localProducts.find((p) => p.id === selectedProductId);
  const project = projectsForProduct.find((p) => p.id === selectedId) ?? projectsForProduct[0];
  const effectiveSelectedId = project?.id ?? selectedId;
  const milestone =
    milestones.find((m) => m.projectId === effectiveSelectedId && m.status === "active") ??
    milestones.find((m) => m.projectId === effectiveSelectedId);
  const goalTitle = milestone?.title ?? project?.nextMilestone ?? "";
  const goalDuplicatesProject = Boolean(project && sameLabel(goalTitle, project.name));
  const projectTasks = optimistic.filter((t) => t.projectId === effectiveSelectedId);
  const stats = taskStats(projectTasks);
  const selectedHealth = health.find((h) => h.project.id === effectiveSelectedId);
  const selectedDomains = domains.filter((d) => d.projectId === effectiveSelectedId);
  const selectedDeployment = vercel[effectiveSelectedId];
  const selectedSupabase = supabase[effectiveSelectedId];
  const selectedRec = ranked.find((r) => r.project.id === effectiveSelectedId);

  function close() {
    setTaskModal({ mode: "closed" });
    setError(null);
  }

  function submitTask(fields: Omit<TaskInput, "projectId" | "milestoneId">) {
    if (!project) return;
    setError(null);
    const editing = taskModal.mode === "edit" ? taskModal.task : null;
    const input: TaskInput = {
      projectId: editing?.projectId ?? project.id,
      milestoneId: editing ? editing.milestoneId : milestone?.id,
      ...fields,
    };
    startTransition(async () => {
      if (editing) {
        applyOptimistic({ type: "update", task: { ...editing, ...input } });
        const res = await updateTaskAction(editing.id, input);
        if (!res.ok) return setError(res.error);
      } else {
        applyOptimistic({
          type: "add",
          task: { id: `optimistic-${Date.now()}`, createdAt: new Date().toISOString(), ...input },
        });
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

  function submitProject(input: ProjectInput) {
    setProjectError(null);
    const editing = projectModal.mode === "edit" ? projectModal.project : null;
    startTransition(async () => {
      if (editing) {
        setLocalProjects((state) =>
          state.map((p) => (p.id === editing.id ? { ...p, ...input } : p))
        );
        const res = await updateProjectAction(editing.id, input);
        if (!res.ok) return setProjectError(res.error);
        setSelectedId(editing.id);
      } else {
        const res = await createProjectAction({ ...input, productId: selectedProductId });
        if (!res.ok) return setProjectError(res.error);
        if (res.projectId) setSelectedId(res.projectId);
      }
      setProjectModal({ mode: "closed" });
      router.refresh();
    });
  }

  function submitProduct(input: ProductInput) {
    setProjectError(null);
    startTransition(async () => {
      const res = await createProductAction(input);
      if (!res.ok) return setProjectError(res.error);
      if (res.projectId) {
        setLocalProducts((state) => [...state, { id: res.projectId!, name: input.name.trim() }]);
        setSelectedProductId(res.projectId);
        setSelectedId("");
      }
      setProductModalOpen(false);
      router.refresh();
    });
  }

  function selectProduct(id: string) {
    setSelectedProductId(id);
    setSelectedId(localProjects.find((project) => project.productId === id)?.id ?? "");
  }

  function removeProject() {
    if (!project) return;
    if (!confirm(`Delete “${project.name}” and all of its tasks, goals, and notes?`)) return;
    const nextProject = localProjects.find((p) => p.id !== project.id);
    startTransition(async () => {
      const res = await deleteProjectAction(project.id);
      if (!res.ok) return setProjectError(res.error);
      setLocalProjects((state) => state.filter((p) => p.id !== project.id));
      setSelectedId(nextProject?.id ?? "");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeading title="Products" subtitle="Organize your products, then open a project to manage its tasks and operational context." />

      {localProducts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          <p>No products yet. Create a product, then add projects inside it.</p>
          <Button className="mt-4" variant="primary" onClick={() => setProductModalOpen(true)}>
            <Plus className="h-4 w-4" /> Create product
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <ProjectSwitcher
            products={localProducts}
            projects={localProjects}
            tasks={optimistic}
            selectedId={effectiveSelectedId}
            selectedProductId={selectedProductId}
            onSelect={setSelectedId}
            onSelectProduct={selectProduct}
            onNew={() => setProjectModal({ mode: "new" })}
            onNewProduct={() => setProductModalOpen(true)}
          />

          {!project ? (
            <Card className="flex min-h-72 flex-col items-center justify-center p-10 text-center">
              <p className="text-lg font-semibold text-fg">{selectedProduct?.name ?? "This product"} has no projects yet.</p>
              <p className="mt-2 text-sm text-muted">Create a project to begin adding tasks.</p>
              <Button className="mt-5" variant="primary" onClick={() => setProjectModal({ mode: "new" })}>
                <Plus className="h-4 w-4" /> Create project
              </Button>
            </Card>
          ) : <>
          <div className="flex flex-col gap-5">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone="high">{milestone ? `${milestone.priority} Priority` : "No milestone"}</Badge>
                    <span className="text-xs text-muted">{project.status}</span>
                  </div>
                  <p className="text-sm font-medium text-muted">{selectedProduct?.name}</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg">{project.name}</h2>
                  {!goalDuplicatesProject && (
                    <p className="mt-1 text-lg font-semibold text-fg">{goalTitle || "No current goal"}</p>
                  )}
                  {!goalDuplicatesProject && milestone?.summary && (
                    <p className="mt-1 max-w-lg text-sm text-muted">{milestone.summary}</p>
                  )}
                </div>
                {milestone ? (
                  <ProgressRing value={stats.total ? stats.progress : milestone.progress} size={104} color="var(--success)" />
                ) : (
                  <Button variant="primary" onClick={() => setProjectModal({ mode: "edit", project })}>
                    Set current goal
                  </Button>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Tasks</h3>
                <Button variant="subtle" className="text-xs" onClick={() => setTaskModal({ mode: "new" })}>
                  <Plus className="h-3.5 w-3.5" /> Add task
                </Button>
              </div>

              {projectTasks.length > 0 ? (
                <>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-fg">
                      {stats.completed} / {stats.total} tasks complete
                    </span>
                    <Chip tone="muted">{stats.remaining} remaining</Chip>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {projectTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggleComplete={() =>
                          setStatus(task, task.status === "completed" ? "todo" : "completed")
                        }
                        onToggleProgress={() =>
                          setStatus(task, task.status === "in_progress" ? "todo" : "in_progress")
                        }
                        onEdit={() => setTaskModal({ mode: "edit", task })}
                        onDelete={() => removeTask(task)}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
                  No tasks for this project yet.
                  <div className="mt-3">
                    <Button variant="primary" onClick={() => setTaskModal({ mode: "new" })}>
                      <Plus className="h-4 w-4" /> Add task
                    </Button>
                  </div>
                </div>
              )}
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            </Card>

            <TaskCalendar tasks={optimistic} projects={localProjects} projectId={effectiveSelectedId}
              onEdit={(task) => { setError(null); setTaskModal({ mode: "edit", task }); }}
              onAdd={(date) => { setError(null); setTaskModal({ mode: "new", date }); }} />
            <MeetingNotes projects={localProjects} projectId={project.id} />
          </div>

          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-accent" />
                <h3 className="text-[15px] font-semibold tracking-tight text-fg">Project details</h3>
              </div>
              <dl className="mt-4 space-y-2.5 text-xs">
                <Row label="Status">{project.status}</Row>
                {!goalDuplicatesProject && <Row label="Current goal">{goalTitle || "Not set yet"}</Row>}
                <Row label="Repo">{project.repo ?? "Not connected"}</Row>
                <Row label="Domain">{project.domain ?? "Not set"}</Row>
              </dl>
              {projectError && <p className="mt-3 text-xs text-danger">{projectError}</p>}
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Button
                  variant="subtle"
                  className="flex-1 text-xs"
                  onClick={() => setProjectModal({ mode: "edit", project })}
                >
                  Edit
                </Button>
                <Button variant="ghost" className="text-xs text-danger hover:text-danger" onClick={removeProject}>
                  Delete
                </Button>
              </div>
            </Card>

            {selectedRec && <ProjectSuggestion rec={selectedRec} isTop={ranked[0]?.project.id === effectiveSelectedId} />}
            {selectedHealth && <HealthSummary health={selectedHealth} />}
            <DeploymentPanel projectId={effectiveSelectedId} status={selectedDeployment} />
            <SupabasePanel projectId={effectiveSelectedId} status={selectedSupabase} />
            <DomainPanel domains={selectedDomains} projectId={effectiveSelectedId} />
          </div>
          </>}
        </div>
      )}

      <TaskForm
        open={taskModal.mode !== "closed"}
        initial={taskModal.mode === "edit" ? taskModal.task : null}
        initialDate={taskModal.mode === "new" ? taskModal.date : undefined}
        milestoneTitle={taskModal.mode === "edit" ? localProjects.find((p) => p.id === taskModal.task.projectId)?.name : goalDuplicatesProject ? project?.name : milestone ? `${project?.name} — ${milestone.title}` : project?.name}
        pending={pending}
        error={error}
        onSubmit={submitTask}
        onClose={close}
      />
      <ProjectForm
        open={projectModal.mode !== "closed"}
        initial={projectModal.mode === "edit" ? projectModal.project : null}
        productId={selectedProductId}
        pending={pending}
        error={projectError}
        onSubmit={submitProject}
        onClose={() => {
          setProjectModal({ mode: "closed" });
          setProjectError(null);
        }}
      />
      <ProductForm
        open={productModalOpen}
        pending={pending}
        error={projectError}
        onSubmit={submitProduct}
        onClose={() => { setProductModalOpen(false); setProjectError(null); }}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-faint">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-muted">{children}</dd>
    </div>
  );
}

function sameLabel(a: string | undefined, b: string | undefined) {
  return Boolean(a?.trim() && b?.trim() && a.trim().localeCompare(b.trim(), undefined, { sensitivity: "accent" }) === 0);
}

function ProjectSwitcher({
  products,
  projects,
  tasks,
  selectedId,
  selectedProductId,
  onSelect,
  onSelectProduct,
  onNew,
  onNewProduct,
}: {
  products: Product[];
  projects: Project[];
  tasks: Task[];
  selectedId: string;
  selectedProductId: string;
  onSelect: (id: string) => void;
  onSelectProduct: (id: string) => void;
  onNew: () => void;
  onNewProduct: () => void;
}) {
  return (
    <Card className="h-fit p-3">
      <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">Products</h2>
          <p className="mt-1 text-xs text-muted">Projects live inside products.</p>
        </div>
        <Button variant="subtle" className="h-8 px-2 text-xs" onClick={onNewProduct} aria-label="Create product">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1">
        {products.map((product) => {
          const productProjects = projects.filter((project) => project.productId === product.id);
          const selectedProduct = product.id === selectedProductId;
          return <div key={product.id} className="rounded-lg">
            <button onClick={() => onSelectProduct(product.id)} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors", selectedProduct ? "bg-accent/15 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg")}>
              <span className="truncate text-sm font-semibold">{product.name}</span>
              <span className="ml-2 shrink-0 text-xs text-faint">{productProjects.length} {productProjects.length === 1 ? "project" : "projects"}</span>
            </button>
            {selectedProduct && <div className="ml-3 mt-1 space-y-1 border-l border-line pl-2">
              {productProjects.map((project) => {
                const Icon = projectIcons[project.icon];
                const open = tasks.filter((task) => task.projectId === project.id && task.status !== "completed").length;
                const selected = project.id === selectedId;
                return <button key={project.id} onClick={() => onSelect(project.id)} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors", selected ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg")}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{project.name}</span><span className="block text-xs text-faint">{open} open tasks</span></span>
                </button>;
              })}
              <button onClick={onNew} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-accent hover:bg-surface-2"><Plus className="h-3.5 w-3.5" /> New project</button>
            </div>}
          </div>;
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
  onToggleProgress,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggleComplete: () => void;
  onToggleProgress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = task.status === "completed";
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
            : task.status === "in_progress"
                ? "border-accent text-accent"
                : "border-line-strong text-transparent hover:border-muted"
        )}
      >
        {done ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : task.status === "in_progress" ? (
          <CircleDot className="h-3 w-3" />
        ) : null}
      </button>

      <span className={cn("min-w-0 flex-1 text-sm", done ? "text-muted line-through" : "text-fg")}>
        {task.title}
        {task.scheduledDate && <span className="mt-0.5 block text-xs text-muted">{task.scheduledDate}{task.scheduledTime ? ` · ${task.scheduledTime}` : " · All day"}</span>}
        {task.source?.label && (
          <span className="mt-0.5 block truncate text-xs text-faint">{task.source.label}</span>
        )}
      </span>

      {task.status === "in_progress" && <Badge tone="violet">In progress</Badge>}

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button aria-label="Toggle in progress" onClick={onToggleProgress} className={ctrl}>
          <CircleDot className="h-3.5 w-3.5" />
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
