import { ChevronUp, Globe } from "lucide-react";
import { getSpend, getExpenses, getSpendTrend, getProjects, getProjectMap } from "@/lib/data";
import { Card, CardHeader, Badge, PageHeading } from "@/components/ui";
import { Donut } from "@/components/donut";
import { integrationIcons, projectIcons, accentStyles } from "@/components/icons";
import { currency, cn } from "@/lib/utils";

export default async function MoneyPage() {
  const [{ categories: spend, total: spendTotal }, expenses, spendTrend, projects, projectMap] =
    await Promise.all([getSpend(), getExpenses(), getSpendTrend(), getProjects(), getProjectMap()]);

  const prev = spendTrend[spendTrend.length - 2].amount;
  const delta = ((spendTotal - prev) / prev) * 100;
  const maxTrend = Math.max(...spendTrend.map((t) => t.amount));

  // Spend per project (domains + AI + hosting attributed to a project).
  const perProject = projects
    .map((p) => ({
      project: p,
      amount: expenses.filter((e) => e.projectId === p.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div>
      <PageHeading
        title="Money"
        subtitle="Costs and spend tracking across hosting, AI, and domains."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Summary + donut */}
        <Card className="p-5">
          <CardHeader title="This month" className="px-0 pt-0" />
          <div className="mt-3 flex items-end gap-3">
            <div className="text-4xl font-bold tracking-tight text-fg">{currency(spendTotal)}</div>
            <span
              className={cn(
                "mb-1.5 flex items-center gap-0.5 text-xs font-medium",
                delta >= 0 ? "text-warning" : "text-success"
              )}
            >
              <ChevronUp className={cn("h-3.5 w-3.5", delta < 0 && "rotate-180")} />
              {Math.abs(delta).toFixed(1)}% vs last month
            </span>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <Donut segments={spend} size={140}>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-faint">Total</div>
                <div className="text-lg font-bold text-fg">{currency(spendTotal)}</div>
              </div>
            </Donut>
            <ul className="flex-1 space-y-3">
              {spend.map((c) => {
                const pct = Math.round((c.amount / spendTotal) * 100);
                return (
                  <li key={c.label} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 text-muted">{c.label}</span>
                      <span className="font-medium text-fg">{currency(c.amount)}</span>
                    </div>
                    <div className="ml-[18px] mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        {/* Trend */}
        <Card className="flex flex-col p-5">
          <CardHeader title="6-month trend" className="px-0 pt-0" />
          <div className="mt-6 flex flex-1 items-end justify-between gap-3">
            {spendTrend.map((t, i) => {
              const h = Math.round((t.amount / maxTrend) * 100);
              const last = i === spendTrend.length - 1;
              return (
                <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="text-xs font-medium text-muted">{currency(t.amount)}</div>
                  <div className="flex h-40 w-full items-end">
                    <div
                      className={cn("w-full rounded-t-lg transition-all", last ? "bg-accent" : "bg-line-strong")}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <div className={cn("text-xs", last ? "font-semibold text-fg" : "text-faint")}>{t.month}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Line items + per-project */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Expenses" action={<span className="text-xs text-muted">{expenses.length} line items</span>} />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-faint">
                <th className="px-5 py-2.5 font-medium">Service</th>
                <th className="px-5 py-2.5 font-medium">Project</th>
                <th className="px-5 py-2.5 font-medium">Category</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const Icon = e.integration ? integrationIcons[e.integration] : Globe;
                const project = e.projectId ? projectMap.get(e.projectId) : undefined;
                return (
                  <tr key={e.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-muted">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium text-fg">{e.service}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{project ? project.name : "—"}</td>
                    <td className="px-5 py-3">
                      <Badge tone="neutral">{e.category}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-fg">{currency(e.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-5 py-3 text-sm font-medium text-muted">
                  Total
                </td>
                <td className="px-5 py-3 text-right text-base font-bold text-fg">{currency(spendTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card>
          <CardHeader title="Spend by project" />
          <ul className="space-y-3 p-5 pt-3">
            {perProject.map(({ project, amount }) => {
              const Icon = projectIcons[project.icon];
              const accent = accentStyles[project.accent];
              const pct = Math.round((amount / spendTotal) * 100);
              return (
                <li key={project.id}>
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1", `bg-surface-2 ${accent.ring}`)}>
                      <Icon className="h-3.5 w-3.5 text-fg" />
                    </span>
                    <span className="flex-1 font-medium text-fg">{project.name}</span>
                    <span className="font-medium text-fg">{currency(amount)}</span>
                  </div>
                  <div className="ml-[38px] mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent.bar }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
