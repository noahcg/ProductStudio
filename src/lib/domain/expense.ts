import type { ExpenseId, ProductId, IntegrationKey } from "./ids";

/** Common category suggestions. Custom category names are also supported. */
export const suggestedSpendCategories = ["Hosting", "AI Tools", "Domains", "Email"] as const;
export type SuggestedSpendCategory = (typeof suggestedSpendCategories)[number];

/**
 * An expense category is intentionally open-ended: studios use a wider range
 * of services than a fixed taxonomy can describe (for example, transactional
 * email providers such as Resend).
 */
export type SpendCategoryName = SuggestedSpendCategory | (string & {});
export type BillingPeriod = "monthly" | "yearly";

/**
 * A recurring cost line item. Attributed to a product when `productId` is set
 * (studio-wide otherwise, e.g. a base Vercel plan). `integration` is the
 * billing source.
 */
export interface Expense {
  id: ExpenseId;
  productId?: ProductId;
  integration?: IntegrationKey;
  service: string;
  category: SpendCategoryName;
  amount: number;
  billingPeriod: BillingPeriod;
}

export interface ExpenseInput {
  productId?: ProductId;
  service: string;
  category: SpendCategoryName;
  amount: number;
  billingPeriod: BillingPeriod;
}

/** Normalizes an expense to its monthly equivalent for portfolio totals. */
export function monthlyAmount(expense: Pick<Expense, "amount" | "billingPeriod">): number {
  return expense.billingPeriod === "yearly" ? expense.amount / 12 : expense.amount;
}
