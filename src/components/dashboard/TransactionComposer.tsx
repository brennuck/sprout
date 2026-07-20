"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import type { BudgetAccount, BudgetEnvelope } from "@/components/dashboard/BudgetManager";

interface TransactionComposerProps {
  accounts: BudgetAccount[];
  envelopes: BudgetEnvelope[];
  focusGoalId?: string | null;
  label?: string;
}

export function TransactionComposer({
  accounts,
  envelopes,
  focusGoalId,
  label = "Add expense",
}: TransactionComposerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [envelopeId, setEnvelopeId] = useState("");
  const [goalImpactEnvelopeId, setGoalImpactEnvelopeId] = useState(focusGoalId || "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goals = envelopes.filter((envelope) => envelope.kind === "GOAL");
  const focusGoal = goals.find((goal) => goal.id === goalImpactEnvelopeId);
  const impact = useMemo(() => {
    const value = Number(amount);
    if (!focusGoal || !value) return null;
    const targetPercent = focusGoal.targetAmount
      ? (value / focusGoal.targetAmount) * 100
      : null;
    const delayDays = focusGoal.monthlyTarget
      ? Math.ceil((value / focusGoal.monthlyTarget) * 30)
      : null;
    return { targetPercent, delayDays };
  }, [amount, focusGoal]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          envelopeId: envelopeId || null,
          goalImpactEnvelopeId: goalImpactEnvelopeId || null,
          amount: Number(amount),
          description,
          date,
          type: "EXPENSE",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add expense");
      setOpen(false);
      setAmount("");
      setDescription("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!accounts.length}>
        <Plus className="h-4 w-4" aria-hidden="true" /> {label}
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add an expense">
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Input label="What did you spend on?" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Groceries" required />
          <Input label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required />
          <Select label="Cash account" value={accountId} onChange={(event) => { setAccountId(event.target.value); setEnvelopeId(""); }} options={accounts.map((account) => ({ value: account.id, label: account.name }))} />
          <Select label="Budget envelope (optional)" value={envelopeId} onChange={(event) => setEnvelopeId(event.target.value)} options={[{ value: "", label: "Uncategorized" }, ...envelopes.filter((envelope) => envelope.accountId === accountId && envelope.kind === "BUDGET").map((envelope) => ({ value: envelope.id, label: `${envelope.name} · ${formatCurrency(envelope.balance)} available` }))]} />
          <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />

          {goals.length > 0 && (
            <div className="rounded-xl border border-line bg-brand-soft/50 p-4">
              <Select label="Show opportunity cost against" value={goalImpactEnvelopeId} onChange={(event) => setGoalImpactEnvelopeId(event.target.value)} options={[{ value: "", label: "Do not include this expense" }, ...goals.map((goal) => ({ value: goal.id, label: goal.name }))]} />
              {focusGoal && Number(amount) > 0 && (
                <p className="mt-3 text-sm text-ink-secondary" aria-live="polite">
                  Hypothetically, {formatCurrency(Number(amount))} is{" "}
                  {impact?.targetPercent != null ? `${impact.targetPercent.toFixed(1)}% of ${focusGoal.name}` : `money that could go toward ${focusGoal.name}`}
                  {impact?.delayDays ? ` and about ${impact.delayDays} days at your current pace` : ""}.
                  <strong className="mt-1 block text-ink">Your saved goal progress will not change.</strong>
                </p>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" isLoading={loading}>Add expense</Button>
        </form>
      </Modal>
    </>
  );
}
