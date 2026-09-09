import type { ProductId } from "./ids";

/** A Product is the top-level thing being built. It can contain many projects. */
export interface Product {
  id: ProductId;
  name: string;
  /** Non-secret connection identifiers. Tokens always remain server environment variables. */
  integrations: ProductIntegrations;
}

export interface ProductIntegrations {
  vercelProject?: string;
  vercelTeamSlug?: string;
  supabaseProjectRef?: string;
  cloudflareAccountId?: string;
}

/** The intentionally small form used to start a new product. */
export interface ProductInput {
  name: string;
  integrations?: ProductIntegrations;
}
