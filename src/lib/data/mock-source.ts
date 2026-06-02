import type { Decision, DecisionInput } from "../domain";
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
};

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
