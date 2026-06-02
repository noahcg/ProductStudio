/**
 * Product Studio domain model — the canonical, source-of-truth type
 * definitions. A Project owns its milestones, tasks, roadmap items, decisions,
 * activity, expenses, domains, and signals. External services (GitHub, Vercel,
 * Supabase, Cloudflare, OpenAI, Anthropic) are integrations only.
 *
 * Single-user: there is intentionally no user / team / account model.
 */
export * from "./ids";
export * from "./project";
export * from "./milestone";
export * from "./task";
export * from "./roadmap";
export * from "./decision";
export * from "./activity";
export * from "./signal";
export * from "./expense";
export * from "./domain";
export * from "./integration";
export * from "./views";
