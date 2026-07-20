"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Repeat2, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { formatCurrency } from "@/lib/utils";

interface SettingsAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export function SettingsManager({
  user,
  accounts,
}: {
  user: { name: string | null; email: string };
  accounts: SettingsAccount[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"account" | "convert" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("SAVINGS");
  const [balance, setBalance] = useState("");
  const legacy = accounts.filter((account) => ["BUDGET", "ALLOWANCE"].includes(account.type) && !account.name.endsWith("(converted)"));
  const cashAccounts = accounts.filter((account) => !["BUDGET", "ALLOWANCE"].includes(account.type));
  const [sourceId, setSourceId] = useState(legacy[0]?.id || "");
  const [destinationId, setDestinationId] = useState(cashAccounts[0]?.id || "");
  const [envelopeName, setEnvelopeName] = useState(legacy[0]?.name || "");
  const [kind, setKind] = useState<"BUDGET" | "GOAL">("BUDGET");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(url: string, init: RequestInit) {
    setLoading(true);
    setError("");
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (response.ok) {
      setModal(null);
      router.refresh();
    } else setError(data.error || "Could not save changes");
    setLoading(false);
  }

  const createAccount = (event: React.FormEvent) => {
    event.preventDefault();
    return submit("/api/accounts", {
      method: "POST",
      body: JSON.stringify({
        name,
        type,
        startingBalance: Number(balance || 0),
      }),
    });
  };

  const convert = (event: React.FormEvent) => {
    event.preventDefault();
    return submit("/api/accounts", {
      method: "PATCH",
      body: JSON.stringify({
        action: "CONVERT_LEGACY",
        sourceAccountId: sourceId,
        destinationAccountId: destinationId,
        envelopeName,
        kind,
      }),
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Preferences</p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Settings</h1>
        <p className="mt-2 text-ink-secondary">Accounts, collaboration, and migration tools.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-ink">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-ink-muted">Name</dt><dd className="font-semibold text-ink">{user.name || "Not set"}</dd></div>
            <div><dt className="text-ink-muted">Email</dt><dd className="font-semibold text-ink">{user.email}</dd></div>
          </dl>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-xl font-bold text-ink">Household sharing</h2><p className="mt-1 text-sm text-ink-muted">Invite your partner with view or edit access.</p></div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Users aria-hidden="true" /></span>
          </div>
          <Button className="mt-5" variant="outline" onClick={() => setShareOpen(true)}>Manage sharing</Button>
        </Card>
      </div>

      <section aria-labelledby="accounts-heading">
        <div className="flex items-end justify-between gap-3">
          <div><h2 id="accounts-heading" className="text-xl font-bold text-ink">Cash accounts</h2><p className="text-sm text-ink-muted">Balances represent where your real money lives.</p></div>
          <Button size="sm" onClick={() => setModal("account")}><Plus className="h-4 w-4" aria-hidden="true" /> Add account</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => <Card key={account.id} className="p-4"><p className="font-semibold text-ink">{account.name}</p><p className="text-xs uppercase tracking-wide text-ink-muted">{account.type}</p><p className="mt-3 text-xl font-bold text-ink">{formatCurrency(account.balance)}</p></Card>)}
        </div>
      </section>

      {legacy.length > 0 && (
        <Card className="border border-amber-200 bg-amber-50/70">
          <div className="flex items-start gap-3">
            <Repeat2 className="mt-1 h-5 w-5 flex-none text-warning" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-bold text-ink">Convert legacy budget accounts</h2>
              <p className="mt-1 text-sm text-ink-secondary">Move the real cash into a cash account and create a linked virtual envelope. Nothing happens until you review and confirm.</p>
              {cashAccounts.length ? <Button className="mt-4" variant="outline" onClick={() => setModal("convert")}>Start conversion <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button> : <p className="mt-3 text-sm font-semibold text-warning">Create a savings or investment account first.</p>}
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={modal === "account"} onClose={() => setModal(null)} title="Add cash account">
        <form onSubmit={createAccount} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Input label="Account name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Main checking" required />
          <Select label="Account type" value={type} onChange={(event) => setType(event.target.value)} options={[{ value: "SAVINGS", label: "Cash / savings" }, { value: "RETIREMENT", label: "Retirement" }, { value: "STOCK", label: "Investment" }]} />
          <Input label="Current balance" type="number" inputMode="decimal" min="0" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="0.00" />
          <Button type="submit" className="w-full" isLoading={loading}>Create account</Button>
        </form>
      </Modal>

      <Modal isOpen={modal === "convert"} onClose={() => setModal(null)} title="Convert legacy account">
        <form onSubmit={convert} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Select label="Legacy account" value={sourceId} onChange={(event) => { setSourceId(event.target.value); setEnvelopeName(accounts.find((account) => account.id === event.target.value)?.name || ""); }} options={legacy.map((account) => ({ value: account.id, label: `${account.name} · ${formatCurrency(account.balance)}` }))} />
          <Select label="Move cash to" value={destinationId} onChange={(event) => setDestinationId(event.target.value)} options={cashAccounts.map((account) => ({ value: account.id, label: account.name }))} />
          <Input label="New envelope name" value={envelopeName} onChange={(event) => setEnvelopeName(event.target.value)} required />
          <Select label="Envelope type" value={kind} onChange={(event) => setKind(event.target.value as "BUDGET" | "GOAL")} options={[{ value: "BUDGET", label: "Budget" }, { value: "GOAL", label: "Goal" }]} />
          <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-secondary">The entire current balance will move to the destination account and be assigned to the new envelope. Historical activity stays with the legacy account.</p>
          <Button type="submit" className="w-full" isLoading={loading}>Confirm conversion</Button>
        </form>
      </Modal>

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
