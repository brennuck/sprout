"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BarChart3, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface ReportData {
  range: { from: string; to: string };
  summary: {
    income: number;
    spending: number;
    net: number;
    currentNetWorth: number;
    allocated: number;
  };
  cashFlow: { month: string; income: number; spending: number; net: number }[];
  spendingByEnvelope: {
    envelopeId: string | null;
    name: string;
    amount: number;
    count: number;
  }[];
  goals: {
    id: string;
    name: string;
    funded: number;
    target: number | null;
    progress: number | null;
    hypotheticalSpend: number;
    hypotheticalTargetPercent: number | null;
    estimatedDelayDays: number | null;
    noImpactEquivalent: number;
  }[];
}

function inputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ReportsDashboard({ initialReport }: { initialReport: ReportData }) {
  const [report, setReport] = useState(initialReport);
  const [from, setFrom] = useState(inputDate(new Date(initialReport.range.from)));
  const [to, setTo] = useState(inputDate(new Date(initialReport.range.to)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRange = async (nextFrom: string, nextTo: string) => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/reports?from=${nextFrom}&to=${nextTo}`);
    const data = await response.json();
    if (response.ok) {
      setReport(data);
      setFrom(nextFrom);
      setTo(nextTo);
    } else setError(data.error || "Could not load reports");
    setLoading(false);
  };

  const preset = (months: number) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    loadRange(inputDate(start), inputDate(now));
  };

  const maxCash = Math.max(
    1,
    ...report.cashFlow.flatMap((row) => [row.income, row.spending]),
  );
  const maxSpending = Math.max(1, ...report.spendingByEnvelope.map((row) => row.amount));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Understand the pattern</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Reports</h1>
          <p className="mt-2 max-w-2xl text-ink-secondary">See where money went, how your plan performed, and what spending could mean for your focus goal.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Report range">
          <Button size="sm" variant="outline" onClick={() => preset(1)}>Month</Button>
          <Button size="sm" variant="outline" onClick={() => preset(3)}>Quarter</Button>
          <Button size="sm" variant="outline" onClick={() => preset(12)}>Year</Button>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={(event) => { event.preventDefault(); loadRange(from, to); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Button type="submit" isLoading={loading}>Apply range</Button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="flex items-center gap-1 text-sm text-ink-muted"><ArrowUpRight className="h-4 w-4 text-positive" aria-hidden="true" /> Income</p><p className="mt-1 text-2xl font-bold text-positive">{formatCurrency(report.summary.income)}</p></Card>
        <Card className="p-5"><p className="flex items-center gap-1 text-sm text-ink-muted"><ArrowDownRight className="h-4 w-4 text-danger" aria-hidden="true" /> Spending</p><p className="mt-1 text-2xl font-bold text-ink">{formatCurrency(report.summary.spending)}</p></Card>
        <Card className="p-5"><p className="flex items-center gap-1 text-sm text-ink-muted"><TrendingUp className="h-4 w-4 text-brand" aria-hidden="true" /> Net cash flow</p><p className={`mt-1 text-2xl font-bold ${report.summary.net >= 0 ? "text-positive" : "text-danger"}`}>{formatCurrency(report.summary.net)}</p></Card>
        <Card className="p-5"><p className="text-sm text-ink-muted">Current net worth</p><p className="mt-1 text-2xl font-bold text-ink">{formatCurrency(report.summary.currentNetWorth)}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div><h2 className="flex items-center gap-2 text-xl font-bold text-ink"><BarChart3 className="h-5 w-5 text-brand" aria-hidden="true" /> Cash flow</h2><p className="text-sm text-ink-muted">Income and spending by month, in dollars.</p></div>
          {report.cashFlow.length ? (
            <>
              <div className="mt-6 space-y-4" aria-label="Cash flow chart">
                {report.cashFlow.map((row) => (
                  <div key={row.month}>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-ink-secondary"><span>{new Date(`${row.month}-02`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span><span>Net {formatCurrency(row.net)}</span></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><span className="w-12 text-xs text-positive">Income</span><div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-positive" style={{ width: `${row.income / maxCash * 100}%` }} /></div><span className="w-20 text-right text-xs">{formatCurrency(row.income)}</span></div>
                      <div className="flex items-center gap-2"><span className="w-12 text-xs text-danger">Spent</span><div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-danger" style={{ width: `${row.spending / maxCash * 100}%` }} /></div><span className="w-20 text-right text-xs">{formatCurrency(row.spending)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <details className="mt-5 rounded-xl bg-surface-muted p-3"><summary className="cursor-pointer text-sm font-semibold text-ink">Accessible data list</summary><ul className="mt-3 space-y-2 text-sm">{report.cashFlow.map((row) => <li key={row.month}>{row.month}: {formatCurrency(row.income)} income, {formatCurrency(row.spending)} spent, {formatCurrency(row.net)} net.</li>)}</ul></details>
            </>
          ) : <p className="py-12 text-center text-sm text-ink-muted">No cash flow in this range.</p>}
        </Card>

        <Card>
          <div><h2 className="text-xl font-bold text-ink">Spending by budget</h2><p className="text-sm text-ink-muted">Tap a row to review its transactions.</p></div>
          <div className="mt-6 space-y-4">
            {report.spendingByEnvelope.map((row) => (
              <Link key={row.envelopeId || "none"} href={row.envelopeId ? `/activity?envelopeId=${row.envelopeId}` : "/activity"} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-focus">
                <div className="flex justify-between gap-3 text-sm"><span className="font-semibold text-ink">{row.name} <span className="font-normal text-ink-muted">({row.count})</span></span><span>{formatCurrency(row.amount)}</span></div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${row.amount / maxSpending * 100}%` }} /></div>
              </Link>
            ))}
            {!report.spendingByEnvelope.length && <p className="py-12 text-center text-sm text-ink-muted">No spending in this range.</p>}
          </div>
        </Card>
      </div>

      <section aria-labelledby="goal-impact-heading">
        <div className="mb-4">
          <h2 id="goal-impact-heading" className="text-2xl font-bold text-ink">Goal impact</h2>
          <p className="text-sm text-ink-muted">A hypothetical opportunity-cost view. These expenses do not reduce actual funded progress.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {report.goals.map((goal) => (
            <Card key={goal.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Target aria-hidden="true" /></span>
                <div className="flex-1"><h3 className="text-lg font-bold text-ink">{goal.name}</h3><p className="text-sm text-ink-muted">Actual: {formatCurrency(goal.funded)}{goal.target ? ` of ${formatCurrency(goal.target)}` : ""}</p></div>
              </div>
              {goal.target && <div className="mt-5"><div className="h-3 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${goal.progress || 0}%` }} /></div><p className="mt-2 text-sm font-semibold text-ink">{(goal.progress || 0).toFixed(0)}% actually funded</p></div>}
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-ink">Hypothetical spending impact</p>
                <p className="mt-1 text-2xl font-bold text-warning">{formatCurrency(goal.hypotheticalSpend)}</p>
                <p className="mt-2 text-sm text-ink-secondary">
                  {goal.hypotheticalTargetPercent != null ? `${goal.hypotheticalTargetPercent.toFixed(1)}% of the goal` : "Potential goal money"}
                  {goal.estimatedDelayDays ? ` · about ${goal.estimatedDelayDays} days at the current plan` : ""}.
                </p>
                <p className="mt-2 text-xs font-semibold text-ink">Your funded balance remains {formatCurrency(goal.funded)}.</p>
              </div>
            </Card>
          ))}
          {!report.goals.length && <Card className="lg:col-span-2 py-12 text-center"><Target className="mx-auto h-9 w-9 text-brand" aria-hidden="true" /><p className="mt-3 text-ink-muted">Create a goal to unlock goal-impact reporting.</p><Link href="/budgets" className="mt-2 inline-block font-semibold text-brand">Create a goal</Link></Card>}
        </div>
      </section>
    </div>
  );
}
