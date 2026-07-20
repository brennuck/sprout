"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, BadgeDollarSign, Check, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BudgetAccount, BudgetEnvelope } from "@/components/dashboard/BudgetManager";

interface Rule {
  envelopeId: string;
  method: "FIXED" | "PERCENT" | "REMAINDER";
  value: number;
  priority: number;
}

interface Plan {
  accountId: string;
  name: string;
  enabled: boolean;
  rules: Rule[];
}

interface IncomeItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  accountName: string;
}

interface IncomeManagerProps {
  accounts: BudgetAccount[];
  envelopes: BudgetEnvelope[];
  plans: Plan[];
  income: IncomeItem[];
}

function previewAllocations(amount: number, rules: Rule[]) {
  let remaining = Math.max(0, Math.round(amount * 100));
  return {
    rows: [...rules]
      .sort((a, b) => a.priority - b.priority)
      .map((rule) => {
        let cents = 0;
        if (rule.method === "FIXED") cents = Math.min(remaining, Math.round(rule.value * 100));
        if (rule.method === "PERCENT") cents = Math.round(remaining * (Math.min(100, rule.value) / 100));
        if (rule.method === "REMAINDER") cents = remaining;
        cents = Math.max(0, Math.min(remaining, cents));
        remaining -= cents;
        return { envelopeId: rule.envelopeId, amount: cents / 100 };
      })
      .filter((row) => row.amount > 0),
    remainder: remaining / 100,
  };
}

export function IncomeManager({ accounts, envelopes, plans, income }: IncomeManagerProps) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Paycheck");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rules, setRules] = useState<Rule[]>(
    plans.find((plan) => plan.accountId === accounts[0]?.id)?.rules || [],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    transactionId: string;
    allocations: { envelopeId: string; amount: number }[];
    remainder: number;
  } | null>(null);

  const accountEnvelopes = envelopes.filter((envelope) => envelope.accountId === accountId);
  const preview = useMemo(
    () => previewAllocations(Number(amount || 0), rules),
    [amount, rules],
  );

  const changeAccount = (nextAccountId: string) => {
    setAccountId(nextAccountId);
    setRules(plans.find((plan) => plan.accountId === nextAccountId)?.rules || []);
    setResult(null);
  };

  const addRule = () => {
    const available = accountEnvelopes.find(
      (envelope) => !rules.some((rule) => rule.envelopeId === envelope.id),
    );
    if (!available) return;
    setRules([
      ...rules,
      {
        envelopeId: available.id,
        method: "FIXED",
        value: available.monthlyTarget || 0,
        priority: rules.length,
      },
    ]);
  };

  const updateRule = (index: number, patch: Partial<Rule>) => {
    setRules(rules.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)));
  };

  const savePlan = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/allocation-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          name: "Paycheck plan",
          enabled: true,
          rules: rules.map((rule, priority) => ({ ...rule, priority })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your plan");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your plan");
    } finally {
      setSaving(false);
    }
  };

  const recordIncome = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          amount: Number(amount),
          description,
          date,
          type: "INCOME",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record income");
      setResult({
        transactionId: data.transaction.id,
        allocations: data.allocation?.allocations || [],
        remainder: data.allocation?.remainder ?? Number(amount),
      });
      setAmount("");
      router.refresh();
    } catch (incomeError) {
      setError(incomeError instanceof Error ? incomeError.message : "Could not record income");
    } finally {
      setSaving(false);
    }
  };

  const undo = async () => {
    if (!result) return;
    setSaving(true);
    const response = await fetch(`/api/transactions?id=${result.transactionId}`, { method: "DELETE" });
    if (response.ok) {
      setResult(null);
      router.refresh();
    } else {
      const data = await response.json();
      setError(data.error || "Could not undo income");
    }
    setSaving(false);
  };

  if (!accounts.length) {
    return <Card><p className="text-ink-muted">Create a cash account before recording income.</p></Card>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Payday flow</p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Income</h1>
        <p className="mt-2 max-w-2xl text-ink-secondary">Record money once. Sprout follows your plan and shows what is still ready to assign.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {result && (
        <Card className="border border-green-200 bg-green-50/70">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-positive text-white"><Check aria-hidden="true" /></span>
            <div className="flex-1">
              <h2 className="font-bold text-ink">Income assigned</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {result.allocations.map((allocation) => (
                  <li key={allocation.envelopeId} className="flex justify-between gap-3">
                    <span>{envelopes.find((envelope) => envelope.id === allocation.envelopeId)?.name || "Envelope"}</span>
                    <strong>{formatCurrency(allocation.amount)}</strong>
                  </li>
                ))}
                <li className="flex justify-between gap-3 border-t border-green-200 pt-2">
                  <span>Ready to assign</span><strong>{formatCurrency(result.remainder)}</strong>
                </li>
              </ul>
              <Button className="mt-4" variant="outline" size="sm" onClick={undo} isLoading={saving}>Undo income</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><BadgeDollarSign aria-hidden="true" /></span>
            <div><h2 className="text-xl font-bold text-ink">Record income</h2><p className="text-sm text-ink-muted">Your saved plan runs immediately.</p></div>
          </div>
          <form onSubmit={recordIncome} className="space-y-4">
            <Select label="Deposit account" value={accountId} onChange={(event) => changeAccount(event.target.value)} options={accounts.map((account) => ({ value: account.id, label: `${account.name} · ${formatCurrency(account.balance)}` }))} />
            <Input label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required />
            <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} required />
            <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            <Button type="submit" isLoading={saving} className="w-full">Record and assign income</Button>
          </form>

          {Number(amount) > 0 && (
            <div className="mt-5 rounded-xl bg-surface-muted p-4" aria-live="polite">
              <p className="text-sm font-semibold text-ink">Paycheck preview</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
                {preview.rows.map((row) => <li key={row.envelopeId} className="flex justify-between"><span>{envelopes.find((envelope) => envelope.id === row.envelopeId)?.name}</span><span>{formatCurrency(row.amount)}</span></li>)}
                <li className="flex justify-between border-t border-line pt-1 font-semibold"><span>Ready to assign</span><span>{formatCurrency(preview.remainder)}</span></li>
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="text-xl font-bold text-ink">Automatic allocation plan</h2><p className="text-sm text-ink-muted">Rules run top to bottom against the remaining paycheck.</p></div>
            <Button size="sm" onClick={savePlan} isLoading={saving}><Save className="h-4 w-4" aria-hidden="true" /> Save plan</Button>
          </div>
          <div className="mt-5 space-y-3">
            {rules.map((rule, index) => (
              <div key={`${rule.envelopeId}-${index}`} className="rounded-xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px_44px] sm:items-end">
                  <Select label="Envelope" value={rule.envelopeId} onChange={(event) => updateRule(index, { envelopeId: event.target.value })} options={accountEnvelopes.map((envelope) => ({ value: envelope.id, label: envelope.name }))} />
                  <Select label="Rule" value={rule.method} onChange={(event) => updateRule(index, { method: event.target.value as Rule["method"], value: event.target.value === "REMAINDER" ? 0 : rule.value })} options={[{ value: "FIXED", label: "Fixed $" }, { value: "PERCENT", label: "% remaining" }, { value: "REMAINDER", label: "All remaining" }]} />
                  {rule.method === "REMAINDER" ? <div className="hidden sm:block" /> : <Input label={rule.method === "FIXED" ? "Amount" : "Percent"} type="number" inputMode="decimal" min="0" max={rule.method === "PERCENT" ? 100 : undefined} step="0.01" value={rule.value} onChange={(event) => updateRule(index, { value: Number(event.target.value) })} />}
                  <button type="button" onClick={() => setRules(rules.filter((_, ruleIndex) => ruleIndex !== index))} aria-label="Remove allocation rule" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-danger"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                {index < rules.length - 1 && <ArrowDown className="mx-auto mt-3 h-4 w-4 text-ink-muted" aria-hidden="true" />}
              </div>
            ))}
            {accountEnvelopes.length > rules.length && (
              <Button variant="outline" className="w-full" onClick={addRule}><Plus className="h-4 w-4" aria-hidden="true" /> Add allocation rule</Button>
            )}
            {!accountEnvelopes.length && <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-muted">Create a budget or goal for this account before adding rules.</p>}
          </div>
        </Card>
      </div>

      <section aria-labelledby="income-history">
        <h2 id="income-history" className="text-xl font-bold text-ink">Recent income</h2>
        <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {income.length ? income.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0"><p className="truncate font-semibold text-ink">{item.description}</p><p className="text-sm text-ink-muted">{item.accountName} · {formatDate(item.date)}</p></div>
              <strong className="text-positive">+{formatCurrency(item.amount)}</strong>
            </div>
          )) : <p className="p-6 text-center text-sm text-ink-muted">No income recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}
