"use client";

import { useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Amount } from "@/components/ui/Stat";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import {
  createBillAction,
  deleteBillAction,
  markBillPaidAction,
  skipBillAction,
  updateBillAction,
} from "@/lib/actions/bills";
import { describeFrequency, relativeDayLabel } from "@/lib/budget-math";
import { formatCurrency } from "@/lib/utils";
import { billSchema } from "@/lib/validation";
import type { ScheduleFrequency, SnapshotBill, TransactionKind } from "@/lib/data/types";

const weekdayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
  (label, value) => ({ value: String(value), label }),
);

export function BillsManager() {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [editing, setEditing] = useState<SnapshotBill | "new" | null>(null);
  const [paying, setPaying] = useState<SnapshotBill | null>(null);
  const [amount, setAmount] = useState("");

  const bills = snapshot.bills.slice().sort((a, b) => Number(a.enabled) === Number(b.enabled) ? a.nextDueAt.localeCompare(b.nextDueAt) : Number(b.enabled) - Number(a.enabled));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Stay ahead</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Bills</h1>
          <p className="mt-2 text-ink-secondary">Upcoming expenses, income, and transfers on a schedule.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add bill
        </Button>
      </div>

      {bills.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {bills.map((bill) => {
            const due = bill.enabled && new Date(bill.nextDueAt) <= new Date();
            return (
              <li key={bill.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <button type="button" onClick={() => setEditing(bill)} className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-ink">{bill.description}</p>
                  <p className="text-sm text-ink-muted">
                    {describeFrequency(bill.frequency, bill.weekday, bill.dayOfMonth, bill.month)}
                    {" · "}
                    {bill.enabled ? relativeDayLabel(bill.nextDueAt) : "Paused"}
                  </p>
                </button>
                <Amount value={bill.amount} type={bill.type === "INCOME" ? "INCOME" : bill.type === "TRANSFER" ? "TRANSFER" : "EXPENSE"} />
                {bill.enabled && (
                  <div className="flex gap-2">
                    {due && <Chip size="sm" tone="warning">Due</Chip>}
                    <Button size="sm" onClick={() => { setPaying(bill); setAmount(String(bill.amount)); }}>
                      Mark paid
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const result = await skipBillAction(bill.id);
                        if (!result.ok) toast.show({ title: result.error, variant: "error" });
                      }}
                    >
                      Skip
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<CalendarClock />} title="No bills yet" description="Add rent, subscriptions, or a regular transfer." action={<Button onClick={() => setEditing("new")}>Add a bill</Button>} />
      )}

      <BillForm
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={editing !== null}
        bill={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />

      <Sheet open={Boolean(paying)} onClose={() => setPaying(null)} title="Mark paid">
        {paying && (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await markBillPaidAction(paying.id, parseMoney(amount) || paying.amount);
              if (!result.ok) return toast.show({ title: result.error, variant: "error" });
              toast.show({ title: `${paying.description} recorded`, variant: "success" });
              setPaying(null);
            }}
          >
            <MoneyInput label="Amount" value={amount} onValueChange={setAmount} data-autofocus />
            <Button type="submit" className="w-full">Record {formatCurrency(parseMoney(amount) || paying.amount)}</Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}

function BillForm({ open, bill, onClose }: { open: boolean; bill: SnapshotBill | null; onClose: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const [description, setDescription] = useState(bill?.description ?? "");
  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [type, setType] = useState<TransactionKind>(bill?.type ?? "EXPENSE");
  const [accountId, setAccountId] = useState(bill?.accountId ?? snapshot.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(bill?.transferToAccountId ?? "");
  const [envelopeId, setEnvelopeId] = useState(bill?.envelopeId ?? "");
  const [frequency, setFrequency] = useState<ScheduleFrequency>(bill?.frequency ?? "MONTHLY");
  const [weekday, setWeekday] = useState(String(bill?.weekday ?? 1));
  const [dayOfMonth, setDayOfMonth] = useState(String(bill?.dayOfMonth ?? 1));
  const [month, setMonth] = useState(String(bill?.month ?? 1));
  const [autoPost, setAutoPost] = useState(bill?.autoPost ?? false);
  const [enabled, setEnabled] = useState(bill?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const timezone = bill?.timezone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      description: description.trim(),
      amount: parseMoney(amount),
      type: type === "ADJUSTMENT" ? "EXPENSE" : type,
      accountId,
      transferToAccountId: type === "TRANSFER" ? toAccountId : null,
      envelopeId: envelopeId || null,
      frequency,
      weekday: frequency === "WEEKLY" || frequency === "BIWEEKLY" ? Number(weekday) : null,
      dayOfMonth: frequency === "MONTHLY" || frequency === "YEARLY" ? Number(dayOfMonth) : null,
      month: frequency === "YEARLY" ? Number(month) : null,
      timezone,
      autoPost,
      enabled,
    };
    const parsed = billSchema.safeParse(payload);
    if (!parsed.success) {
      toast.show({ title: parsed.error.errors[0]?.message ?? "Check the form", variant: "error" });
      return;
    }
    setSaving(true);
    const result = bill
      ? await updateBillAction(bill.id, parsed.data)
      : await createBillAction(parsed.data);
    setSaving(false);
    if (!result.ok) return toast.show({ title: result.error, variant: "error" });
    toast.show({ title: bill ? "Bill updated" : "Bill added", variant: "success" });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={bill ? "Edit bill" : "Add a bill"}>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Rent" required />
        <MoneyInput label="Amount" value={amount} onValueChange={setAmount} />
        <Select
          label="Type"
          value={type}
          onChange={(event) => setType(event.target.value as TransactionKind)}
          options={[
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
            { value: "TRANSFER", label: "Transfer" },
          ]}
        />
        <Select
          label="Account"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          options={snapshot.accounts.map((account) => ({ value: account.id, label: account.name }))}
        />
        {type === "TRANSFER" && (
          <Select
            label="To account"
            value={toAccountId}
            onChange={(event) => setToAccountId(event.target.value)}
            options={snapshot.accounts.filter((account) => account.id !== accountId).map((account) => ({ value: account.id, label: account.name }))}
          />
        )}
        {type === "EXPENSE" && (
          <Select
            label="Envelope (optional)"
            value={envelopeId}
            onChange={(event) => setEnvelopeId(event.target.value)}
            options={[
              { value: "", label: "Uncategorized" },
              ...snapshot.envelopes
                .filter((envelope) => envelope.accountId === accountId && envelope.kind !== "GOAL")
                .map((envelope) => ({ value: envelope.id, label: envelope.name })),
            ]}
          />
        )}
        <Select
          label="Frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as ScheduleFrequency)}
          options={[
            { value: "WEEKLY", label: "Weekly" },
            { value: "BIWEEKLY", label: "Every other week" },
            { value: "MONTHLY", label: "Monthly" },
            { value: "YEARLY", label: "Yearly" },
          ]}
        />
        {(frequency === "WEEKLY" || frequency === "BIWEEKLY") && (
          <Select label="Day of week" value={weekday} onChange={(event) => setWeekday(event.target.value)} options={weekdayOptions} />
        )}
        {(frequency === "MONTHLY" || frequency === "YEARLY") && (
          <Select
            label="Day of month"
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
            options={Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))}
          />
        )}
        {frequency === "YEARLY" && (
          <Select
            label="Month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            options={["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((label, index) => ({ value: String(index + 1), label }))}
          />
        )}
        <Checkbox checked={autoPost} onChange={(event) => setAutoPost(event.target.checked)} label="Post automatically on the due date" />
        <Checkbox checked={enabled} onChange={(event) => setEnabled(event.target.checked)} label="Enabled" />
        <Button type="submit" className="w-full" isLoading={saving}>{bill ? "Save bill" : "Add bill"}</Button>
        {bill && (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-danger"
            onClick={async () => {
              const result = await deleteBillAction(bill.id);
              if (!result.ok) return toast.show({ title: result.error, variant: "error" });
              toast.show({ title: "Bill deleted", variant: "success" });
              onClose();
            }}
          >
            Delete bill
          </Button>
        )}
      </form>
    </Sheet>
  );
}
