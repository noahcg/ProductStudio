import type {
  Project,
  ProjectInput,
  Product,
  ProductInput,
  Milestone,
  Task,
  TaskInput,
  TaskStatus,
  RoadmapItem,
  RoadmapInput,
  RoadmapPlacement,
  Decision,
  DecisionInput,
  Activity,
  Signal,
  Integration,
  Expense,
  Domain,
  SslStatus,
  SpendTrendPoint,
} from "../domain";
import { getSupabase } from "@/lib/supabase/server";
import { localSource } from "./local-source";
import { mockSource } from "./mock-source";
import { supabaseSource } from "./supabase-source";

export interface DomainMonitoringUpdate {
  projectId: string;
  name: string;
  registrar: string;
  expiresAt?: string;
  autoRenew?: boolean;
  sslStatus: SslStatus;
  lastCheckedAt: string;
}

/**
 * Low-level data source: returns ready-mapped domain entities. Two
 * implementations — `localSource` (persistent JSON), `mockSource` (an
 * in-memory development store), and `supabaseSource` (database). The public repository in `index.ts`
 * composes/derives everything else (focus view, spend aggregates, studio stats)
 * on top of these.
 */
export interface DataSource {
  readonly kind: "local" | "mock" | "supabase";
  projects(): Promise<Project[]>;
  products(): Promise<Product[]>;
  milestones(): Promise<Milestone[]>;
  tasks(): Promise<Task[]>;
  roadmap(): Promise<RoadmapItem[]>;
  decisions(): Promise<Decision[]>;
  activity(): Promise<Activity[]>;
  signals(): Promise<Signal[]>;
  integrations(): Promise<Integration[]>;
  expenses(): Promise<Expense[]>;
  domains(): Promise<Domain[]>;
  upsertDomainMonitoring(updates: DomainMonitoringUpdate[]): Promise<void>;
  spendTrend(): Promise<SpendTrendPoint[]>;

  // Writes (Projects / portfolio).
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  createProject(input: ProjectInput): Promise<Project>;
  updateProject(id: string, input: ProjectInput): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Writes (Decisions / product memory).
  createDecision(input: DecisionInput): Promise<Decision>;
  updateDecision(id: string, input: DecisionInput): Promise<Decision>;
  deleteDecision(id: string): Promise<void>;

  // Writes (Roadmap planning).
  createRoadmapItem(input: RoadmapInput): Promise<RoadmapItem>;
  updateRoadmapItem(id: string, input: RoadmapInput): Promise<RoadmapItem>;
  deleteRoadmapItem(id: string): Promise<void>;
  /** Apply column/order changes from move & reorder operations. */
  setRoadmapPlacement(placements: RoadmapPlacement[]): Promise<void>;

  // Writes (Tasks / execution).
  createTask(input: TaskInput): Promise<Task>;
  updateTask(id: string, input: TaskInput): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  /** Quick status change (complete / reopen / block); manages completed_at. */
  setTaskStatus(id: string, status: TaskStatus): Promise<Task>;
}

/** Choose the active source: local JSON by default, Supabase when configured. */
export function activeSource(): DataSource {
  if (process.env.DATA_SOURCE === "mock") return mockSource;
  if (process.env.DATA_SOURCE === "local") return localSource;
  const client = getSupabase();
  if (!client) return localSource;
  return supabaseSource(client);
}

/**
 * Run a computation against the active source, gracefully falling back to local
 * if a database call fails (misconfig, network, unseeded). This keeps the UI
 * rendering rather than throwing.
 */
export async function withSource<T>(fn: (s: DataSource) => Promise<T>): Promise<T> {
  const src = activeSource();
  if (src.kind !== "supabase") return fn(src);
  try {
    return await fn(src);
  } catch (err) {
    console.warn(
      "[data] Supabase fetch failed; falling back to local data.",
      (err as Error)?.message ?? err
    );
    return fn(localSource);
  }
}
