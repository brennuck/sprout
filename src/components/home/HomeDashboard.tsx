"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarClock,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stat, Amount } from "@/components/ui/Stat";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { Chip } from "@/components/ui/Chip";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { useAddSheet } from "@/components/add/AddSheet";
import { createAccountAction } from "@/lib/actions/accounts";
import { createEnvelopeAction } from "@/lib/actions/envelopes";
import { formatCurrency, formatMonthDay } from "@/lib/utils";
import { budgetHealth, percent, projectEnvelope, relativeDayLabel } from "@/lib/budget-math";
import { upcomingBills } from "@/lib/data/snapshot";
import type { TransactionRow } from "@/lib/data/types";

const STARTER = [
  { name: "Groceries", kind: "BUDGET" as const, icon: "🛒", monthlyTarget: 400 },
  { name: "Dining out", kind: "BUDGET" as const, icon: "🍽️", monthlyTarget: 120 },
  { name: "Car insurance", kind: "SINKING_FUND" as const, icon: "🚗", targetAmount: 600 },
  { name: "Emergency fund", kind: "GOAL" as const, icon: "🛡️", targetAmount: 1000 },
];

interface HomeDashboardProps {
  userName: string | null;
  income: number;
  spending: number;
  recent: TransactionRow[];
  spentThisMonth: Record<string, number>;
}

export function HomeDashboard({ userName, income, spending, recent, spentThisMonth }: HomeDashboardProps) {
  const snapshot = useSnapshot();
  const { openAdd } = useAddSheet();
  if (!snapshot.accounts.length) {
    return <Onboarding userName={userName} />;
  }

  const overspent = snapshot.envelopes.filter((envelope) => envelope.balance < 0);
  const underfunded = snapshot.envelopes.filter((envelope) => {
    if (envelope.kind !== "BUDGET") return false;
    return budgetHealth(envelope, envelope.balance, spentThisMonth[envelope.id] ?? 0).status === "underfunded";
  });
  const bills = upcomingBills(snapshot, 14);
  const goals = snapshot.envelopes.filter((envelope) => envelope.kind === "GOAL");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">This month</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-ink-secondary">One clear view of what is safe to spend and what is growing.</p>
        </div>
        <Button onClick={() => openAdd("expense")}>
          Add expense
        </Button>
      </div>

      <Card className="bg-brand-soft/40 p-5">
        <Stat
          size="lg"
          label="Ready to assign"
          value={snapshot.totals.readyToAssign}
          tone={snapshot.totals.readyToAssign < 0 ? "danger" : "brand"}
          hint={
            snapshot.totals.readyToAssign > 0 ? (
              <Link href="/budgets" className="inline-flex items-center gap-1 font-semibold text-brand">
                Give it a job <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : (
              "Every dollar has a job"
            )
          }
        />
        {snapshot.accounts.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {snapshot.accounts.map((account) => (
              <Chip key={account.id} size="sm" tone={account.readyToAssign > 0 ? "brand" : "neutral"}>
                {account.name} · {formatCurrency(account.readyToAssign)}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card className="p-4">
          <Stat size="sm" label="Real cash" value={snapshot.totals.cash} hint={`${snapshot.accounts.length} account${snapshot.accounts.length === 1 ? "" : "s"}`} />
        </Card>
        <Card className="p-4">
          <Stat size="sm" label="Assigned" value={snapshot.totals.assigned} />
        </Card>
        <Card className="p-4">
          <Stat size="sm" icon={<ArrowUpRight className="h-4 w-4 text-positive" aria-hidden="true" />} label="Income" value={income} tone="positive" />
        </Card>
        <Card className="p-4">
          <Stat size="sm" icon={<ArrowDownRight className="h-4 w-4 text-danger" aria-hidden="true" />} label="Spending" value={spending} hint={<Link href="/reports" className="font-semibold text-brand">See report</Link>} />
        </Card>
      </div>

      {(overspent.length > 0 || underfunded.length > 0 || bills.some((bill) => new Date(bill.nextDueAt) <= new Date()) || snapshot.pendingInvitations > 0) && (
        <section className="space-y-3" aria-labelledby="attention-heading">
          <h2 id="attention-heading" className="text-lg font-bold text-ink">Needs attention</h2>
          {overspent.length > 0 && (
            <div role="status" className="rounded-2xl border border-danger/30 bg-danger-soft p-4">
              <p className="font-semibold text-danger">{overspent.length} envelope{overspent.length === 1 ? " is" : "s are"} overspent</p>
              <p className="mt-1 text-sm text-ink-secondary">Cover {overspent.map((item) => item.name).join(", ")} so the rest of the plan stays honest.</p>
              <Link href="/budgets" className="mt-2 inline-block text-sm font-semibold text-brand">Open plan</Link>
            </div>
          )}
          {underfunded.length > 0 && (
            <div className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
              <p className="font-semibold text-ink">{underfunded.length} budget{underfunded.length === 1 ? "" : "s"} underfunded</p>
              <p className="mt-1 text-sm text-ink-secondary">{underfunded.slice(0, 4).map((item) => item.name).join(", ")}</p>
            </div>
          )}
          {snapshot.pendingInvitations > 0 && (
            <Link href="/settings#sharing" className="block rounded-2xl border border-info/30 bg-info-soft p-4">
              <p className="font-semibold text-ink">You have {snapshot.pendingInvitations} invitation{snapshot.pendingInvitations === 1 ? "" : "s"} waiting</p>
            </Link>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">Goals in motion</h2>
              <p className="text-sm text-ink-muted">Actual funded progress</p>
            </div>
            <Link href="/budgets" className="text-sm font-semibold text-brand">View all</Link>
          </div>
          <div className="mt-5 space-y-5">
            {goals.slice(0, 3).map((goal) => {
              const projection = projectEnvelope(goal);
              return (
                <div key={goal.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <Target className="h-4 w-4 text-brand" aria-hidden="true" />
                      {goal.icon ? `${goal.icon} ` : ""}
                      {goal.name}
                      {goal.id === snapshot.focusGoalId && <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
                    </span>
                    <span className="tabular text-ink-muted">
                      {formatCurrency(goal.balance)}
                      {goal.targetAmount ? ` / ${formatCurrency(goal.targetAmount)}` : ""}
                    </span>
                  </div>
                  <ProgressBar className="mt-2" value={percent(goal.balance, goal.targetAmount)} label={`${goal.name} progress`} tone="positive" />
                  {projection.status === "behind" && projection.neededPerMonth != null && (
                    <p className="mt-1 text-xs text-warning">Needs {formatCurrency(projection.neededPerMonth)}/month to stay on date.</p>
                  )}
                </div>
              );
            })}
            {!goals.length && (
              <EmptyState compact icon={<Target />} title="Plant a goal" description="Watch funded progress grow here." action={<Link href="/budgets"><Button size="sm">Create a goal</Button></Link>} />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">Upcoming</h2>
              <p className="text-sm text-ink-muted">Bills and contributions in the next two weeks</p>
            </div>
            <Link href="/bills" className="text-sm font-semibold text-brand">Manage</Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {bills.slice(0, 6).map((bill) => (
              <li key={bill.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{bill.description}</p>
                  <p className="text-xs text-ink-muted">{relativeDayLabel(bill.nextDueAt)}</p>
                </div>
                <Amount value={bill.amount} type={bill.type === "INCOME" ? "INCOME" : "EXPENSE"} />
              </li>
            ))}
            {!bills.length && (
              <EmptyState compact icon={<CalendarClock />} title="No bills due soon" action={<Link href="/bills"><Button size="sm" variant="outline">Add a bill</Button></Link>} />
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-ink">Recent activity</h2>
            <Link href="/activity" className="text-sm font-semibold text-brand">View all</Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {recent.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.description}</p>
                  <p className="text-xs text-ink-muted">
                    {formatMonthDay(item.date)}
                    {item.envelopeName ? ` · ${item.envelopeName}` : ""}
                  </p>
                </div>
                <Amount value={item.amount} type={item.type} />
              </li>
            ))}
            {!recent.length && <EmptyState compact icon={<WalletCards />} title="Your transactions will appear here." />}
          </ul>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              <BadgeDollarSign aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-ink">Payday</h2>
            <p className="mt-1 text-sm text-ink-muted">Record a paycheck and Sprout follows your allocation plan immediately.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => openAdd("income")}>Record income</Button>
            <Link href="/income"><Button variant="outline">Edit plan</Button></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Onboarding({ userName }: { userName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Checking");
  const [balance, setBalance] = useState("");
  const [selected, setSelected] = useState<string[]>(STARTER.map((item) => item.name));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { openAdd } = useAddSheet();

  const create = async () => {
    setSaving(true);
    setError("");
    const account = await createAccountAction({ name, type: "SAVINGS", startingBalance: parseMoney(balance) || 0 });
    if (!account.ok) {
      setSaving(false);
      setError(account.error);
      return;
    }
    for (const template of STARTER.filter((item) => selected.includes(item.name))) {
      await createEnvelopeAction({
        name: template.name,
        kind: template.kind,
        accountId: account.data.id,
        icon: template.icon,
        monthlyTarget: "monthlyTarget" in template ? template.monthlyTarget : null,
        targetAmount: "targetAmount" in template ? template.targetAmount : null,
      });
    }
    setSaving(false);
    setStep(2);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Let&apos;s plant something</p>
        <h1 className="font-display text-3xl font-bold text-ink">
          Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-ink-secondary">Three quick steps and your garden is ready.</p>
      </div>
      {step === 0 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-ink">Where does your money live?</h2>
          <Input label="Account name" value={name} onChange={(event) => setName(event.target.value)} />
          <MoneyInput label="Current balance" value={balance} onValueChange={setBalance} hint="You can always reconcile later." />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button className="w-full" onClick={() => setStep(1)} disabled={!name.trim()}>Continue</Button>
        </Card>
      )}
      {step === 1 && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-ink">Start with a few envelopes</h2>
          <p className="text-sm text-ink-muted">You can rename or archive any of these later.</p>
          <div className="flex flex-wrap gap-2">
            {STARTER.map((item) => (
              <Chip
                key={item.name}
                selected={selected.includes(item.name)}
                onClick={() =>
                  setSelected((current) =>
                    current.includes(item.name) ? current.filter((name) => name !== item.name) : [...current, item.name],
                  )
                }
              >
                {item.icon} {item.name}
              </Chip>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button className="w-full" onClick={create} isLoading={saving}>Create my plan</Button>
        </Card>
      )}
      {step === 2 && (
        <Card className="space-y-4 text-center">
          <h2 className="text-lg font-bold text-ink">You&apos;re in.</h2>
          <p className="text-sm text-ink-muted">Record a paycheck so envelopes can fill, or jump into your plan.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => openAdd("income")}>Record a paycheck</Button>
            <Link href="/budgets"><Button variant="outline">See my plan</Button></Link>
          </div>
        </Card>
      )}
    </div>
  );
}
