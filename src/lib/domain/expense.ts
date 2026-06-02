import type { ExpenseId, ProjectId, IntegrationKey } from "./ids";

export type SpendCategoryName = "Hosting" | "AI Tools" | "Domains";

/**
 * A recurring cost line item. Attributed to a project when `projectId` is set
 * (studio-wide otherwise, e.g. a base Vercel plan). `integration` is the
 * billing source.
 */
export interface Expense {
  id: ExpenseId;
  projectId?: ProjectId;
  integration?: IntegrationKey;
  service: string;
  category: SpendCategoryName;
  amount: number;
}
