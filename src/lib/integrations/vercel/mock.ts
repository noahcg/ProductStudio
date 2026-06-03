import { now as studioNow } from "@/lib/clock";
import type { DeploymentMeta, DeploymentSnapshot, DeploymentState } from "./types";

/**
 * Deterministic mock Vercel data — a dev/demo stand-in for the live API so the
 * integration is usable without a token. NOT real data, and never the source of
 * truth (it only feeds activity/signals/health like the live client would).
 *
 * Crafted against the studio clock (2026-06-07) to exercise the signal rules:
 *  - home-cooked-production     : production ready ~2h ago        → Healthy
 *  - wardrobe-harmony-production: 3 failed deploys in a row       → Critical
 *  - personal-trainer-production: last success ~18d ago, idle     → Watch (no recent success)
 *  - cascade-lounge-production  : production ready ~3d ago        → Healthy
 */
interface MockDeploy {
  state: DeploymentState;
  env: "production" | "preview";
  agoMinutes: number;
  durationSeconds?: number;
}

interface MockProject {
  deploys: MockDeploy[]; // newest first
}

const H = 60;
const D = 24 * 60;

const MOCK: Record<string, MockProject> = {
  "home-cooked-production": {
    deploys: [
      { state: "ready", env: "production", agoMinutes: 2 * H, durationSeconds: 47 },
      { state: "ready", env: "preview", agoMinutes: 6 * H, durationSeconds: 52 },
      { state: "ready", env: "production", agoMinutes: 26 * H, durationSeconds: 44 },
    ],
  },
  "wardrobe-harmony-production": {
    deploys: [
      { state: "failed", env: "production", agoMinutes: 14, durationSeconds: 38 },
      { state: "failed", env: "production", agoMinutes: 90, durationSeconds: 41 },
      { state: "failed", env: "production", agoMinutes: 5 * H, durationSeconds: 36 },
      { state: "ready", env: "production", agoMinutes: 2 * D, durationSeconds: 55 },
    ],
  },
  "personal-trainer-production": {
    deploys: [
      { state: "ready", env: "production", agoMinutes: 18 * D, durationSeconds: 61 },
      { state: "ready", env: "preview", agoMinutes: 22 * D, durationSeconds: 58 },
    ],
  },
  "cascade-lounge-production": {
    deploys: [
      { state: "ready", env: "production", agoMinutes: 3 * D, durationSeconds: 49 },
      { state: "ready", env: "preview", agoMinutes: 4 * D, durationSeconds: 51 },
    ],
  },
};

function isoMinutesAgo(minutes: number): string {
  return new Date(studioNow().getTime() - minutes * 60_000).toISOString();
}

export function mockDeploymentSnapshot(vercelProject: string): DeploymentSnapshot {
  const m = MOCK[vercelProject];
  if (!m) {
    return { vercelProject, connected: true, state: "unknown", recent: [] };
  }
  const recent: DeploymentMeta[] = m.deploys.map((d) => ({
    state: d.state,
    environment: d.env,
    createdIso: isoMinutesAgo(d.agoMinutes),
    durationSeconds: d.durationSeconds,
    url: `https://${vercelProject}-${d.agoMinutes}.vercel.app`,
  }));
  return {
    vercelProject,
    connected: true,
    state: recent[0]?.state ?? "unknown",
    recent,
  };
}
