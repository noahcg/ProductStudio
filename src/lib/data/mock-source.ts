import type {
  Decision,
  DecisionInput,
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
 * Mock data source — the local typed fixtures from Phase 2.1/2.2. Used as the
 * development fixture and as the fallback when Supabase isn't available.
 */
export const mockSource: DataSource = {
  kind: "mock",
  async projects() {
    return projects;
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
    const updated: Task = { ...tasks[i], ...fromTaskInput(input), id };
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
  return {
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    title: input.title,
    description: input.description?.trim() || undefined,
    status: input.status,
    priority: input.priority,
    targetDate: input.targetDate || undefined,
    completedAt: input.status === "completed" ? studioNow().toISOString() : undefined,
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
