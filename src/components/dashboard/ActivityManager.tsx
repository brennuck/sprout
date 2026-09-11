"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Amount } from "@/components/ui/Stat";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { useAddSheet } from "@/components/add/AddSheet";
import {
  deleteTransactionAction,
  loadTransactionsAction,
  restoreTransactionAction,
  updateTransactionAction,
} from "@/lib/actions/transactions";
import { formatCurrency, formatDate, formatMonthDay, isoDateKey } from "@/lib/utils";
import type { TransactionFilters, TransactionPage } from "@/lib/data/transactions";
import type { TransactionKind, TransactionRow } from "@/lib/data/types";

interface ActivityManagerProps {
  initial: TransactionPage;
  initialFilters: TransactionFilters;
}

export function ActivityManager({ initial, initialFilters }: ActivityManagerProps) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const { openAdd } = useAddSheet();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [page, setPage] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);

  useEffect(() => {
    if (searchParams.get("focus") === "search") {
      document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
    }
  }, [searchParams]);

  const apply = async (next: TransactionFilters, cursor?: string | null) => {
    setLoading(true);
    const result = await loadTransactionsAction(next, cursor);
    setLoading(false);
    if (!result.ok) {
      toast.show({ title: result.error, variant: "error" });
      return;
    }
    if (cursor) {
      setPage((current) => ({
        rows: [...current.rows, ...result.data.rows],
        nextCursor: result.data.nextCursor,
        total: current.total,
      }));
    } else {
      setPage(result.data);
    }
    setFilters(next);
  };

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; total: number; rows: TransactionRow[] }[] = [];
    for (const row of page.rows) {
      const key = isoDateKey(row.date);
      const last = groups[groups.length - 1];
      const signed = row.type === "INCOME" || (row.type === "ADJUSTMENT" && row.amount > 0) ? row.amount : row.type === "TRANSFER" ? 0 : -Math.abs(row.amount);
      if (last?.key === key) {
        last.rows.push(row);
        last.total += signed;
      } else {
        groups.push({ key, label: formatDate(row.date), total: signed, rows: [row] });
      }
    }
    return groups;
  }, [page.rows]);

  const activeFilters = [
    filters.type && filters.type !== "ALL" ? filters.type : null,
    filters.accountId && filters.accountId !== "ALL" ? snapshot.accounts.find((account) => account.id === filters.accountId)?.name : null,
    filters.envelopeId && filters.envelopeId !== "ALL" && filters.envelopeId !== "NONE"
      ? snapshot.envelopes.find((envelope) => envelope.id === filters.envelopeId)?.name
      : filters.envelopeId === "NONE"
        ? "Uncategorized"
        : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Ledger</p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Activity</h1>
        <p className="mt-2 text-ink-secondary">Find, review, and correct every money move.</p>
      </div>

      <Card className="p-3">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-muted" aria-hidden="true" />
            <label htmlFor="activity-search" className="sr-only">Search activity</label>
            <input
              id="activity-search"
              data-search-input
              value={filters.search ?? ""}
              onChange={(event) => void apply({ ...filters, search: event.target.value })}
              placeholder="Search activity"
              className="min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-ink focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/40"
            />
          </div>
          <Button variant="outline" onClick={() => setFilterOpen(true)} aria-label="Filters">
            <Filter className="h-4 w-4" aria-hidden="true" />
            {activeFilters.length > 0 && <span className="ml-1">{activeFilters.length}</span>}
          </Button>
        </div>
        {activeFilters.length > 0 && (
          <ChipRow className="mt-3">
            {activeFilters.map((label) => (
              <Chip key={label} size="sm" selected tone="brand">
                {label}
              </Chip>
            ))}
            <Chip size="sm" onClick={() => void apply({ search: filters.search })}>
              Clear
            </Chip>
          </ChipRow>
        )}
      </Card>

      <p className="text-sm text-ink-muted">
        {page.total >= 0 ? `${page.total} transaction${page.total === 1 ? "" : "s"}` : `${page.rows.length}+ transactions`}
      </p>

      {grouped.length ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-ink-secondary">{group.label}</h2>
                <span className="tabular text-xs text-ink-muted">{group.total === 0 ? "Transfers" : formatCurrency(group.total)}</span>
              </div>
              <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {group.rows.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{item.description}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">
                          {item.accountName}
                          {item.transferToAccountName ? ` → ${item.transferToAccountName}` : ""}
                          {item.envelopeName ? ` · ${item.envelopeName}` : ""}
                        </p>
                      </div>
                      <Amount value={item.amount} type={item.type} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No activity matches these filters." />
      )}

      {page.nextCursor && (
        <Button variant="outline" className="w-full" isLoading={loading} onClick={() => void apply(filters, page.nextCursor)}>
          Load more
        </Button>
      )}

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        footer={
          <Button className="w-full" onClick={() => setFilterOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <Select
            label="Type"
            value={filters.type ?? "ALL"}
            onChange={(event) => void apply({ ...filters, type: event.target.value as TransactionKind | "ALL" })}
            options={[
              { value: "ALL", label: "All types" },
              { value: "EXPENSE", label: "Expenses" },
              { value: "INCOME", label: "Income" },
              { value: "TRANSFER", label: "Transfers" },
              { value: "ADJUSTMENT", label: "Adjustments" },
            ]}
          />
          <Select
            label="Account"
            value={filters.accountId ?? "ALL"}
            onChange={(event) => void apply({ ...filters, accountId: event.target.value })}
            options={[{ value: "ALL", label: "All accounts" }, ...snapshot.accounts.map((account) => ({ value: account.id, label: account.name }))]}
          />
          <Select
            label="Envelope"
            value={filters.envelopeId ?? "ALL"}
            onChange={(event) => void apply({ ...filters, envelopeId: event.target.value })}
            options={[
              { value: "ALL", label: "All envelopes" },
              { value: "NONE", label: "Uncategorized" },
              ...snapshot.envelopes.map((envelope) => ({ value: envelope.id, label: envelope.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={filters.from ?? ""} onChange={(event) => void apply({ ...filters, from: event.target.value || undefined })} />
            <Input label="To" type="date" value={filters.to ?? ""} onChange={(event) => void apply({ ...filters, to: event.target.value || undefined })} />
          </div>
        </div>
      </Sheet>

      <TransactionSheet
        item={editing}
        onClose={() => setEditing(null)}
        onDelete={() => {
          if (editing) setDeleting(editing);
          setEditing(null);
        }}
        onDuplicate={(item) => {
          setEditing(null);
          openAdd(item.type === "INCOME" ? "income" : item.type === "TRANSFER" ? "transfer" : "expense", {
            amount: item.amount,
            description: item.description,
            notes: item.notes,
            accountId: item.accountId,
            toAccountId: item.transferToAccountId ?? undefined,
            envelopeId: item.envelopeId,
            goalImpactEnvelopeId: item.goalImpactEnvelopeId,
          });
        }}
      />

      <Sheet open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete transaction?">
        <p className="text-sm text-ink-secondary">This reverses the related account and envelope balances.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!deleting) return;
              const result = await deleteTransactionAction(deleting.id);
              if (!result.ok) return toast.show({ title: result.error, variant: "error" });
              const payload = result.data;
              toast.show({
                title: "Transaction deleted",
                variant: "success",
                action: {
                  label: "Undo",
                  onClick: async () => {
                    const undo = await restoreTransactionAction(payload);
                    if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
                  },
                },
              });
              setDeleting(null);
              void apply(filters);
            }}
          >
            Delete
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function TransactionSheet({
  item,
  onClose,
  onDelete,
  onDuplicate,
}: {
  item: TransactionRow | null;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: (item: TransactionRow) => void;
}) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [envelopeId, setEnvelopeId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setDescription(item.description);
    setAmount(String(item.amount));
    setDate(isoDateKey(item.date));
    setNotes(item.notes ?? "");
    setEnvelopeId(item.envelopeId ?? "");
    setGoalId(item.goalImpactEnvelopeId ?? "");
  }, [item]);

  const editable = item && item.type !== "TRANSFER" && item.type !== "ADJUSTMENT";

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item || !editable) return;
    setSaving(true);
    const result = await updateTransactionAction({
      id: item.id,
      description,
      amount: parseMoney(amount),
      date,
      notes: notes || null,
      envelopeId: envelopeId || null,
      goalImpactEnvelopeId: goalId || null,
    });
    setSaving(false);
    if (!result.ok) return toast.show({ title: result.error, variant: "error" });
    toast.show({ title: "Transaction updated", variant: "success" });
    onClose();
    router.refresh();
  };

  return (
    <Sheet open={Boolean(item)} onClose={onClose} title={item?.description ?? "Transaction"} description={item ? `${item.accountName} · ${formatMonthDay(item.date)}` : undefined}>
      {item && (
        <form onSubmit={save} className="space-y-4">
          <p className="text-3xl font-bold tabular text-ink">
            <Amount value={item.amount} type={item.type} className="text-3xl" />
          </p>
          {editable ? (
            <>
              <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} required />
              <MoneyInput label="Amount" value={amount} onValueChange={setAmount} />
              <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              {item.type === "EXPENSE" && (
                <>
                  <Select
                    label="Spending envelope"
                    value={envelopeId}
                    onChange={(event) => setEnvelopeId(event.target.value)}
                    options={[
                      { value: "", label: "Uncategorized" },
                      ...snapshot.envelopes
                        .filter((envelope) => envelope.accountId === item.accountId && envelope.kind !== "GOAL")
                        .map((envelope) => ({ value: envelope.id, label: `${envelope.name} · ${formatCurrency(envelope.balance)}` })),
                    ]}
                  />
                  <Select
                    label="Goal impact"
                    value={goalId}
                    onChange={(event) => setGoalId(event.target.value)}
                    options={[
                      { value: "", label: "Do not include" },
                      ...snapshot.envelopes.filter((envelope) => envelope.kind === "GOAL").map((envelope) => ({ value: envelope.id, label: envelope.name })),
                    ]}
                  />
                </>
              )}
              <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
              <Button type="submit" className="w-full" isLoading={saving}>Save changes</Button>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Transfers and adjustments cannot be edited. Delete and recreate them instead.</p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onDuplicate(item)}>
              Duplicate
            </Button>
            <Button type="button" variant="destructive" className="flex-1" onClick={onDelete}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
