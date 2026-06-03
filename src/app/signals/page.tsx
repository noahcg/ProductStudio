import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import {
  getSignals,
  getIntegrations,
  getActivity,
  getAlerts,
  getProjectMap,
  getGeneratedSignals,
} from "@/lib/data";
import { Card, CardHeader, Badge, PageHeading, StatusDot, LinkButton } from "@/components/ui";
import { integrationIcons, activityIcons } from "@/components/icons";
import { relativeTime, cn } from "@/lib/utils";
import { severityMeta, SeverityBadge } from "@/components/signals/severity";

export default async function SignalsPage() {
  const [signals, integrations, activity, alerts, projectMap, generated] = await Promise.all([
    getSignals(),
    getIntegrations(),
    getActivity(),
    getAlerts(),
    getProjectMap(),
    getGeneratedSignals(),
  ]);
  const needsAttention = generated.filter((s) => s.severity === "warning" || s.severity === "critical").length;

  return (
    <div>
      <PageHeading
        title="Signals"
        subtitle="Operational signals generated from your own data, plus infrastructure health."
        right={
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted">
            <StatusDot tone={needsAttention === 0 ? "ok" : "warn"} />
            {needsAttention === 0 ? "Nothing needs attention" : `${needsAttention} need attention`}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          {/* Generated operational signals (Signals Engine) */}
          <Card>
            <CardHeader
              title="Generated signals"
              action={<span className="text-xs text-muted">{generated.length} observation{generated.length === 1 ? "" : "s"}</span>}
            />
            {generated.length > 0 ? (
              <ul className="space-y-2 p-5 pt-3">
                {generated.map((s) => {
                  const project = s.projectId ? projectMap.get(s.projectId) : undefined;
                  return (
                    <li key={s.id} className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                      <div className="flex items-start gap-3">
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severityMeta[s.severity].dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-fg">{s.title}</span>
                            <SeverityBadge severity={s.severity} />
                            <span className="text-[11px] text-faint">· {project?.name ?? "Studio"}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted">{s.description}</p>
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-faint">
                            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                            {s.recommendation}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-8 text-center text-sm text-muted">No operational signals — everything looks clear.</p>
            )}
          </Card>

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
