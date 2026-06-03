import { vercelToken, vercelTeamId } from "./config";
import type { DeploymentMeta, DeploymentSnapshot, DeploymentState, DeploymentEnvironment } from "./types";

/**
 * Live Vercel REST client (metadata only — no source code, no build logs, no
 * environment variable values, no secrets).
 *
 * Used when VERCEL_ACCESS_TOKEN is configured. Reads recent deployment metadata
 * for a Vercel project. Failures degrade gracefully (the snapshot is returned
 * with `error` set), surfaced as a signal upstream.
 *
 * API: https://vercel.com/docs/rest-api/endpoints/deployments
 */
const API = "https://api.vercel.com";

interface VercelDeployment {
  uid: string;
  name: string;
  url?: string;
  created: number; // epoch ms
  ready?: number; // epoch ms (ready timestamp)
  buildingAt?: number; // epoch ms
  state?: string; // READY | ERROR | BUILDING | QUEUED | CANCELED | INITIALIZING
  readyState?: string; // legacy field, same vocabulary
  target?: string | null; // "production" | "staging" | null (preview)
}

/** Map Vercel's deployment state vocabulary into Product Studio's types. */
export function mapDeploymentState(raw: string | undefined): DeploymentState {
  switch ((raw ?? "").toUpperCase()) {
    case "READY":
      return "ready";
    case "ERROR":
      return "failed";
    case "BUILDING":
    case "INITIALIZING":
      return "building";
    case "QUEUED":
      return "queued";
    case "CANCELED":
      return "canceled";
    default:
      return "unknown";
  }
}

async function vc<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Cache for a few minutes to respect rate limits.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Vercel ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

export async function liveDeploymentSnapshot(vercelProject: string): Promise<DeploymentSnapshot> {
  const token = vercelToken();
  if (!token) return { vercelProject, connected: false, state: "unknown", recent: [], error: "No token" };

  const team = vercelTeamId();
  const teamQ = team ? `&teamId=${encodeURIComponent(team)}` : "";

  try {
    const data = await vc<{ deployments: VercelDeployment[] }>(
      `/v6/deployments?app=${encodeURIComponent(vercelProject)}&limit=10${teamQ}`,
      token
    );

    const recent: DeploymentMeta[] = (data.deployments ?? []).map((d) => {
      const env: DeploymentEnvironment = d.target === "production" ? "production" : "preview";
      const durationSeconds =
        d.ready && d.buildingAt ? Math.max(0, Math.round((d.ready - d.buildingAt) / 1000)) : undefined;
      return {
        state: mapDeploymentState(d.state ?? d.readyState),
        environment: env,
        createdIso: new Date(d.created).toISOString(),
        durationSeconds,
        url: d.url ? `https://${d.url}` : undefined,
      };
    });

    return {
      vercelProject,
      connected: true,
      state: recent[0]?.state ?? "unknown",
      recent,
    };
  } catch (err) {
    return {
      vercelProject,
      connected: false,
      state: "unknown",
      recent: [],
      error: (err as Error)?.message ?? "Vercel request failed",
    };
  }
}
