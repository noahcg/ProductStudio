import { ArrowRight } from "lucide-react";
import { getSpend } from "@/lib/data";
import { Card, LinkButton } from "@/components/ui";
import { Donut } from "@/components/donut";
import { currency } from "@/lib/utils";

export async function MonthlySpend() {
  const { categories: spend, total: spendTotal } = await getSpend();

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">Monthly Spend</h2>
        <LinkButton href="/money" className="flex items-center gap-1 text-sm">
          View details <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>

      <div className="mt-3">
        <div className="text-3xl font-bold tracking-tight text-fg">{currency(spendTotal)}</div>
        <div className="text-xs text-muted">Total this month</div>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <Donut segments={spend} />
        <ul className="flex-1 space-y-3">
          {spend.map((cat) => {
            const pct = Math.round((cat.amount / spendTotal) * 100);
            return (
              <li key={cat.label} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.color }} />
                <span className="flex-1 text-muted">{cat.label}</span>
                <span className="font-medium text-fg">{currency(cat.amount)}</span>
                <span className="w-9 text-right text-xs text-faint">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto border-t border-line pt-4">
        <LinkButton href="/money" className="text-sm">
          View all expenses <ArrowRight className="h-3.5 w-3.5" />
        </LinkButton>
      </div>
    </Card>
  );
}
