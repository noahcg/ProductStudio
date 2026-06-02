import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import { getSignals, getIntegrations, getActivity, getAlerts, getProjectMap } from "@/lib/data";
import { Card, CardHeader, Badge, PageHeading, StatusDot, LinkButton } from "@/components/ui";
import { integrationIcons, activityIcons } from "@/components/icons";
import { relativeTime, cn } from "@/lib/utils";

export default async function SignalsPage() {
  const [signals, integrations, activity, alerts, projectMap] = await Promise.all([
    getSignals(),
    getIntegrations(),
    getActivity(),
    getAlerts(),
    getProjectMap(),
  ]);
  const allOk = signals.every((s) => s.level === "ok");
  const warnings = signals.filter((s) => s.level !== "ok").length;

  return (
    <div>
      <PageHeading
        title="Signals"
        subtitle="Infrastructure health, integrations, and operational alerts in one place."
        right={
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted">
            <StatusDot tone={allOk ? "ok" : "warn"} />
            {allOk ? "All systems operational" : `${warnings} need attention`}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          {/* Service health */}
          <Card>
            <CardHeader title="Service health" />
            <ul className="divide-y divide-line px-5 py-2">
              {signals.map((signal) => {
                const Icon = integrationIcons[signal.integration];
                return (
                  <li key={signal.id} className="flex items-center gap-3 py-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-fg">{signal.service}</div>
                      <div className="text-xs text-muted">{signal.detail}</div>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        signal.level === "ok" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      )}
                    >
                      {signal.level === "ok" ? (
                        <>
                          <Check className="h-3 w-3" strokeWidth={3} /> Operational
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3" /> Watch
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Activity stream */}
          <Card>
            <CardHeader title="Activity stream" />
            <ul className="px-5 py-3">
              {activity.map((item) => {
                const Icon = activityIcons[item.kind];
                const project = item.projectId ? projectMap.get(item.projectId) : undefined;
                return (
                  <li key={item.id} className="flex gap-3 py-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 border-l border-line pl-3">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-fg">
                        {item.title}
                        {item.ok && <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />}
                      </div>
                      <div className="text-xs text-muted">
                        {project ? project.name : "System"} · {relativeTime(item.whenIso)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* Sidebar: integrations + alerts */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Integrations" />
            <ul className="space-y-2 p-5 pt-3">
              {integrations.map((it) => {
                const Icon = integrationIcons[it.key];
                return (
                  <li key={it.key} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-fg">{it.name}</span>
                    <Badge tone={it.connected ? "high" : "neutral"}>
                      {it.connected ? "Connected" : "Off"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Open alerts" />
            <ul className="space-y-2 p-5 pt-3">
              {alerts.map((a) => (
                <li key={a.id} className="rounded-xl border border-warning/25 bg-warning/5 px-3.5 py-3">
                  <div className="text-sm font-semibold text-fg">{a.title}</div>
                  <div className="text-xs text-muted">{a.detail}</div>
                  {a.meta && <div className="mt-0.5 text-xs text-faint">{a.meta}</div>}
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-3">
              <LinkButton href="/" className="text-sm">
                Back to Studio <ArrowRight className="h-3.5 w-3.5" />
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
