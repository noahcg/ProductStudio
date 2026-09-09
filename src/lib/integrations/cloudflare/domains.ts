import "server-only";

import tls from "node:tls";
import type { SslStatus } from "@/lib/domain";
import type { DomainMonitoringUpdate } from "@/lib/data/source";

type Registration = {
  expires_at: string | null;
  auto_renew: boolean;
};

type CloudflareResponse = {
  success: boolean;
  result: Registration | null;
  errors?: Array<{ message?: string }>;
};

export type DomainToCheck = Pick<DomainMonitoringUpdate, "projectId" | "name"> & { accountId?: string };

/** Fetch read-only Registrar facts and inspect the certificate served over HTTPS. */
export async function checkCloudflareDomains(domains: DomainToCheck[]): Promise<DomainMonitoringUpdate[]> {
  const fallbackAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token || (!fallbackAccountId && domains.some((domain) => !domain.accountId))) {
    throw new Error("Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the server environment first.");
  }

  const checkedAt = new Date().toISOString();
  return Promise.all(domains.map(async (domain) => {
    const accountId = domain.accountId || fallbackAccountId;
    if (!accountId) throw new Error("No Cloudflare account is configured for this product.");
    const registration = await getRegistration(accountId, token, domain.name);
    const sslStatus = await getSslStatus(domain.name);
    return {
      ...domain,
      registrar: "Cloudflare",
      // Product Studio stores the registration expiry as a calendar date.
      expiresAt: registration.expires_at?.slice(0, 10),
      autoRenew: registration.auto_renew,
      sslStatus,
      lastCheckedAt: checkedAt,
    };
  }));
}

async function getRegistration(accountId: string, token: string, domain: string): Promise<Registration> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/registrar/registrations/${encodeURIComponent(domain)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const body = await response.json().catch(() => null) as CloudflareResponse | null;
  if (!response.ok || !body?.success || !body.result) {
    const detail = body?.errors?.[0]?.message;
    throw new Error(detail ? `Cloudflare could not check ${domain}: ${detail}` : `Cloudflare could not check ${domain}.`);
  }
  return body.result;
}

function getSslStatus(hostname: string): Promise<SslStatus> {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, rejectUnauthorized: false });
    const done = (status: SslStatus) => {
      socket.destroy();
      resolve(status);
    };
    socket.setTimeout(10_000, () => done("missing"));
    socket.once("error", () => done("missing"));
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      if (!certificate || !certificate.valid_to) return done("missing");
      if (!socket.authorized) return done("invalid");
      const expires = new Date(certificate.valid_to).getTime();
      if (!Number.isFinite(expires)) return done("invalid");
      const days = Math.ceil((expires - Date.now()) / 86_400_000);
      done(days <= 30 ? "expiring" : "healthy");
    });
  });
}
