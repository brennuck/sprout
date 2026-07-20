"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BudgetAccount, BudgetEnvelope } from "@/components/dashboard/BudgetManager";

interface ActivityItem {
  id: string;
  amount: number;
  description: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  date: string;
  accountId: string;
  accountName: string;
  transferToAccountId: string | null;
  envelopeId: string | null;
  envelopeName: string | null;
  goalImpactEnvelopeId: string | null;
  goalImpactName: string | null;
}

export function ActivityManager({
  transactions,
  accounts,
  envelopes,
  initialEnvelopeId,
}: {
  transactions: ActivityItem[];
  accounts: BudgetAccount[];
  envelopes: BudgetEnvelope[];
  initialEnvelopeId?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [accountId, setAccountId] = useState("ALL");
  const [envelopeId, setEnvelopeId] = useState(initialEnvelopeId || "ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const [deleting, setDeleting] = useState<ActivityItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editEnvelopeId, setEditEnvelopeId] = useState("");
  const [editGoalId, setEditGoalId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = 15;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((item) => {
      if (query && !item.description.toLowerCase().includes(query)) return false;
      if (type !== "ALL" && item.type !== type) return false;
      if (accountId !== "ALL" && item.accountId !== accountId && item.transferToAccountId !== accountId) return false;
      if (envelopeId !== "ALL" && item.envelopeId !== envelopeId) return false;
      return true;
    });
  }, [transactions, search, type, accountId, envelopeId]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const applyFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const openEdit = (item: ActivityItem) => {
    setEditing(item);
    setEditDescription(item.description);
    setEditAmount(String(item.amount));
    setEditDate(item.date.slice(0, 10));
    setEditEnvelopeId(item.envelopeId || "");
    setEditGoalId(item.goalImpactEnvelopeId || "");
    setError("");
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setLoading(true);
    const response = await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        description: editDescription,
        amount: Number(editAmount),
        date: editDate,
        envelopeId: editEnvelopeId || null,
        goalImpactEnvelopeId: editGoalId || null,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      setEditing(null);
      router.refresh();
    } else setError(data.error || "Could not update transaction");
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setLoading(true);
    const endpoint = deleting.type === "TRANSFER" ? "/api/transfers" : "/api/transactions";
    const response = await fetch(`${endpoint}?id=${deleting.id}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) {
      setDeleting(null);
      router.refresh();
    } else setError(data.error || "Could not delete transaction");
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Ledger</p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Activity</h1>
        <p className="mt-2 text-ink-secondary">Find, review, and correct every money move.</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-muted" aria-hidden="true" />
            <label htmlFor="activity-search" className="sr-only">Search activity</label>
            <input id="activity-search" value={search} onChange={(event) => applyFilter(setSearch, event.target.value)} placeholder="Search activity" className="min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm text-ink focus-visible:ring-2 focus-visible:ring-focus" />
          </div>
          <Select aria-label="Transaction type" value={type} onChange={(event) => applyFilter(setType, event.target.value)} options={[{ value: "ALL", label: "All types" }, { value: "EXPENSE", label: "Expenses" }, { value: "INCOME", label: "Income" }, { value: "TRANSFER", label: "Transfers" }]} />
          <Select aria-label="Account" value={accountId} onChange={(event) => applyFilter(setAccountId, event.target.value)} options={[{ value: "ALL", label: "All accounts" }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]} />
          <Select aria-label="Envelope" value={envelopeId} onChange={(event) => applyFilter(setEnvelopeId, event.target.value)} options={[{ value: "ALL", label: "All envelopes" }, ...envelopes.map((envelope) => ({ value: envelope.id, label: envelope.name }))]} />
        </div>
      </Card>

      <Card className="p-0">
        <div className="border-b border-line px-4 py-3 text-sm text-ink-muted">{filtered.length} transaction{filtered.length === 1 ? "" : "s"}</div>
        <ul className="divide-y divide-line">
          {visible.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-ink">{item.description}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {item.accountName} · {formatDate(item.date)}
                  {item.envelopeName ? ` · ${item.envelopeName}` : ""}
                </p>
                {item.goalImpactName && <p className="mt-1 text-xs font-medium text-brand">Hypothetical impact tracked against {item.goalImpactName}</p>}
              </div>
              <span className={`whitespace-nowrap text-sm font-bold ${item.type === "INCOME" ? "text-positive" : "text-ink"}`}>
                {item.type === "INCOME" ? "+" : item.type === "EXPENSE" ? "−" : ""}{formatCurrency(item.amount)}
              </span>
              <div className="flex">
                {item.type !== "TRANSFER" && <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.description}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-brand"><Pencil className="h-4 w-4" aria-hidden="true" /></button>}
                <button type="button" onClick={() => { setDeleting(item); setError(""); }} aria-label={`Delete ${item.description}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-danger"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            </li>
          ))}
          {!visible.length && <li className="p-10 text-center text-sm text-ink-muted">No activity matches these filters.</li>}
        </ul>
        {totalPages > 1 && <div className="flex items-center justify-between border-t border-line p-4"><Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-ink-muted">Page {page} of {totalPages}</span><Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
      </Card>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="Edit transaction">
        <form onSubmit={saveEdit} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Input label="Description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} required />
          <Input label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} required />
          <Input label="Date" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} required />
          {editing?.type === "EXPENSE" && <>
            <Select label="Budget envelope" value={editEnvelopeId} onChange={(event) => setEditEnvelopeId(event.target.value)} options={[{ value: "", label: "Uncategorized" }, ...envelopes.filter((envelope) => envelope.accountId === editing.accountId && envelope.kind === "BUDGET").map((envelope) => ({ value: envelope.id, label: envelope.name }))]} />
            <Select label="Goal impact" value={editGoalId} onChange={(event) => setEditGoalId(event.target.value)} options={[{ value: "", label: "Do not include" }, ...envelopes.filter((envelope) => envelope.kind === "GOAL").map((envelope) => ({ value: envelope.id, label: envelope.name }))]} />
          </>}
          <Button type="submit" className="w-full" isLoading={loading}>Save changes</Button>
        </form>
      </Modal>

      <Modal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete transaction?">
        <p className="text-sm text-ink-secondary">This reverses the related account and envelope balances. This action cannot be undone.</p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-3"><Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete} isLoading={loading}>Delete</Button></div>
      </Modal>
    </div>
  );
}
