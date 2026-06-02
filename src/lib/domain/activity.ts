import type { ActivityId, ProjectId, IntegrationKey } from "./ids";

export type ActivityKind = "commit" | "issue" | "deploy" | "domain" | "infra";

/**
 * A point-in-time event in a project's history. Owned by a project
 * (`projectId` absent = studio/infra-wide). `integration` records which
 * external service the event came from — provenance, not ownership.
 */
export interface Activity {
  id: ActivityId;
  projectId?: ProjectId;
  integration?: IntegrationKey;
  kind: ActivityKind;
  title: string;
  whenIso: string;
  ok?: boolean;
}
