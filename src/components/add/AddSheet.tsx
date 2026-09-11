"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, BadgeDollarSign, Receipt, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { useLocalPreference } from "@/lib/hooks/useLocalPreference";
import { PayeeField } from "@/components/add/PayeeField";
import {
  addTransactionAction,
  addTransferAction,
  deleteTransactionAction,
} from "@/lib/actions/transactions";
import { calculateAllocations } from "@/lib/allocation-math";
import { formatCurrency } from "@/lib/utils";
import { percent } from "@/lib/budget-math";
import type { SnapshotEnvelope, SnapshotPayee } from "@/lib/data/types";

export type AddMode = "expense" | "income" | "transfer";

export interface AddPrefill {
  amount?: number;
  description?: string;
  notes?: string | null;
  accountId?: string;
  toAccountId?: string;
  envelopeId?: string | null;
  goalImpactEnvelopeId?: string | null;
  date?: string;
}

interface AddSheetContextValue {
  openAdd: (mode?: AddMode, prefill?: AddPrefill) => void;
  closeAdd: () => void;
}

const AddSheetContext = createContext<AddSheetContextValue | null>(null);

export function useAddSheet() {
  const context = useContext(AddSheetContext);
  if (!context) throw new Error("useAddSheet must be used within <AddSheetProvider>");
  return context;
}

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const shiftDay = (key: string, delta: number) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function AddSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("expense");
  const [prefill, setPrefill] = useState<AddPrefill | undefined>();
  const [session, setSession] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();

  const openAdd = useCallback((nextMode: AddMode = "expense", nextPrefill?: AddPrefill) => {
    setMode(nextMode);
    setPrefill(nextPrefill);
    setSession((value) => value + 1);
    setOpen(true);
  }, []);
  const closeAdd = useCallback(() => setOpen(false), []);

  // Manifest shortcut and deep links: /dashboard?add=expense
  useEffect(() => {
    const requested = searchParams.get("add");
    if (requested === "expense" || requested === "income" || requested === "transfer") {
      openAdd(requested);
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, openAdd, router]);

  const value = useMemo(() => ({ openAdd, closeAdd }), [openAdd, closeAdd]);

  return (
    <AddSheetContext.Provider value={value}>
      {children}
      <AddSheet key={session} open={open} mode={mode} onModeChange={setMode} onClose={closeAdd} prefill={prefill} />
    </AddSheetContext.Provider>
  );
}

interface AddSheetProps {
  open: boolean;
  mode: AddMode;
  onModeChange: (mode: AddMode) => void;
  onClose: () => void;
  prefill?: AddPrefill;
}

function AddSheet({ open, mode, onModeChange, onClose, prefill }: AddSheetProps) {
  const snapshot = useSnapshot();
  const hasAccounts = snapshot.accounts.length > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mode === "expense" ? "Add expense" : mode === "income" ? "Record income" : "Transfer money"}
      hideTitle
      size="md"
      headerAccessory={undefined}
    >
      {!hasAccounts ? (
        <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-secondary">
          Create a cash account in Settings before adding money moves.
        </p>
      ) : (
        <div className="space-y-5">
          <SegmentedControl<AddMode>
            label="What are you adding?"
            value={mode}
            onChange={onModeChange}
            options={[
              { value: "expense", label: "Expense", icon: <Receipt className="h-4 w-4" aria-hidden="true" /> },
              { value: "income", label: "Income", icon: <BadgeDollarSign className="h-4 w-4" aria-hidden="true" /> },
              {
                value: "transfer",
                label: "Transfer",
                icon: <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />,
                disabled: snapshot.accounts.length < 2,
              },
            ]}
          />
          {mode === "expense" && <ExpenseForm prefill={prefill} onDone={onClose} />}
          {mode === "income" && <IncomeForm prefill={prefill} onDone={onClose} />}
          {mode === "transfer" && <TransferForm prefill={prefill} onDone={onClose} />}
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function AccountChips({
  value,
  onChange,
  label = "Account",
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  exclude?: string;
}) {
  const snapshot = useSnapshot();
  const accounts = snapshot.accounts.filter((account) => account.id !== exclude);
  if (accounts.length <= 1 && !exclude) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink-secondary">{label}</p>
      <ChipRow>
        {accounts.map((account) => (
          <Chip key={account.id} selected={account.id === value} onClick={() => onChange(account.id)}>
            {account.name}
            <span className="ml-1 text-xs opacity-80">{formatCurrency(account.balance)}</span>
          </Chip>
        ))}
      </ChipRow>
    </div>
  );
}

function DateChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const today = todayKey();
  const yesterday = shiftDay(today, -1);
  const custom = value !== today && value !== yesterday;
  const [showPicker, setShowPicker] = useState(custom);
  useEffect(() => {
    if (custom) setShowPicker(true);
  }, [custom]);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-ink-secondary">Date</p>
      <div className="flex flex-wrap items-center gap-2">
        <Chip selected={value === today && !showPicker} onClick={() => { onChange(today); setShowPicker(false); }}>Today</Chip>
        <Chip selected={value === yesterday && !showPicker} onClick={() => { onChange(yesterday); setShowPicker(false); }}>Yesterday</Chip>
        <Chip selected={showPicker} onClick={() => setShowPicker(true)}>Pick a date</Chip>
      </div>
      {showPicker && (
        <Input
          type="date"
          aria-label="Transaction date"
          value={value}
          max={shiftDay(today, 365)}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function useAccountDefault(prefill?: string) {
  const snapshot = useSnapshot();
  const [lastAccount, setLastAccount, ready] = useLocalPreference<string>("last-account", "");
  const hasPrefill = Boolean(prefill && snapshot.accounts.some((account) => account.id === prefill));
  const [accountId, setAccountId] = useState(hasPrefill ? (prefill as string) : snapshot.accounts[0]?.id ?? "");
  const [applied, setApplied] = useState(false);

  // Once the stored preference loads, prefer the last-used account unless a prefill was given.
  useEffect(() => {
    if (applied || !ready) return;
    setApplied(true);
    if (!hasPrefill && lastAccount && snapshot.accounts.some((account) => account.id === lastAccount)) {
      setAccountId(lastAccount);
    }
  }, [applied, ready, hasPrefill, lastAccount, snapshot.accounts]);

  return { accountId, setAccountId, remember: setLastAccount };
}

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

function ExpenseForm({ prefill, onDone }: { prefill?: AddPrefill; onDone: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const { accountId, setAccountId, remember } = useAccountDefault(prefill?.accountId);
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [envelopeId, setEnvelopeId] = useState<string>(prefill?.envelopeId ?? "");
  const [date, setDate] = useState(prefill?.date ?? todayKey());
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [showNotes, setShowNotes] = useState(Boolean(prefill?.notes));
  const [trackGoal, setTrackGoal] = useState(
    prefill?.goalImpactEnvelopeId !== undefined ? Boolean(prefill.goalImpactEnvelopeId) : Boolean(snapshot.focusGoalId),
  );
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const envelopes = useMemo(
    () =>
      snapshot.envelopes
        .filter((envelope) => envelope.accountId === accountId && envelope.kind !== "GOAL")
        .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === "BUDGET" ? -1 : 1)),
    [snapshot.envelopes, accountId],
  );
  const focusGoal = snapshot.envelopes.find((envelope) => envelope.id === snapshot.focusGoalId) ?? null;
  const value = parseMoney(amount);
  const selectedEnvelope = envelopes.find((envelope) => envelope.id === envelopeId);

  const onPickPayee = (payee: SnapshotPayee) => {
    if (payee.lastAccountId && snapshot.accounts.some((account) => account.id === payee.lastAccountId)) {
      setAccountId(payee.lastAccountId);
    }
    if (payee.lastEnvelopeId && snapshot.envelopes.some((envelope) => envelope.id === payee.lastEnvelopeId)) {
      setEnvelopeId(payee.lastEnvelopeId);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (value <= 0) return setError({ field: "amount", message: "Enter an amount greater than zero" });
    if (!description.trim()) return setError({ field: "description", message: "What was this for?" });

    const payload = {
      type: "EXPENSE" as const,
      accountId,
      amount: value,
      description: description.trim(),
      notes: notes.trim() || null,
      envelopeId: envelopeId || null,
      goalImpactEnvelopeId: trackGoal && focusGoal ? focusGoal.id : null,
      date,
    };

    remember(accountId);
    setSubmitting(true);
    onDone();
    const toastId = toast.show({ title: `Adding ${formatCurrency(value)}…`, variant: "loading" });
    const result = await addTransactionAction(payload);
    setSubmitting(false);
    if (!result.ok) {
      toast.update(toastId, { title: "Could not add expense", description: result.error, variant: "error" });
      return;
    }
    const id = result.data.transaction?.id;
    toast.update(toastId, {
      title: `${formatCurrency(value)} spent on ${payload.description}`,
      description: selectedEnvelope ? `From ${selectedEnvelope.name}` : "Uncategorized",
      variant: "success",
      action: id
        ? {
            label: "Undo",
            onClick: async () => {
              const undo = await deleteTransactionAction(id);
              if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
            },
          }
        : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <MoneyInput
        size="hero"
        label="Amount"
        value={amount}
        onValueChange={setAmount}
        error={error?.field === "amount" ? error.message : undefined}
        data-autofocus
        aria-label="Amount"
      />
      <PayeeField
        label="What was it for?"
        placeholder="Groceries, Netflix, Coffee…"
        value={description}
        onChange={setDescription}
        onPick={onPickPayee}
        payees={snapshot.payees}
        error={error?.field === "description" ? error.message : undefined}
      />
      <AccountChips value={accountId} onChange={(id) => { setAccountId(id); setEnvelopeId(""); }} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink-secondary">Envelope</p>
        {envelopes.length ? (
          <ChipRow>
            <Chip selected={!envelopeId} onClick={() => setEnvelopeId("")}>Uncategorized</Chip>
            {envelopes.map((envelope) => (
              <EnvelopeChip
                key={envelope.id}
                envelope={envelope}
                selected={envelope.id === envelopeId}
                onClick={() => setEnvelopeId(envelope.id)}
                pending={envelope.id === envelopeId ? value : 0}
              />
            ))}
          </ChipRow>
        ) : (
          <p className="text-sm text-ink-muted">No envelopes in this account yet. This will be uncategorized.</p>
        )}
        {selectedEnvelope && value > selectedEnvelope.balance && (
          <p className="text-sm font-medium text-warning" role="status">
            This overspends {selectedEnvelope.name} by {formatCurrency(value - selectedEnvelope.balance)}. You can cover it later from Plan.
          </p>
        )}
      </div>
      <DateChips value={date} onChange={setDate} />
      {showNotes ? (
        <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={500} />
      ) : (
        <button type="button" onClick={() => setShowNotes(true)} className="text-sm font-semibold text-brand-strong hover:underline">
          + Add a note
        </button>
      )}
      {focusGoal && (
        <div className="rounded-xl border border-line bg-brand-soft/40 p-3.5">
          <Checkbox
            checked={trackGoal}
            onChange={(event) => setTrackGoal(event.target.checked)}
            label={
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" /> Weigh this against {focusGoal.name}
              </span>
            }
            description={
              value > 0 && focusGoal.targetAmount
                ? `${percent(value, focusGoal.targetAmount).toFixed(1)}% of your goal. Saved progress never changes.`
                : "Shows the opportunity cost in reports. Saved progress never changes."
            }
          />
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
        Add expense
      </Button>
    </form>
  );
}

function EnvelopeChip({
  envelope,
  selected,
  onClick,
  pending,
}: {
  envelope: SnapshotEnvelope;
  selected: boolean;
  onClick: () => void;
  pending: number;
}) {
  const remaining = envelope.balance - pending;
  return (
    <Chip selected={selected} onClick={onClick} tone={envelope.balance < 0 ? "danger" : "neutral"}>
      {envelope.icon && <span aria-hidden="true">{envelope.icon}</span>}
      {envelope.name}
      <span className={`ml-1 text-xs ${selected ? "opacity-90" : remaining < 0 ? "text-danger" : "text-ink-muted"}`}>
        {formatCurrency(remaining)}
      </span>
    </Chip>
  );
}

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

function IncomeForm({ prefill, onDone }: { prefill?: AddPrefill; onDone: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const { accountId, setAccountId, remember } = useAccountDefault(prefill?.accountId);
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : "");
  const [description, setDescription] = useState(prefill?.description ?? "Paycheck");
  const [date, setDate] = useState(prefill?.date ?? todayKey());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const value = parseMoney(amount);
  const plan = snapshot.plans.find((item) => item.accountId === accountId && item.enabled);
  const preview = useMemo(() => {
    if (!plan || value <= 0) return null;
    const activeRules = plan.rules.filter((rule) =>
      snapshot.envelopes.some((envelope) => envelope.id === rule.envelopeId && envelope.accountId === accountId),
    );
    return calculateAllocations(value, activeRules);
  }, [plan, value, snapshot.envelopes, accountId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (value <= 0) return setError("Enter an amount greater than zero");
    if (!description.trim()) return setError("Where did this money come from?");
    remember(accountId);
    setSubmitting(true);
    onDone();
    const toastId = toast.show({ title: `Recording ${formatCurrency(value)}…`, variant: "loading" });
    const result = await addTransactionAction({
      type: "INCOME",
      accountId,
      amount: value,
      description: description.trim(),
      date,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.update(toastId, { title: "Could not record income", description: result.error, variant: "error" });
      return;
    }
    const allocation = result.data.allocation;
    const id = result.data.transaction?.id;
    toast.update(toastId, {
      title: `${formatCurrency(value)} recorded`,
      description: allocation && allocation.allocations.length
        ? `${formatCurrency(allocation.allocated)} assigned by your plan · ${formatCurrency(allocation.remainder)} ready to assign`
        : "All of it is ready to assign",
      variant: "success",
      action: id
        ? {
            label: "Undo",
            onClick: async () => {
              const undo = await deleteTransactionAction(id);
              if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
            },
          }
        : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <MoneyInput size="hero" label="Amount" value={amount} onValueChange={setAmount} error={error ?? undefined} data-autofocus />
      <Input label="Source" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Paycheck" />
      <AccountChips value={accountId} onChange={setAccountId} label="Deposit into" />
      <DateChips value={date} onChange={setDate} />
      {value > 0 && (
        <div className="rounded-xl bg-surface-muted p-4" aria-live="polite">
          <p className="text-sm font-semibold text-ink">Paycheck preview</p>
          {preview && preview.allocations.length ? (
            <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
              {preview.allocations.map((row) => (
                <li key={row.envelopeId} className="flex justify-between gap-3">
                  <span className="truncate">{snapshot.envelopes.find((envelope) => envelope.id === row.envelopeId)?.name ?? "Envelope"}</span>
                  <span className="tabular">{formatCurrency(row.amount)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-line pt-1 font-semibold text-ink">
                <span>Ready to assign</span>
                <span className="tabular">{formatCurrency(preview.remainder)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              No paycheck plan for this account, so the full amount lands in ready to assign.
            </p>
          )}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
        Record income
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Transfer
// ---------------------------------------------------------------------------

function TransferForm({ prefill, onDone }: { prefill?: AddPrefill; onDone: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const { accountId: fromId, setAccountId: setFromId } = useAccountDefault(prefill?.accountId);
  const [toId, setToId] = useState(
    prefill?.toAccountId ?? snapshot.accounts.find((account) => account.id !== fromId)?.id ?? "",
  );
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [date, setDate] = useState(prefill?.date ?? todayKey());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (toId === fromId) {
      setToId(snapshot.accounts.find((account) => account.id !== fromId)?.id ?? "");
    }
  }, [fromId, toId, snapshot.accounts]);

  const value = parseMoney(amount);
  const from = snapshot.accounts.find((account) => account.id === fromId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (value <= 0) return setError("Enter an amount greater than zero");
    if (!toId) return setError("Choose a destination account");
    if (from && value > from.balance) return setError(`${from.name} only has ${formatCurrency(from.balance)}`);
    setSubmitting(true);
    onDone();
    const toastId = toast.show({ title: `Transferring ${formatCurrency(value)}…`, variant: "loading" });
    const result = await addTransferAction({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: value,
      description: description.trim() || undefined,
      date,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.update(toastId, { title: "Could not transfer", description: result.error, variant: "error" });
      return;
    }
    const id = result.data.transaction?.id;
    toast.update(toastId, {
      title: `${formatCurrency(value)} moved to ${snapshot.accounts.find((account) => account.id === toId)?.name ?? "account"}`,
      variant: "success",
      action: id
        ? {
            label: "Undo",
            onClick: async () => {
              const undo = await deleteTransactionAction(id);
              if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
            },
          }
        : undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <MoneyInput size="hero" label="Amount" value={amount} onValueChange={setAmount} error={error ?? undefined} data-autofocus />
      <AccountChips value={fromId} onChange={setFromId} label="From" />
      <Select
        label="To"
        value={toId}
        onChange={(event) => setToId(event.target.value)}
        options={snapshot.accounts
          .filter((account) => account.id !== fromId)
          .map((account) => ({ value: account.id, label: `${account.name} · ${formatCurrency(account.balance)}` }))}
      />
      <Input label="Note (optional)" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Moving savings" />
      <DateChips value={date} onChange={setDate} />
      <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
        Transfer
      </Button>
    </form>
  );
}
