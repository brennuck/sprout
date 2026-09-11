"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Stat } from "@/components/ui/Stat";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart, DonutChart, LineChart } from "@/components/charts";
import { loadReportAction } from "@/lib/actions/reports";
import { formatCurrency } from "@/lib/utils";
import type { DashboardReport } from "@/lib/services/reports";

type Tab = "overview" | "spending" | "cashflow" | "networth" | "goals";
type Preset = "month" | "3m" | "6m" | "1y" | "custom";

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function rangeFor(preset: Exclude<Preset, "custom">) {
  const now = new Date();
  const to = inputDate(now);
  if (preset === "month") return { from: inputDate(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  if (preset === "3m") return { from: inputDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to };
  if (preset === "6m") return { from: inputDate(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to };
  return { from: inputDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())), to };
}

export function ReportsDashboard({ initialReport }: { initialReport: DashboardReport }) {
  const [report, setReport] = useState(initialReport);
  const [tab, setTab] = useState<Tab>("overview");
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(inputDate(new Date(initialReport.range.from)));
  const [to, setTo] = useState(inputDate(new Date(initialReport.range.to)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRange = async (nextFrom: string, nextTo: string, nextPreset: Preset) => {
    setLoading(true);
    setError("");
    const result = await loadReportAction({ from: nextFrom, to: nextTo });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReport(result.data);
    setFrom(nextFrom);
    setTo(nextTo);
    setPreset(nextPreset);
  };

  const cashSeries = useMemo(
    () => report.cashFlow.map((row) => ({ label: monthLabel(row.month), income: row.income, spending: row.spending })),
    [report.cashFlow],
  );
  const netWorthSeries = useMemo(
    () => report.netWorth.map((row) => ({ label: monthLabel(row.month), value: row.value })),
    [report.netWorth],
  );
  const donut = useMemo(
    () => report.spendingByEnvelope.slice(0, 8).map((row) => ({ label: row.name, value: row.amount })),
    [report.spendingByEnvelope],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Understand the pattern</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Reports</h1>
          <p className="mt-2 text-ink-secondary">Cash flow, spending, net worth, and the hypothetical impact of spending on your goals.</p>
        </div>
        <ChipRow>
          {(["month", "3m", "6m", "1y"] as const).map((item) => (
            <Chip
              key={item}
              selected={preset === item}
              onClick={() => {
                const range = rangeFor(item);
                void loadRange(range.from, range.to, item);
              }}
            >
              {item === "month" ? "This month" : item === "3m" ? "3 months" : item === "6m" ? "6 months" : "1 year"}
            </Chip>
          ))}
          <Chip selected={preset === "custom"} onClick={() => setPreset("custom")}>
            Custom
          </Chip>
        </ChipRow>
      </div>

      {preset === "custom" && (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void loadRange(from, to, "custom");
          }}
        >
          <Input label="From" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Button type="submit" isLoading={loading}>
            Update
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <SegmentedControl<Tab>
        label="Report view"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "spending", label: "Spending" },
          { value: "cashflow", label: "Cash flow" },
          { value: "networth", label: "Net worth" },
          { value: "goals", label: "Goals" },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <Stat label="Income" value={formatCurrency(report.summary.income)} icon={<ArrowUpRight className="h-4 w-4 text-positive" aria-hidden="true" />} />
            </Card>
            <Card className="p-5">
              <Stat label="Spending" value={formatCurrency(report.summary.spending)} icon={<ArrowDownRight className="h-4 w-4 text-danger" aria-hidden="true" />} />
            </Card>
            <Card className="p-5">
              <Stat label="Net" value={formatCurrency(report.summary.net)} />
            </Card>
            <Card className="p-5">
              <Stat label="Net worth" value={formatCurrency(report.summary.currentNetWorth)} />
            </Card>
          </div>
          {cashSeries.length ? (
            <Card>
              <h2 className="text-xl font-bold text-ink">Income vs spending</h2>
              <BarChart className="mt-4" series={cashSeries} />
            </Card>
          ) : (
            <EmptyState title="Nothing in this range yet." description="Record income and expenses to see the pattern." />
          )}
        </div>
      )}

      {tab === "spending" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <h2 className="text-xl font-bold text-ink">By envelope</h2>
            {donut.length ? (
              <DonutChart className="mt-4" slices={donut} totalLabel="spent" />
            ) : (
              <p className="mt-4 text-sm text-ink-muted">No categorized spending in this range.</p>
            )}
          </Card>
          <Card>
            <h2 className="text-xl font-bold text-ink">Month over month</h2>
            <ul className="mt-4 divide-y divide-line">
              {report.spendingByEnvelope.map((row) => (
                <li key={row.envelopeId ?? "uncategorized"} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-ink-muted">{row.count} {row.count === 1 ? "purchase" : "purchases"}</p>
                  </div>
                  <span className="tabular font-semibold text-ink">{formatCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "cashflow" && (
        <Card>
          <h2 className="text-xl font-bold text-ink">Cash flow</h2>
          <p className="mt-1 text-sm text-ink-muted">Adjustments from reconciling are excluded from this view.</p>
          {cashSeries.length ? <BarChart className="mt-4" series={cashSeries} /> : <p className="mt-4 text-sm text-ink-muted">No cash flow yet.</p>}
        </Card>
      )}

      {tab === "networth" && (
        <Card>
          <h2 className="text-xl font-bold text-ink">Net worth</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Derived from current balances minus cumulative transaction deltas — no snapshot table required.
          </p>
          {netWorthSeries.length ? (
            <LineChart className="mt-4" points={netWorthSeries} label="Net worth over time" />
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Add an account to start a history.</p>
          )}
        </Card>
      )}

      {tab === "goals" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-ink">Hypothetical spending impact</h2>
          <p className="text-sm text-ink-muted">
            Saved progress never changes. This shows what those dollars could have done if they had gone to a goal instead.
          </p>
          {report.goals.length ? (
            report.goals.map((goal) => (
              <Card key={goal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      <Target className="h-4 w-4 text-brand" aria-hidden="true" />
                      {goal.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatCurrency(goal.funded)}
                      {goal.target ? ` of ${formatCurrency(goal.target)}` : ""} funded
                    </p>
                  </div>
                  <Link href="/budgets" className="text-sm font-semibold text-brand">
                    Open
                  </Link>
                </div>
                {goal.target ? <ProgressBar className="mt-3" value={goal.progress ?? 0} label={`${goal.name} funded`} /> : null}
                <p className="mt-3 text-sm text-ink-secondary">
                  Spending tagged against this goal: {formatCurrency(goal.hypotheticalSpend)}
                  {goal.estimatedDelayDays != null ? ` · about ${goal.estimatedDelayDays} days of delay` : ""}
                  {goal.hypotheticalTargetPercent != null
                    ? ` · ${goal.hypotheticalTargetPercent.toFixed(1)}% of the target`
                    : ""}
                </p>
              </Card>
            ))
          ) : (
            <EmptyState title="No goals yet" description="Create a goal on Plan to see funded progress and hypothetical impact." />
          )}
        </div>
      )}
    </div>
  );
}
