import type { Product } from "../domain";

/** The clean starting portfolio. Products contain the workspaces beneath them. */
export const products: Product[] = [
  {
    id: "home-cooked",
    name: "Home Cooked",
    integrations: {
      vercelProject: "home-cooked",
      vercelTeamSlug: "noahcgs-projects",
      supabaseProjectRef: "wcoubzejnqnknvgdyjui",
    },
  },
];
