/**
 * Product Studio data layer (repository seam).
 *
 * Every screen reads the studio's data through these async accessors rather
 * than importing raw arrays. Today they resolve local typed mock fixtures; the
 * async signature is deliberate so a future phase can swap the implementation
 * for a real database without touching any caller.
 *
 * Phase 2.1: mock-only. No Supabase, no network, no integrations.
 *
 * Note for callers: this module is the *server-facing* read API. Client
 * components should import pure fixtures/helpers directly (e.g.
 * `@/lib/data/focus`, `@/lib/recommend`) and receive data via props, so the
 * eventual DB-backed implementation never leaks into the client bundle.
 */
import type {
  Project,
  Focus,
  Decision,
  RoadmapItem,
  Signal,
  Integration,
  ActivityItem,
  Alert,
  Expense,
  SpendTrendPoint,
  Spend,
  Profile,
  WeeklySummary,
  StudioStats,
} from "../types";

import { projects } from "./projects";
import { focus } from "./focus";
import { decisions } from "./decisions";
import { roadmap } from "./roadmap";
import { signals, integrations } from "./signals";
import { activity } from "./activity";
import { alerts } from "./alerts";
import { spendCategories, spendTotal, expenses, spendTrend } from "./spend";
import { profile, weeklySummary } from "./profile";

// ---- Projects ----

export async function getProjects(): Promise<Project[]> {
  return projects;
}

export async function getProject(id?: string): Promise<Project | undefined> {
  return projects.find((p) => p.id === id);
}

/** Convenience map for screens that resolve many project references at once. */
export async function getProjectMap(): Promise<Map<string, Project>> {
  return new Map(projects.map((p) => [p.id, p]));
}

// ---- Focus ----

export async function getFocus(): Promise<Focus> {
  return focus;
}

// ---- Decisions ----

export async function getDecisions(): Promise<Decision[]> {
  return decisions;
}

// ---- Roadmap ----

export async function getRoadmap(): Promise<RoadmapItem[]> {
  return roadmap;
}

// ---- Signals / integrations / activity / alerts ----

export async function getSignals(): Promise<Signal[]> {
  return signals;
}

export async function getIntegrations(): Promise<Integration[]> {
  return integrations;
}

export async function getActivity(): Promise<ActivityItem[]> {
  return activity;
}

export async function getAlerts(): Promise<Alert[]> {
  return alerts;
}

// ---- Money ----

export async function getSpend(): Promise<Spend> {
  return { categories: spendCategories, total: spendTotal };
}

export async function getExpenses(): Promise<Expense[]> {
  return expenses;
}

export async function getSpendTrend(): Promise<SpendTrendPoint[]> {
  return spendTrend;
}

// ---- Profile / studio summary ----

export async function getProfile(): Promise<Profile> {
  return profile;
}

export async function getWeeklySummary(): Promise<WeeklySummary> {
  return weeklySummary;
}

export async function getStudioStats(): Promise<StudioStats> {
  return {
    projects: projects.length,
    active: projects.filter((p) => p.status === "Active").length,
    needsAttention: alerts.filter((a) => a.kind === "stale" || a.kind === "blocker").length,
    monthlySpend: spendTotal,
  };
}
