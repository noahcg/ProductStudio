import type { DomainId, ProjectId, IntegrationKey } from "./ids";

export type DomainStatus = "healthy" | "expiring" | "expired";

/**
 * A registered domain owned by a project. First-class entity (previously just
 * a string field on Project). `integration` is the registrar/monitoring
 * service (e.g. Cloudflare) — the source, not the owner.
 */
export interface Domain {
  id: DomainId;
  projectId: ProjectId;
  name: string;
  registrar?: string;
  integration?: IntegrationKey;
  expiresInDays?: number;
  status: DomainStatus;
}
