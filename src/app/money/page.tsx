import { getSpend, getExpenses, getSpendTrend, getProducts } from "@/lib/data";
import { MoneyView } from "@/components/money/money-view";

// Expenses are user-entered desktop data; never bake a build-time snapshot into the app.
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const [{ categories: spend, total: spendTotal }, expenses, spendTrend, products] =
    await Promise.all([getSpend(), getExpenses(), getSpendTrend(), getProducts()]);
  return <MoneyView spend={spend} spendTotal={spendTotal} expenses={expenses} spendTrend={spendTrend} products={products} />;
}
