import type { Domain } from "../domain";
import { now as studioNow } from "../clock";
import type { GeneratedSignal, SignalSeverity } from "../signals/engine";

/**
 * Domain Monitoring Service — deterministic, no external registrar APIs.
 *
 * Evaluates stored domain data (expiry, auto-renew, SSL) and generates
 * domain-related signals. Days remaining is always **computed** from
 * `expiresAt`, never stored. Awareness, not control.
 */

export type DomainHealth = "Healthy" | "Watch" | "Warning" | "Critical";

const SEVERITY_TO_HEALTH: Record<SignalSeverity, DomainHealth> = {
  info: "Healthy",
  watch: "Watch",
  warning: "Warning",
  critical: "Critical",
};
const HEALTH_RANK: Record<DomainHealth, number> = { Healthy: 0, Watch: 1, Warning: 2, Critical: 3 };

/** Days until expiry from `expiresAt` (negative = expired). Undefined if unknown. */
export function daysRemaining(domain: Domain, now: Date = studioNow()): number | undefined {
  if (!domain.expiresAt) return undefined;
  return Math.ceil((new Date(domain.expiresAt).getTime() - now.getTime()) / 86_400_000);
}

function signalsForDomain(domain: Domain, now: Date): GeneratedSignal[] {
  const createdAt = now.toISOString();
  const out: GeneratedSignal[] = [];
  const push = (
    type: GeneratedSignal["type"],
    severity: SignalSeverity,
    title: string,
    description: string,
    recommendation: string,
    metadata?: Record<string, unknown>
  ) =>
    out.push({
      id: `${type}:${domain.name}`,
      projectId: domain.projectId,
      type,
      severity,
      title,
      description,
      recommendation,
      source: "domain_monitor",
      createdAt,
      metadata,
    });

  // --- Expiration ---
  const days = daysRemaining(domain, now);
  if (days != null) {
    if (days < 0) {
      push("domain_expired", "critical", `${domain.name} has expired`, "The domain registration has lapsed.", "Renew immediately to avoid losing the domain.", { days });
    } else if (days <= 7) {
      push("domain_expiration", "critical", `${domain.name} expires in ${days} day${days === 1 ? "" : "s"}`, `The domain expires in ${days} day${days === 1 ? "" : "s"}.`, "Renew now — expiry is imminent.", { days });
    } else if (days <= 30) {
      push("domain_expiration", "warning", `${domain.name} expires in ${days} days`, `The domain expires in ${days} days.`, "Renew soon or confirm auto-renew is on.", { days });
    } else if (days <= 60) {
      push("domain_expiration", "watch", `${domain.name} expires in ${days} days`, `The domain expires in ${days} days.`, "No action yet — keep an eye on the renewal date.", { days });
    }
    // 60+ days → no signal
  }

  // --- Auto-renew ---
  if (domain.autoRenew === false) {
    push("domain_autorenew_disabled", "warning", `${domain.name} auto-renew is disabled`, "Auto-renew is turned off for this domain.", "Enable auto-renew or set a renewal reminder.", {});
  }

  // --- SSL ---
  switch (domain.sslStatus) {
    case "expiring":
      push("domain_ssl", "watch", `${domain.name} SSL is expiring`, "The SSL certificate is approaching expiry.", "Renew or rotate the certificate.", { ssl: "expiring" });
      break;
    case "invalid":
      push("domain_ssl", "critical", `${domain.name} SSL is invalid`, "The SSL certificate is invalid.", "Fix the certificate — visitors may see security warnings.", { ssl: "invalid" });
      break;
    case "missing":
      push("domain_ssl", "critical", `${domain.name} is missing SSL`, "No SSL certificate is present.", "Provision a certificate (HTTPS) for the domain.", { ssl: "missing" });
      break;
    // healthy / unknown / undefined → no signal
  }

  return out;
}

/** All domain signals across the portfolio (deterministic order). */
export function computeDomainSignals(domains: Domain[], now: Date = studioNow()): GeneratedSignal[] {
  return domains.flatMap((d) => signalsForDomain(d, now));
}

/** Worst domain-health label across a set of domains. "Healthy" if none/empty. */
export function domainHealth(domains: Domain[], now: Date = studioNow()): DomainHealth {
  let worst: DomainHealth = "Healthy";
  for (const d of domains) {
    for (const s of signalsForDomain(d, now)) {
      const h = SEVERITY_TO_HEALTH[s.severity];
      if (HEALTH_RANK[h] > HEALTH_RANK[worst]) worst = h;
    }
  }
  return worst;
}

/** Per-project worst domain health (only for projects that own domains). */
export function domainHealthByProject(
  domains: Domain[],
  now: Date = studioNow()
): Record<string, DomainHealth> {
  const byProject: Record<string, Domain[]> = {};
  for (const d of domains) (byProject[d.projectId] ??= []).push(d);
  const out: Record<string, DomainHealth> = {};
  for (const [projectId, ds] of Object.entries(byProject)) out[projectId] = domainHealth(ds, now);
  return out;
}
