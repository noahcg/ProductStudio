import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type {
  Activity,
  Decision,
  DecisionInput,
  Domain,
  Expense,
  Integration,
  Milestone,
  Project,
  ProjectInput,
  Product,
  ProductInput,
  RoadmapInput,
  RoadmapItem,
  RoadmapPlacement,
  Signal,
  SpendTrendPoint,
  Task,
  TaskInput,
  TaskStatus,
} from "../domain";
import { now as studioNow } from "../clock";
import type { DataSource } from "./source";
import type { DomainMonitoringUpdate } from "./source";
import { projects } from "./projects";
import { products } from "./products";
import { milestones } from "./milestones";
import { tasks } from "./tasks";
import { roadmap } from "./roadmap";
import { decisions } from "./decisions";
import { activity } from "./activity";
import { signals, integrations } from "./signals";
import { expenses, spendTrend } from "./spend";
import { domains } from "./domains";

interface LocalStore {
  version: 3;
  products: Product[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  roadmap: RoadmapItem[];
  decisions: Decision[];
  activity: Activity[];
  signals: Signal[];
  integrations: Integration[];
  expenses: Expense[];
  domains: Domain[];
  spendTrend: SpendTrendPoint[];
}

// Web development keeps its store in the project as before. The packaged
// desktop shell injects PRODUCT_STUDIO_DATA_DIR so its data survives app updates
// and never attempts to write inside the read-only application bundle.
const configuredDataDir = process.env.PRODUCT_STUDIO_DATA_DIR?.trim();
const storePath = configuredDataDir
  ? path.join(configuredDataDir, "data.json")
  : path.join(process.cwd(), ".product-studio", "data.json");

function seedStore(): LocalStore {
  return clone({
    version: 3,
    products,
    projects,
    milestones,
    tasks,
    roadmap,
    decisions,
    activity,
    signals,
    integrations,
    expenses,
    domains,
    spendTrend,
  });
}

async function readStore(): Promise<LocalStore> {
  try {
    const text = await readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(text) as LocalStore);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
    const seeded = seedStore();
    await writeStore(seeded);
    return seeded;
  }
}

async function writeStore(store: LocalStore): Promise<void> {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function mutate<T>(fn: (store: LocalStore) => T): Promise<T> {
  const store = await readStore();
  const result = fn(store);
  await writeStore(store);
  return result;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStore(store: LocalStore): LocalStore {
  // Upgrade the former flat portfolio without losing any existing work. Each
  // legacy project becomes the first project inside a product of the same name.
  if (!Array.isArray(store.products)) {
    store.products = store.projects.map((project) => ({ id: project.id, name: project.name, integrations: {} }));
    store.projects = store.projects.map((project) => ({
      ...project,
      productId: project.id,
      name: project.id === "home-cooked" ? "Launch MVP" : project.name,
      tagline: project.tagline ?? "",
    }));
  }
  store.products = store.products.map((product) => ({ ...product, integrations: product.integrations ?? {} }));
  const projectProductIds = new Map(store.projects.map((project) => [project.id, project.productId]));
  store.roadmap = store.roadmap.map((item) => ({
    ...item,
    productId: item.productId ?? (item.projectId ? projectProductIds.get(item.projectId) : undefined) ?? store.products[0]?.id ?? "",
  }));
  store.version = 3;
  const fallbackDate = studioNow().toISOString();
  store.tasks = store.tasks.map((task) => ({
    ...task,
    status: task.status === "completed" || task.status === "in_progress" ? task.status : "todo",
    createdAt: task.createdAt ?? task.completedAt ?? fallbackDate,
  }));
  return store;
}

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

function cleanIntegrations(input: ProductInput): Product["integrations"] {
  const value = input.integrations ?? {};
  return {
    vercelProject: value.vercelProject?.trim() || undefined,
    vercelTeamSlug: value.vercelTeamSlug?.trim() || undefined,
    supabaseProjectRef: value.supabaseProjectRef?.trim() || undefined,
    cloudflareAccountId: value.cloudflareAccountId?.trim() || undefined,
  };
}

function nextSortOrder(items: { sortOrder: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1;
}

function nextPosition(items: { id: string }[]): number {
  return items.length + 1;
}

function fromTaskInput(input: TaskInput): Omit<Task, "id"> {
  const completedAt = input.status === "completed" ? studioNow().toISOString() : undefined;
  return {
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    title: input.title,
    description: input.description?.trim() || undefined,
    status: input.status,
    scheduledDate: input.scheduledDate || undefined,
    scheduledTime: input.scheduledDate ? input.scheduledTime || undefined : undefined,
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

function fromRoadmapInput(input: RoadmapInput): Omit<RoadmapItem, "id" | "sortOrder"> {
  return {
    productId: input.productId,
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

function fromDecisionInput(input: DecisionInput): Omit<Decision, "id"> {
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

function fromProjectInput(input: ProjectInput): Omit<Project, "id"> {
  return {
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
}

export const localSource: DataSource = {
  kind: "local",

  async projects() {
    return (await readStore()).projects;
  },
  async products() {
    return (await readStore()).products;
  },
  async milestones() {
    return (await readStore()).milestones;
  },
  async tasks() {
    return (await readStore()).tasks;
  },
  async roadmap() {
    return (await readStore()).roadmap;
  },
  async decisions() {
    return (await readStore()).decisions;
  },
  async activity() {
    return (await readStore()).activity;
  },
  async signals() {
    return (await readStore()).signals;
  },
  async integrations() {
    return (await readStore()).integrations;
  },
  async expenses() {
    return (await readStore()).expenses;
  },
  async domains() {
    return (await readStore()).domains;
  },
  async upsertDomainMonitoring(updates: DomainMonitoringUpdate[]) {
    await mutate((store) => {
      for (const update of updates) {
        const index = store.domains.findIndex(
          (domain) => domain.projectId === update.projectId && domain.name.toLowerCase() === update.name.toLowerCase()
        );
        const value: Domain = {
          id: index === -1 ? `domain-${newId("d")}` : store.domains[index].id,
          projectId: update.projectId,
          name: update.name,
          registrar: update.registrar,
          integration: "cloudflare",
          expiresAt: update.expiresAt,
          autoRenew: update.autoRenew,
          sslStatus: update.sslStatus,
          lastCheckedAt: update.lastCheckedAt,
        };
        if (index === -1) store.domains.push(value);
        else store.domains[index] = { ...store.domains[index], ...value };
      }
    });
  },
  async spendTrend() {
    return (await readStore()).spendTrend;
  },

  async createProduct(input: ProductInput) {
    return mutate((store) => {
      const id = uniqueSlug(slugify(input.name), store.products);
      const product: Product = { id, name: input.name.trim(), integrations: cleanIntegrations(input) };
      store.products.push(product);
      return product;
    });
  },
  async updateProduct(id: string, input: ProductInput) {
    return mutate((store) => {
      const index = store.products.findIndex((product) => product.id === id);
      if (index === -1) throw new Error(`Product ${id} not found`);
      const product: Product = { ...store.products[index], name: input.name.trim(), integrations: cleanIntegrations(input) };
      store.products[index] = product;
      return product;
    });
  },
  async createProject(input: ProjectInput) {
    return mutate((store) => {
      if (!store.products.some((product) => product.id === input.productId)) {
        throw new Error("Choose a product before creating a project.");
      }
      const id = uniqueSlug(slugify(input.name), store.projects);
      const project: Project = { id, ...fromProjectInput(input) };
      store.projects.push(project);
      return project;
    });
  },
  async updateProject(id: string, input: ProjectInput) {
    return mutate((store) => {
      const i = store.projects.findIndex((p) => p.id === id);
      if (i === -1) throw new Error(`Project ${id} not found`);
      const previous = store.projects[i];
      const updated: Project = {
        ...previous,
        ...fromProjectInput(input),
        id,
        progress: previous.progress,
        openTasks: previous.openTasks,
        blockers: previous.blockers,
        lastActivityIso: previous.lastActivityIso,
      };
      store.projects[i] = updated;
      return updated;
    });
  },
  async deleteProject(id: string) {
    await mutate((store) => {
      store.projects = store.projects.filter((p) => p.id !== id);
      store.milestones = store.milestones.filter((m) => m.projectId !== id);
      store.tasks = store.tasks.filter((t) => t.projectId !== id);
      store.roadmap = store.roadmap.map((item) =>
        item.projectId === id ? { ...item, projectId: undefined, milestoneId: undefined } : item
      );
      store.decisions = store.decisions.filter((d) => d.projectId !== id);
      store.activity = store.activity.filter((a) => a.projectId !== id);
      store.signals = store.signals.filter((s) => s.projectId !== id);
      store.expenses = store.expenses.filter((e) => e.projectId !== id);
      store.domains = store.domains.filter((d) => d.projectId !== id);
    });
  },

  async createDecision(input: DecisionInput) {
    return mutate((store) => {
      const decision: Decision = { id: newId("d"), ...fromDecisionInput(input) };
      store.decisions.push(decision);
      return decision;
    });
  },
  async updateDecision(id: string, input: DecisionInput) {
    return mutate((store) => {
      const i = store.decisions.findIndex((d) => d.id === id);
      if (i === -1) throw new Error(`Decision ${id} not found`);
      const updated: Decision = {
        ...store.decisions[i],
        ...fromDecisionInput(input),
        id,
        options: store.decisions[i].options,
        chosen: store.decisions[i].chosen,
      };
      store.decisions[i] = updated;
      return updated;
    });
  },
  async deleteDecision(id: string) {
    await mutate((store) => {
      const i = store.decisions.findIndex((d) => d.id === id);
      if (i !== -1) store.decisions.splice(i, 1);
    });
  },

  async createRoadmapItem(input: RoadmapInput) {
    return mutate((store) => {
      const item: RoadmapItem = {
        id: newId("r"),
        sortOrder: nextSortOrder(store.roadmap),
        ...fromRoadmapInput(input),
      };
      store.roadmap.push(item);
      return item;
    });
  },
  async updateRoadmapItem(id: string, input: RoadmapInput) {
    return mutate((store) => {
      const i = store.roadmap.findIndex((r) => r.id === id);
      if (i === -1) throw new Error(`Roadmap item ${id} not found`);
      const updated: RoadmapItem = {
        ...store.roadmap[i],
        ...fromRoadmapInput(input),
        id,
        sortOrder: store.roadmap[i].sortOrder,
        milestoneId: store.roadmap[i].milestoneId,
        tag: store.roadmap[i].tag,
      };
      store.roadmap[i] = updated;
      return updated;
    });
  },
  async deleteRoadmapItem(id: string) {
    await mutate((store) => {
      const i = store.roadmap.findIndex((r) => r.id === id);
      if (i !== -1) store.roadmap.splice(i, 1);
    });
  },
  async setRoadmapPlacement(placements: RoadmapPlacement[]) {
    await mutate((store) => {
      for (const p of placements) {
        const item = store.roadmap.find((r) => r.id === p.id);
        if (item) {
          item.column = p.column;
          item.sortOrder = p.sortOrder;
        }
      }
    });
  },

  async createTask(input: TaskInput) {
    return mutate((store) => {
      const task: Task = { id: newId("t"), ...fromTaskInput(input) };
      store.tasks.splice(nextPosition(store.tasks), 0, task);
      return task;
    });
  },
  async updateTask(id: string, input: TaskInput) {
    return mutate((store) => {
      const i = store.tasks.findIndex((t) => t.id === id);
      if (i === -1) throw new Error(`Task ${id} not found`);
      const updated: Task = { ...store.tasks[i], ...fromTaskInput(input), id, createdAt: store.tasks[i].createdAt };
      store.tasks[i] = updated;
      return updated;
    });
  },
  async deleteTask(id: string) {
    await mutate((store) => {
      const i = store.tasks.findIndex((t) => t.id === id);
      if (i !== -1) store.tasks.splice(i, 1);
    });
  },
  async setTaskStatus(id: string, status: TaskStatus) {
    return mutate((store) => {
      const task = store.tasks.find((t) => t.id === id);
      if (!task) throw new Error(`Task ${id} not found`);
      task.status = status;
      task.completedAt = status === "completed" ? studioNow().toISOString() : undefined;
      return task;
    });
  },
};
