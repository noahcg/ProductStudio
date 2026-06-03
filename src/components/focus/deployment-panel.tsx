import { Rocket, CircleCheck, CircleX, Loader, CircleSlash, CircleDashed } from "lucide-react";
import type { VercelProjectStatus, DeploymentState, DeploymentHealth } from "@/lib/integrations/vercel/types";
import { relativeTime, cn } from "@/lib/utils";
import { Card } from "@/components/ui";

const healthTone: Record<DeploymentHealth, string> = {
  Healthy: "text-success",
  Warning: "text-warning",
  Critical: "text-danger",
};

const stateMeta: Record<DeploymentState, { label: string; tone: string; Icon: typeof CircleCheck }> = {
  ready: { label: "Ready", tone: "text-success", Icon: CircleCheck },
  building: { label: "Building", tone: "text-info", Icon: Loader },
  queued: { label: "Queued", tone: "text-info", Icon: CircleDashed },
  canceled: { label: "Canceled", tone: "text-faint", Icon: CircleSlash },
  failed: { label: "Failed", tone: "text-danger", Icon: CircleX },
  unknown: { label: "Unknown", tone: "text-faint", Icon: CircleDashed },
};

export function DeploymentPanel({ status }: { status?: VercelProjectStatus }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-accent" />
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">Deployment</h3>
        {status?.connected && (
          <span className={cn("ml-auto text-xs font-medium", healthTone[status.health])}>{status.health}</span>
        )}
      </div>

      {!status || !status.connected ? (
        <p className="mt-3 text-xs text-muted">
          {status && status.vercelProjects.length > 0
            ? "Deployment status unavailable."
            : "No Vercel project configured."}
        </p>
      ) : (
        <dl className="mt-4 space-y-2.5 text-xs">
          <Row label="Current state">
            <State state={status.state} />
          </Row>
          <Row label="Last successful">
            <span className="text-muted">
              {status.lastReadyIso ? relativeTime(status.lastReadyIso) : "—"}
            </span>
          </Row>
          <Row label="Last failed">
            <span className={cn(status.lastFailedIso ? "text-danger" : "text-muted")}>
              {status.lastFailedIso ? relativeTime(status.lastFailedIso) : "None"}
            </span>
          </Row>
          {status.consecutiveFailures > 1 && (
            <Row label="Failures in a row">
              <span className="text-danger">{status.consecutiveFailures}</span>
            </Row>
          )}
        </dl>
      )}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-faint">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function State({ state }: { state: DeploymentState }) {
  const meta = stateMeta[state];
  return (
    <span className={cn("flex items-center gap-1.5", meta.tone)}>
      <meta.Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}
