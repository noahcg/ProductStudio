import type {
  Decision,
  DecisionInput,
  Project,
  ProjectInput,
  Product,
  ProductInput,
  RoadmapItem,
  RoadmapInput,
  RoadmapPlacement,
  Task,
  TaskInput,
  TaskStatus,
} from "../domain";
import { now as studioNow } from "../clock";
import type { DataSource } from "./source";
import { projects } from "./projects";
import { products } from "./products";
import { milestones } from "./milestones";
import { tasks } from "./tasks";
import { roadmap } from "./roadmap";
import { decisions } from "./decisions";
import { activity } from "./activity";
import { signals } from "./signals";
import { integrations } from "./signals";
import { expenses, spendTrend } from "./spend";
import { domains } from "./domains";

/**
 * In-memory data source used only when DATA_SOURCE=mock is explicitly set.
 */
export const mockSource: DataSource = {
  kind: "mock",
  async projects() {
    return projects;
  },
  async products() {
    return products;
  },
  async milestones() {
    return milestones;
  },
  async tasks() {
    return tasks;
  },
  async roadmap() {
    return roadmap;
  },
  async decisions() {
    return decisions;
  },
  async activity() {
    return activity;
  },
  async signals() {
    return signals;
  },
  async integrations() {
    return integrations;
  },
  async expenses() {
    return expenses;
  },
  async domains() {
    return domains;
  },
  async spendTrend() {
    return spendTrend;
  },

  async createProduct(input: ProductInput) {
    const product: Product = { id: uniqueSlug(slugify(input.name), products), name: input.name.trim() };
    products.push(product);
    return product;
  },
  async createProject(input: ProjectInput) {
    if (!products.some((product) => product.id === input.productId)) {
      throw new Error("Choose a product before creating a project.");
    }
    const id = uniqueSlug(slugify(input.name), projects);
    const project: Project = {
      id,
      productId: input.productId,
      name: input.name,
      tagline: input.tagline?.trim() || "",
      status: input.status ?? "Active",
      progress: 0,
      nextMilestone: input.nextMilestone?.trim() || "",
      openTasks: 0,
      blockers: 0,
      lastActivityIso: studioNow().toISOString(),
      accent: input.accent ?? "blue",
      icon: input.icon ?? "dumbbell",
      repo: input.repo?.trim() || undefined,
      domain: input.domain?.trim() || undefined,
    };
    projects.push(project);
    return project;
  },
  async updateProject(id: string, input: ProjectInput) {
    const i = projects.findIndex((p) => p.id === id);
    if (i === -1) throw new Error(`Project ${id} not found`);
    const previous = projects[i];
    const updated: Project = {
      ...previous,
      name: input.name,
      productId: input.productId,
      tagline: input.tagline?.trim() || "",
      status: input.status ?? "Active",
      nextMilestone: input.nextMilestone?.trim() || "",
      accent: input.accent ?? "blue",
      icon: input.icon ?? "dumbbell",
      repo: input.repo?.trim() || undefined,
      domain: input.domain?.trim() || undefined,
    };
    projects[i] = updated;
    return updated;
  },
  async deleteProject(id: string) {
    removeWhere(projects, (p) => p.id === id);
    removeWhere(milestones, (m) => m.projectId === id);
    removeWhere(tasks, (t) => t.projectId === id);
    removeWhere(roadmap, (r) => r.projectId === id);
    removeWhere(decisions, (d) => d.projectId === id);
    removeWhere(activity, (a) => a.projectId === id);
    removeWhere(signals, (s) => s.projectId === id);
    removeWhere(expenses, (e) => e.projectId === id);
    removeWhere(domains, (d) => d.projectId === id);
  },

  // ---- Writes: mutate the in-memory `decisions` array (ephemeral dev store) ----
  async createDecision(input: DecisionInput) {
    const decision: Decision = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `d-${Date.now()}`,
      ...fromInput(input),
    };
    decisions.push(decision);
    return decision;
  },
  async updateDecision(id: string, input: DecisionInput) {
    const i = decisions.findIndex((d) => d.id === id);
    if (i === -1) throw new Error(`Decision ${id} not found`);
    const updated: Decision = {
      ...decisions[i],
      ...fromInput(input),
      id,
      // preserve legacy display-only fields the form doesn't manage
      options: decisions[i].options,
      chosen: decisions[i].chosen,
    };
    decisions[i] = updated;
    return updated;
  },
  async deleteDecision(id: string) {
    const i = decisions.findIndex((d) => d.id === id);
    if (i !== -1) decisions.splice(i, 1);
  },

  // ---- Writes: roadmap (mutate in-memory `roadmap` array) ----
  async createRoadmapItem(input: RoadmapInput) {
    const item: RoadmapItem = {
      id: newId("r"),
      sortOrder: nextSortOrder(roadmap),
      ...fromRoadmapInput(input),
    };
    roadmap.push(item);
    return item;
  },
  async updateRoadmapItem(id: string, input: RoadmapInput) {
    const i = roadmap.findIndex((r) => r.id === id);
    if (i === -1) throw new Error(`Roadmap item ${id} not found`);
    const updated: RoadmapItem = {
      ...roadmap[i],
      ...fromRoadmapInput(input),
      id,
      sortOrder: roadmap[i].sortOrder,
      milestoneId: roadmap[i].milestoneId,
      tag: roadmap[i].tag,
    };
    roadmap[i] = updated;
    return updated;
  },
  async deleteRoadmapItem(id: string) {
    const i = roadmap.findIndex((r) => r.id === id);
    if (i !== -1) roadmap.splice(i, 1);
  },
  async setRoadmapPlacement(placements: RoadmapPlacement[]) {
    for (const p of placements) {
      const item = roadmap.find((r) => r.id === p.id);
      if (item) {
        item.column = p.column;
        item.sortOrder = p.sortOrder;
      }
    }
  },

  // ---- Writes: tasks (mutate in-memory `tasks` array) ----
  async createTask(input: TaskInput) {
    const task: Task = { id: newId("t"), ...fromTaskInput(input) };
    tasks.push(task);
    return task;
  },
  async updateTask(id: string, input: TaskInput) {
    const i = tasks.findIndex((t) => t.id === id);
    if (i === -1) throw new Error(`Task ${id} not found`);
    const updated: Task = { ...tasks[i], ...fromTaskInput(input), id, createdAt: tasks[i].createdAt };
    tasks[i] = updated;
    return updated;
  },
  async deleteTask(id: string) {
    const i = tasks.findIndex((t) => t.id === id);
    if (i !== -1) tasks.splice(i, 1);
  },
  async setTaskStatus(id: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.status = status;
    task.completedAt = status === "completed" ? studioNow().toISOString() : undefined;
    return task;
  },
};

function newId(prefix: string): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "project";
}

function uniqueSlug(base: string, existing: { id: string }[]): string {
  const taken = new Set(existing.map((item) => item.id));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) {
    const next = `${base}-${i}`;
    if (!taken.has(next)) return next;
  }
}

function removeWhere<T>(items: T[], predicate: (item: T) => boolean) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) items.splice(i, 1);
  }
}

function nextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1;
}

function fromRoadmapInput(input: RoadmapInput): Omit<RoadmapItem, "id" | "sortOrder"> {
  return {
    projectId: input.projectId,
    title: input.title,
    description: input.description?.trim() || undefined,
    column: input.column,
    priority: input.priority,
    status: input.status,
    effort: input.effort,
    targetDate: input.targetDate || undefined,
  };
}

function fromTaskInput(input: TaskInput): Omit<Task, "id"> {
  const completedAt = input.status === "completed" ? studioNow().toISOString() : undefined;
  return {
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    title: input.title,
    description: input.description?.trim() || undefined,
    status: input.status,
    createdAt: studioNow().toISOString(),
    completedAt,
    source: normalizeTaskSource(input),
  };
}

function normalizeTaskSource(input: TaskInput): Task["source"] {
  if (!input.source?.label?.trim()) return undefined;
  return {
    label: input.source.label.trim(),
    type: input.source.type,
    url: input.source.url?.trim() || undefined,
    externalId: input.source.externalId?.trim() || undefined,
    capturedAt: input.source.capturedAt || undefined,
  };
}

function fromInput(input: DecisionInput): Omit<Decision, "id"> {
  return {
    projectId: input.projectId,
    title: input.title,
    status: input.status,
    dateIso: input.dateIso,
    decision: input.decision?.trim() || undefined,
    rationale: input.rationale,
    tradeoffs: input.tradeoffs?.trim() || undefined,
    tags: input.tags,
  };
}
