import { Globe, ShieldCheck, ShieldAlert, ShieldX, RefreshCw, RefreshCwOff } from "lucide-react";
import type { Domain, SslStatus } from "@/lib/domain";
import { daysRemaining, domainHealth, type DomainHealth } from "@/lib/domains/monitor";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";

const healthTone: Record<DomainHealth, string> = {
  Healthy: "text-success",
  Watch: "text-info",
  Warning: "text-warning",
  Critical: "text-danger",
};

const sslMeta: Record<SslStatus, { label: string; tone: string; Icon: typeof ShieldCheck }> = {
  healthy: { label: "Valid", tone: "text-success", Icon: ShieldCheck },
  expiring: { label: "Expiring", tone: "text-warning", Icon: ShieldAlert },
  invalid: { label: "Invalid", tone: "text-danger", Icon: ShieldX },
  missing: { label: "Missing", tone: "text-danger", Icon: ShieldX },
  unknown: { label: "Unknown", tone: "text-faint", Icon: ShieldAlert },
};

/** Format the computed days-remaining into a human label. */
function expiryLabel(domain: Domain): string {
  const days = daysRemaining(domain);
  if (days == null) return "Expiration unknown";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

export function DomainPanel({ domains }: { domains: Domain[] }) {
  const health = domainHealth(domains);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-accent" />
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">Domains</h3>
        {domains.length > 0 && (
          <span className={cn("ml-auto text-xs font-medium", healthTone[health])}>{health}</span>
        )}
      </div>

      {domains.length === 0 ? (
        <p className="mt-3 text-xs text-muted">No domain on file for this project.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {domains.map((d) => {
            const ssl = sslMeta[d.sslStatus ?? "unknown"];
            return (
              <li key={d.id} className="rounded-xl border border-line bg-surface-2/40 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-fg">{d.name}</span>
                  <span className="ml-auto text-[11px] text-faint">{d.registrar ?? "Unknown registrar"}</span>
                </div>

                <dl className="mt-2.5 grid grid-cols-2 gap-y-2 text-xs">
                  <Field label="Expiration">
                    <span className="text-fg">{expiryLabel(d)}</span>
                  </Field>
                  <Field label="SSL">
                    <span className={cn("flex items-center gap-1.5", ssl.tone)}>
                      <ssl.Icon className="h-3.5 w-3.5" />
                      {ssl.label}
                    </span>
                  </Field>
                  <Field label="Auto-renew">
                    {d.autoRenew === false ? (
                      <span className="flex items-center gap-1.5 text-warning">
                        <RefreshCwOff className="h-3.5 w-3.5" /> Off
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-success">
                        <RefreshCw className="h-3.5 w-3.5" /> On
                      </span>
                    )}
                  </Field>
                  {d.expiresAt && (
                    <Field label="Renews">
                      <span className="text-muted">{d.expiresAt}</span>
                    </Field>
                  )}
                </dl>

                {d.notes && <p className="mt-2.5 text-[11px] text-faint">{d.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}
