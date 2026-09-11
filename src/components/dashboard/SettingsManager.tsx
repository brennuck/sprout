"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Download, LogOut, Plus, Repeat2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { SharingPanel } from "@/components/dashboard/ShareModal";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import {
  convertLegacyAccountAction,
  createAccountAction,
  deleteAccountAction,
  reconcileAccountAction,
  renameAccountAction,
} from "@/lib/actions/accounts";
import { importTransactionsAction } from "@/lib/actions/data";
import { setThemeAction, signOutAction } from "@/lib/actions/session";
import { formatCurrency } from "@/lib/utils";
import { THEME_OPTIONS, parseTheme, type ThemePreference } from "@/lib/theme";

export function SettingsManager({ user }: { user: { name: string | null; email: string } }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const sharingRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [creating, setCreating] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [reconcileId, setReconcileId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setTheme(parseTheme(document.documentElement.getAttribute("data-theme")));
    if (window.location.hash === "#sharing") {
      sharingRef.current?.scrollIntoView({ block: "start" });
    }
  }, []);

  const applyTheme = async (next: ThemePreference) => {
    setTheme(next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    await setThemeAction(next);
  };

  const legacy = snapshot.accounts.filter(
    (account) => ["BUDGET", "ALLOWANCE"].includes(account.type) && !account.name.endsWith("(converted)"),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Your garden</p>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Settings</h1>
        <p className="mt-2 text-ink-secondary">Accounts, appearance, sharing, and a copy of your data.</p>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-ink">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-semibold text-ink">{user.name || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-semibold text-ink">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-ink">Appearance</h2>
        <p className="mt-1 text-sm text-ink-muted">Saved on this device so the next visit matches.</p>
        <div className="mt-4">
          <SegmentedControl
            label="Theme"
            value={theme}
            onChange={applyTheme}
            options={THEME_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Accounts</h2>
            <p className="text-sm text-ink-muted">Rename, reconcile to the bank, or add another cash account.</p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add account
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {snapshot.accounts.map((account) => (
            <li key={account.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{account.name}</p>
                <p className="text-sm text-ink-muted">
                  {formatCurrency(account.balance)} in the bank · {formatCurrency(account.readyToAssign)} ready to assign
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setRenameId(account.id)}>
                  Rename
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReconcileId(account.id)}>
                  Reconcile
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${account.name}? This cannot be undone if it still has envelopes.`)) return;
                    const result = await deleteAccountAction(account.id);
                    if (!result.ok) toast.show({ title: result.error, variant: "error" });
                    else toast.show({ title: `${account.name} deleted`, variant: "success" });
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {legacy.length > 0 && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-4">
            <p className="font-semibold text-ink">Legacy accounts</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Convert old budget or allowance accounts into envelopes on a cash account.
            </p>
            <Button className="mt-3" variant="outline" onClick={() => setConvertOpen(true)}>
              <Repeat2 className="h-4 w-4" aria-hidden="true" /> Convert a legacy account
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Bills</h2>
            <p className="text-sm text-ink-muted">Upcoming expenses, income, and transfers on a schedule.</p>
          </div>
          <Link href="/bills">
            <Button variant="outline">
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> Manage bills
            </Button>
          </Link>
        </div>
      </Card>

      <section ref={sharingRef} id="sharing">
        <Card>
          <h2 className="text-xl font-bold text-ink">Sharing</h2>
          <p className="mt-1 text-sm text-ink-muted">Invite a partner and manage pending invitations.</p>
          <div className="mt-4">
            <SharingPanel />
          </div>
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-bold text-ink">Data</h2>
        <p className="mt-1 text-sm text-ink-muted">Download every transaction as CSV, or paste a file to import.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/api/export/transactions" download>
            <Button variant="outline">
              <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
            </Button>
          </a>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setImporting(true);
            const result = await importTransactionsAction(csv);
            setImporting(false);
            if (!result.ok) return toast.show({ title: result.error, variant: "error" });
            toast.show({
              title: `Imported ${result.data.imported} transaction${result.data.imported === 1 ? "" : "s"}`,
              description: result.data.errors[0],
              variant: result.data.errors.length ? "warning" : "success",
            });
            if (result.data.imported) setCsv("");
          }}
        >
          <Textarea
            label="Import CSV"
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            rows={6}
            placeholder={"date,type,description,amount,account,envelope,notes"}
          />
          <Button type="submit" isLoading={importing} disabled={!csv.trim()}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Import
          </Button>
        </form>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </Button>
      </form>

      <CreateAccountSheet open={creating} onClose={() => setCreating(false)} />
      <RenameSheet accountId={renameId} onClose={() => setRenameId(null)} />
      <ReconcileSheet accountId={reconcileId} onClose={() => setReconcileId(null)} />
      <ConvertSheet open={convertOpen} onClose={() => setConvertOpen(false)} />
    </div>
  );
}

function CreateAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<"SAVINGS" | "RETIREMENT" | "STOCK">("SAVINGS");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Add account">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          const result = await createAccountAction({
            name,
            type,
            startingBalance: parseMoney(balance) || 0,
          });
          setSaving(false);
          if (!result.ok) return toast.show({ title: result.error, variant: "error" });
          toast.show({ title: `${name} created`, variant: "success" });
          setName("");
          setBalance("");
          onClose();
        }}
      >
        <Input label="Account name" value={name} onChange={(event) => setName(event.target.value)} required data-autofocus />
        <Select
          label="Type"
          value={type}
          onChange={(event) => setType(event.target.value as "SAVINGS" | "RETIREMENT" | "STOCK")}
          options={[
            { value: "SAVINGS", label: "Cash / checking / savings" },
            { value: "RETIREMENT", label: "Retirement" },
            { value: "STOCK", label: "Investment" },
          ]}
        />
        <MoneyInput label="Current balance" value={balance} onValueChange={setBalance} />
        <Button type="submit" className="w-full" isLoading={saving}>
          Create account
        </Button>
      </form>
    </Sheet>
  );
}

function RenameSheet({ accountId, onClose }: { accountId: string | null; onClose: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const account = snapshot.accounts.find((item) => item.id === accountId);
  const [name, setName] = useState(account?.name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(account?.name ?? "");
  }, [account?.name]);

  return (
    <Sheet open={Boolean(account)} onClose={onClose} title="Rename account">
      {account && (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            const result = await renameAccountAction(account.id, name);
            setSaving(false);
            if (!result.ok) return toast.show({ title: result.error, variant: "error" });
            toast.show({ title: "Account renamed", variant: "success" });
            onClose();
          }}
        >
          <Input label="Account name" value={name} onChange={(event) => setName(event.target.value)} required data-autofocus />
          <Button type="submit" className="w-full" isLoading={saving}>
            Save name
          </Button>
        </form>
      )}
    </Sheet>
  );
}

function ReconcileSheet({ accountId, onClose }: { accountId: string | null; onClose: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const account = snapshot.accounts.find((item) => item.id === accountId);
  const [actual, setActual] = useState(account ? String(account.balance) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActual(account ? String(account.balance) : "");
  }, [account]);

  const bank = parseMoney(actual);
  const difference = account ? Math.round((bank - account.balance) * 100) / 100 : 0;

  return (
    <Sheet open={Boolean(account)} onClose={onClose} title="Reconcile">
      {account && (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            const result = await reconcileAccountAction(account.id, bank);
            setSaving(false);
            if (!result.ok) return toast.show({ title: result.error, variant: "error" });
            toast.show({
              title: difference === 0 ? "Already matches the bank" : `Adjusted by ${formatCurrency(difference)}`,
              variant: "success",
            });
            onClose();
          }}
        >
          <p className="text-sm text-ink-secondary">
            Sprout currently shows {formatCurrency(account.balance)}. Enter what the bank says and we will post an
            adjustment (excluded from cash-flow reports).
          </p>
          <MoneyInput label="Bank says" value={actual} onValueChange={setActual} data-autofocus />
          {difference !== 0 && (
            <p className="text-sm font-medium text-ink">Adjustment: {formatCurrency(difference)}</p>
          )}
          <Button type="submit" className="w-full" isLoading={saving}>
            Reconcile
          </Button>
        </form>
      )}
    </Sheet>
  );
}

function ConvertSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const router = useRouter();
  const legacy = snapshot.accounts.filter(
    (account) => ["BUDGET", "ALLOWANCE"].includes(account.type) && !account.name.endsWith("(converted)"),
  );
  const cash = snapshot.accounts.filter((account) => !["BUDGET", "ALLOWANCE"].includes(account.type));
  const [sourceId, setSourceId] = useState(legacy[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(cash[0]?.id ?? "");
  const [envelopeName, setEnvelopeName] = useState(legacy[0]?.name ?? "");
  const [kind, setKind] = useState<"BUDGET" | "SINKING_FUND" | "GOAL">("BUDGET");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!legacy.some((account) => account.id === sourceId)) {
      setSourceId(legacy[0]?.id ?? "");
      setEnvelopeName(legacy[0]?.name ?? "");
    }
    if (!cash.some((account) => account.id === destinationId)) {
      setDestinationId(cash[0]?.id ?? "");
    }
  }, [cash, destinationId, legacy, sourceId]);

  return (
    <Sheet open={open} onClose={onClose} title="Convert legacy account">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          const result = await convertLegacyAccountAction({
            sourceAccountId: sourceId,
            destinationAccountId: destinationId,
            envelopeName,
            kind,
          });
          setSaving(false);
          if (!result.ok) return toast.show({ title: result.error, variant: "error" });
          toast.show({ title: `${envelopeName} is now an envelope`, variant: "success" });
          router.refresh();
          onClose();
        }}
      >
        <Select
          label="Legacy account"
          value={sourceId}
          onChange={(event) => {
            setSourceId(event.target.value);
            setEnvelopeName(legacy.find((account) => account.id === event.target.value)?.name ?? "");
          }}
          options={legacy.map((account) => ({ value: account.id, label: account.name }))}
        />
        <Select
          label="Cash destination"
          value={destinationId}
          onChange={(event) => setDestinationId(event.target.value)}
          options={cash.map((account) => ({ value: account.id, label: account.name }))}
        />
        <Input label="Envelope name" value={envelopeName} onChange={(event) => setEnvelopeName(event.target.value)} />
        <Select
          label="Envelope type"
          value={kind}
          onChange={(event) => setKind(event.target.value as "BUDGET" | "SINKING_FUND" | "GOAL")}
          options={[
            { value: "BUDGET", label: "Monthly budget" },
            { value: "SINKING_FUND", label: "Sinking fund" },
            { value: "GOAL", label: "Goal" },
          ]}
        />
        <Button type="submit" className="w-full" isLoading={saving} disabled={!sourceId || !destinationId}>
          Convert
        </Button>
      </form>
    </Sheet>
  );
}
