import { supabaseToken } from "./config";
import type { SupabaseSnapshot, SupabaseProjectState, UsageMetric } from "./types";

/**
 * Live Supabase Management API client (metadata only — no table contents, no
 * user data, no passwords, no secrets, no customer information).
 *
 * Used when SUPABASE_ACCESS_TOKEN is configured. Reads project status and (best
 * effort) usage metrics. Failures degrade gracefully (the snapshot is returned
 * with `error` set), surfaced as a signal upstream.
 *
 * API: https://supabase.com/docs/reference/api
 */
const API = "https://api.supabase.com";

interface SbProject {
  id: string;
  ref?: string;
  name: string;
  status?: string;
}

/** Map Supabase's project status vocabulary into Product Studio's states. */
export function mapProjectState(raw: string | undefined): SupabaseProjectState {
  switch ((raw ?? "").toUpperCase()) {
    case "ACTIVE_HEALTHY":
      return "healthy";
    case "ACTIVE_UNHEALTHY":
    case "COMING_UP":
    case "GOING_DOWN":
    case "RESTORING":
    case "UPGRADING":
      return "degraded";
    case "INACTIVE":
    case "PAUSED":
    case "REMOVED":
    case "INIT_FAILED":
    case "RESTORE_FAILED":
      return "unavailable";
    default:
      return "unknown";
  }
}

async function sb<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Cache for a few minutes to respect rate limits.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

/** Best-effort usage read. Returns undefined dimensions when not exposed. */
async function readUsage(
  ref: string,
  token: string
): Promise<Pick<SupabaseSnapshot, "database" | "storage" | "bandwidth">> {
  try {
    // The usage shape varies by plan/endpoint; we read defensively and only
    // surface percentages we can compute. No raw data is retained.
    const u = await sb<Record<string, { usage?: number; limit?: number }>>(
      `/v1/projects/${ref}/usage`,
      token
    );
    const metric = (key: string): UsageMetric | undefined => {
      const m = u?.[key];
      if (!m || !m.limit) return undefined;
      const percent = Math.round(((m.usage ?? 0) / m.limit) * 100);
      return { usage: `${m.usage ?? 0}`, percent };
    };
    return {
      database: metric("db_size") ?? metric("database"),
      storage: metric("storage_size") ?? metric("storage"),
      bandwidth: metric("egress") ?? metric("bandwidth"),
    };
  } catch {
    // Usage not available on this plan/endpoint — status-only monitoring.
    return {};
  }
}

export async function liveSupabaseSnapshot(supabaseProject: string): Promise<SupabaseSnapshot> {
  const token = supabaseToken();
  if (!token)
    return { supabaseProject, connected: false, state: "unknown", error: "No token" };

  try {
    const projects = await sb<SbProject[]>(`/v1/projects`, token);
    const match = projects.find(
      (p) => p.name === supabaseProject || p.ref === supabaseProject || p.id === supabaseProject
    );
    if (!match) {
      return { supabaseProject, connected: false, state: "unknown", error: "Project not found" };
    }

    const state = mapProjectState(match.status);
    // Don't attempt usage for an unavailable project.
    const usage = state === "unavailable" ? {} : await readUsage(match.ref ?? match.id, token);

    return {
      supabaseProject,
      connected: true,
      state,
      ...usage,
    };
  } catch (err) {
    return {
      supabaseProject,
      connected: false,
      state: "unknown",
      error: (err as Error)?.message ?? "Supabase request failed",
    };
  }
}
