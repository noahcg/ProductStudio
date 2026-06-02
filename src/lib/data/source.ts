import type {
  Project,
  Milestone,
  Task,
  RoadmapItem,
  Decision,
  Activity,
  Signal,
  Integration,
  Expense,
  Domain,
  SpendTrendPoint,
} from "../domain";
import { getSupabase } from "@/lib/supabase/server";
import { mockSource } from "./mock-source";
import { supabaseSource } from "./supabase-source";

/**
 * Low-level data source: returns ready-mapped domain entities. Two
 * implementations — `mockSource` (local fixtures) and `supabaseSource`
 * (database). The public repository in `index.ts` composes/derives everything
 * else (focus view, spend aggregates, studio stats) on top of these.
 */
export interface DataSource {
  readonly kind: "mock" | "supabase";
  projects(): Promise<Project[]>;
  milestones(): Promise<Milestone[]>;
  tasks(): Promise<Task[]>;
  roadmap(): Promise<RoadmapItem[]>;
  decisions(): Promise<Decision[]>;
  activity(): Promise<Activity[]>;
  signals(): Promise<Signal[]>;
  integrations(): Promise<Integration[]>;
  expenses(): Promise<Expense[]>;
  domains(): Promise<Domain[]>;
  spendTrend(): Promise<SpendTrendPoint[]>;
}

/** Choose the active source: Supabase when configured, else mock. */
export function activeSource(): DataSource {
  if (process.env.DATA_SOURCE === "mock") return mockSource;
  const client = getSupabase();
  if (!client) return mockSource;
  return supabaseSource(client);
}

/**
 * Run a computation against the active source, gracefully falling back to mock
 * if a database call fails (misconfig, network, unseeded). This keeps the UI
 * rendering rather than throwing.
 */
export async function withSource<T>(fn: (s: DataSource) => Promise<T>): Promise<T> {
  const src = activeSource();
  if (src.kind === "mock") return fn(src);
  try {
    return await fn(src);
  } catch (err) {
    console.warn(
      "[data] Supabase fetch failed; falling back to mock fixtures.",
      (err as Error)?.message ?? err
    );
    return fn(mockSource);
  }
}
