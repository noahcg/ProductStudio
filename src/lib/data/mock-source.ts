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
};
