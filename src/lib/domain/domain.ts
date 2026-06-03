import type { DomainId, ProjectId, IntegrationKey } from "./ids";

export type SslStatus = "healthy" | "expiring" | "invalid" | "missing" | "unknown";

/**
 * A registered domain owned by a project — a business asset Product Studio
 * monitors (not manages). `expiresAt` is the stored fact; "days remaining" is
 * always computed, never stored. `integration` is the registrar/monitoring
 * source (e.g. Cloudflare) — provenance, not ownership.
 */
export interface Domain {
  id: DomainId;
  projectId: ProjectId;
  name: string;
  registrar?: string;
  integration?: IntegrationKey;
  /** ISO date the registration expires (stored fact). */
  expiresAt?: string;
  autoRenew?: boolean;
  sslStatus?: SslStatus;
  notes?: string;
  lastCheckedAt?: string;
}
