import type { IntegrationKey } from "./ids";

export type { IntegrationKey };

export type IntegrationCategory = "git" | "hosting" | "database" | "domains" | "ai";

/**
 * A connected external service. Integrations are sources/sinks of data only —
 * GitHub, Vercel, Supabase, Cloudflare, OpenAI, Anthropic. Product Studio owns
 * the entities; integrations feed/observe them.
 */
export interface Integration {
  key: IntegrationKey;
  name: string;
  category: IntegrationCategory;
  connected: boolean;
  detail: string;
}
