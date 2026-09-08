"use server";

import { revalidatePath } from "next/cache";
import { getProject, upsertDomainMonitoring } from "@/lib/data";
import { checkCloudflareDomains } from "@/lib/integrations/cloudflare/domains";

export type DomainCheckResult = { ok: true; checked: number } | { ok: false; error: string };

export async function checkProjectDomainsAction(projectId: string): Promise<DomainCheckResult> {
  try {
    const project = await getProject(projectId);
    const domain = project?.domain?.trim();
    if (!domain) return { ok: false, error: "Add a domain to this project's details first." };
    const hostname = new URL(domain.includes("://") ? domain : `https://${domain}`).hostname.toLowerCase();
    if (!hostname) return { ok: false, error: "Enter a valid domain in the project details." };
    const updates = await checkCloudflareDomains([{ projectId, name: hostname }]);
    await upsertDomainMonitoring(updates);
    for (const path of ["/", "/projects", "/focus", "/signals", "/review"]) revalidatePath(path);
    return { ok: true, checked: updates.length };
  } catch (error) {
    return { ok: false, error: (error as Error)?.message ?? "Domain check failed." };
  }
}
