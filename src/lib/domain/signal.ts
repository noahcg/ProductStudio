import type { SignalId, ProjectId, IntegrationKey } from "./ids";

export type SignalLevel = "ok" | "warn" | "down";

/**
 * An operational health signal. `integration` is the reporting service
 * (the source). A signal may be scoped to a project (`projectId`) or be
 * studio/infra-wide when `projectId` is absent.
 */
export interface Signal {
  id: SignalId;
  projectId?: ProjectId;
  integration: IntegrationKey;
  service: string;
  detail: string;
  level: SignalLevel;
}
