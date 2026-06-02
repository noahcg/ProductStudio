import type { Signal, Integration } from "../types";

export const integrations: Integration[] = [
  { key: "vercel", name: "Vercel", connected: true, detail: "All deployments successful" },
  { key: "supabase", name: "Supabase", connected: true, detail: "Storage 82%" },
  { key: "github", name: "GitHub", connected: true, detail: "All repositories synced" },
  { key: "cloudflare", name: "Cloudflare", connected: true, detail: "All domains healthy" },
  { key: "openai", name: "OpenAI API", connected: true, detail: "Normal usage" },
  { key: "anthropic", name: "Anthropic API", connected: true, detail: "Normal usage" },
];

export const signals: Signal[] = [
  { id: "s1", service: "Vercel", detail: "All deployments successful", level: "ok", integration: "vercel" },
  { id: "s2", service: "Supabase", detail: "Storage 82%", level: "warn", integration: "supabase" },
  { id: "s3", service: "GitHub", detail: "All repositories synced", level: "ok", integration: "github" },
  { id: "s4", service: "Domain Monitoring", detail: "All domains healthy", level: "ok", integration: "cloudflare" },
  { id: "s5", service: "OpenAI API", detail: "Normal usage", level: "ok", integration: "openai" },
];
