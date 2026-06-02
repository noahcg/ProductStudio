import type { SpendCategory, Expense, SpendTrendPoint } from "../types";
import { categoryColor } from "../constants/palette";

export const spendCategories: SpendCategory[] = [
  { label: "Hosting", amount: 21.35, color: categoryColor.hosting },
  { label: "AI Tools", amount: 14.62, color: categoryColor.ai },
  { label: "Domains", amount: 6.4, color: categoryColor.domains },
];

export const spendTotal = spendCategories.reduce((sum, c) => sum + c.amount, 0);

export const expenses: Expense[] = [
  { id: "e1", service: "Vercel Pro", category: "Hosting", amount: 20.0, integration: "vercel" },
  { id: "e2", service: "Supabase", category: "Hosting", amount: 1.35, projectId: "home-cooked", integration: "supabase" },
  { id: "e3", service: "OpenAI API", category: "AI Tools", amount: 8.42, projectId: "home-cooked", integration: "openai" },
  { id: "e4", service: "Anthropic API", category: "AI Tools", amount: 6.2, projectId: "wardrobe-harmony", integration: "anthropic" },
  { id: "e5", service: "tryhomecooked.com", category: "Domains", amount: 1.6, projectId: "home-cooked", integration: "cloudflare" },
  { id: "e6", service: "wardrobeharmony.com", category: "Domains", amount: 1.6, projectId: "wardrobe-harmony", integration: "cloudflare" },
  { id: "e7", service: "cascadelounge.co", category: "Domains", amount: 3.2, projectId: "cascade-lounge", integration: "cloudflare" },
];

/** Last 6 months of total spend for the trend chart (current month is live). */
export const spendTrend: SpendTrendPoint[] = [
  { month: "Jan", amount: 31.1 },
  { month: "Feb", amount: 33.8 },
  { month: "Mar", amount: 29.4 },
  { month: "Apr", amount: 38.2 },
  { month: "May", amount: 40.05 },
  { month: "Jun", amount: spendTotal },
];
