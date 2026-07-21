"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowRightLeft,
  CalendarClock,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";

export interface BudgetAccount {
  id: string;
  name: string;
  balance: number;
}

export interface BudgetEnvelope {
  id: string;
  name: string;
  kind: "BUDGET" | "SINKING_FUND" | "GOAL";
  accountId: string;
  balance: number;
  targetAmount: number | null;
  monthlyTarget: number | null;
  targetDate: string | null;
  recurringAmount?: number | null;
  recurringFrequency?: "WEEKLY" | "MONTHLY" | null;
  recurringWeekday?: number | null;
  recurringDayOfMonth?: number | null;
  recurringTimezone?: string | null;
  recurringEnabled?: boolean;
  nextRecurringAt?: string | null;
}

interface BudgetManagerProps {
  accounts: BudgetAccount[];
  envelopes: BudgetEnvelope[];
  focusGoalId: string | null;
}

type ModalName = "create" | "fund" | "move" | "schedule" | null;

const weekdayOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const dayOfMonthOptions = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

export function BudgetManager({ accounts, envelopes, focusGoalId }: BudgetManagerProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState(envelopes[0]?.id || "");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"BUDGET" | "SINKING_FUND" | "GOAL">("BUDGET");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [target, setTarget] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [amount, setAmount] = useState("");
  const [toEnvelopeId, setToEnvelopeId] = useState("");
  const [automaticEnabled, setAutomaticEnabled] = useState(true);
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [recurringWeekday, setRecurringWeekday] = useState("1");
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState("1");
  const [recurringTimezone, setRecurringTimezone] = useState("UTC");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRecurringTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/recurring-funding", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (active && result?.applied > 0) router.refresh();
      })
      .catch(() => {
        // Scheduled funding will be retried by the daily job or next app visit.
      });
    return () => {
      active = false;
    };
  }, [router]);

  const balancesByAccount = useMemo(() => {
    return accounts.map((account) => ({
      ...account,
      assigned: envelopes
        .filter((envelope) => envelope.accountId === account.id)
        .reduce((sum, envelope) => sum + envelope.balance, 0),
    }));
  }, [accounts, envelopes]);

  const close = () => {
    setModal(null);
    setError("");
    setAmount("");
    setToEnvelopeId("");
  };

  const resetCreateForm = () => {
    setName("");
    setKind("BUDGET");
    setTarget("");
    setMonthlyTarget("");
    setTargetDate("");
    setAutomaticEnabled(true);
    setRecurringAmount("");
    setRecurringFrequency("MONTHLY");
    setRecurringWeekday("1");
    setRecurringDayOfMonth("1");
  };

  const openCreate = (
    nextKind: "BUDGET" | "SINKING_FUND" | "GOAL" = "BUDGET",
  ) => {
    resetCreateForm();
    setKind(nextKind);
    setModal("create");
  };

  const recurringSchedulePayload = () =>
    automaticEnabled
      ? {
          enabled: true,
          amount: Number(recurringAmount),
          frequency: recurringFrequency,
          weekday: recurringFrequency === "WEEKLY" ? Number(recurringWeekday) : null,
          dayOfMonth:
            recurringFrequency === "MONTHLY" ? Number(recurringDayOfMonth) : null,
          timezone: recurringTimezone,
        }
      : { enabled: false };

  async function request(url: string, init: RequestInit, onSuccess?: () => void) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save changes");
      onSuccess?.();
      close();
      router.refresh();
      return data;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save changes");
    } finally {
      setLoading(false);
    }
  }

  const createEnvelope = (event: React.FormEvent) => {
    event.preventDefault();
    return request("/api/envelopes", {
      method: "POST",
      body: JSON.stringify({
        name,
        kind,
        accountId,
        targetAmount: kind === "BUDGET" || !target ? null : Number(target),
        monthlyTarget:
          kind === "BUDGET" && monthlyTarget ? Number(monthlyTarget) : null,
        targetDate: targetDate || null,
        recurringSchedule:
          kind === "BUDGET" ? undefined : recurringSchedulePayload(),
      }),
    }, resetCreateForm);
  };

  const fund = (event: React.FormEvent) => {
    event.preventDefault();
    return request("/api/envelopes", {
      method: "POST",
      body: JSON.stringify({
        action: "FUND",
        envelopeId: selectedEnvelopeId,
        amount: Number(amount),
      }),
    });
  };

  const move = (event: React.FormEvent) => {
    event.preventDefault();
    return request("/api/envelopes", {
      method: "POST",
      body: JSON.stringify({
        action: "MOVE",
        fromEnvelopeId: selectedEnvelopeId,
        toEnvelopeId,
        amount: Number(amount),
      }),
    });
  };

  const saveSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    return request("/api/envelopes", {
      method: "PATCH",
      body: JSON.stringify({
        id: selectedEnvelopeId,
        recurringSchedule: recurringSchedulePayload(),
      }),
    });
  };

  const setFocusGoal = async (goalEnvelopeId: string) => {
    await request("/api/goal-preference", {
      method: "PUT",
      body: JSON.stringify({ goalEnvelopeId }),
    });
  };

  const archive = async (id: string) => {
    await request(`/api/envelopes?id=${id}`, { method: "DELETE" });
  };

  const openFor = (nextModal: ModalName, envelopeId?: string) => {
    if (envelopeId) setSelectedEnvelopeId(envelopeId);
    setModal(nextModal);
  };

  const openSchedule = (envelope: BudgetEnvelope) => {
    setSelectedEnvelopeId(envelope.id);
    setAutomaticEnabled(Boolean(envelope.recurringEnabled));
    setRecurringAmount(
      envelope.recurringAmount == null ? "" : String(envelope.recurringAmount),
    );
    setRecurringFrequency(envelope.recurringFrequency || "MONTHLY");
    setRecurringWeekday(String(envelope.recurringWeekday ?? 1));
    setRecurringDayOfMonth(String(envelope.recurringDayOfMonth ?? 1));
    setRecurringTimezone(
      envelope.recurringTimezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        "UTC",
    );
    setModal("schedule");
  };

  const scheduleDescription = (envelope: BudgetEnvelope) => {
    if (
      !envelope.recurringEnabled ||
      !envelope.recurringFrequency ||
      envelope.recurringAmount == null
    ) {
      return "Automatic contributions are off";
    }
    const cadence =
      envelope.recurringFrequency === "WEEKLY"
        ? `every ${weekdayOptions[envelope.recurringWeekday ?? 1].label}`
        : `monthly on day ${envelope.recurringDayOfMonth}`;
    const next = envelope.nextRecurringAt
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          timeZone: envelope.recurringTimezone || "UTC",
        }).format(new Date(envelope.nextRecurringAt))
      : null;
    return `${formatCurrency(envelope.recurringAmount)} ${cadence}${next ? ` · Next ${next}` : ""}`;
  };

  const renderEnvelope = (envelope: BudgetEnvelope) => {
    const targetValue = envelope.targetAmount || envelope.monthlyTarget || 0;
    const percentage = targetValue > 0 ? Math.max(0, Math.min(100, (envelope.balance / targetValue) * 100)) : 0;
    const overspent = envelope.balance < 0;
    const focused = envelope.kind === "GOAL" && envelope.id === focusGoalId;

    return (
      <Card key={envelope.id} className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              {envelope.kind === "GOAL" ? (
                <Target aria-hidden="true" />
              ) : envelope.kind === "SINKING_FUND" ? (
                <PiggyBank aria-hidden="true" />
              ) : (
                <WalletCards aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-ink">{envelope.name}</h3>
              <p className="text-sm text-ink-muted">
                {accounts.find((account) => account.id === envelope.accountId)?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => archive(envelope.id)}
            aria-label={`Archive ${envelope.name}`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-danger"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`text-2xl font-bold ${overspent ? "text-danger" : "text-ink"}`}>
                {formatCurrency(envelope.balance)}
              </p>
              <p className="text-xs text-ink-muted">{overspent ? "Overspent" : "Available"}</p>
            </div>
            {targetValue > 0 && (
              <p className="text-right text-sm text-ink-muted">
                {formatCurrency(targetValue)}
                <span className="block text-xs">target</span>
              </p>
            )}
          </div>
          {targetValue > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted" aria-label={`${percentage.toFixed(0)}% funded`}>
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percentage}%` }} />
            </div>
          )}
        </div>

        {focused && (
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Focus goal for spend impact
          </p>
        )}

        {envelope.kind !== "BUDGET" && (
          <p className="mt-3 flex items-start gap-2 text-xs text-ink-muted">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <span>{scheduleDescription(envelope)}</span>
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Button size="sm" onClick={() => openFor("fund", envelope.id)}>Add money</Button>
          {envelopes.some((item) => item.accountId === envelope.accountId && item.id !== envelope.id) && (
            <Button size="sm" variant="outline" onClick={() => openFor("move", envelope.id)}>
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> Move
            </Button>
          )}
          {envelope.kind === "GOAL" && !focused && (
            <Button size="sm" variant="ghost" onClick={() => setFocusGoal(envelope.id)}>Make focus</Button>
          )}
          {envelope.kind !== "BUDGET" && (
            <Button size="sm" variant="ghost" onClick={() => openSchedule(envelope)}>
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {envelope.recurringEnabled ? "Edit schedule" : "Set schedule"}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (accounts.length === 0) {
    return (
      <Card className="text-center">
        <WalletCards className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold text-ink">Create a cash account first</h2>
        <p className="mt-2 text-ink-muted">Budgets and goals live inside the account that holds the money.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Your plan</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Plan your money</h1>
          <p className="mt-2 max-w-2xl text-ink-secondary">Cover monthly spending, build sinking funds automatically, and reach your goals.</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New envelope
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {balancesByAccount.map((account) => (
          <Card key={account.id} className="p-4">
            <p className="text-sm font-medium text-ink-muted">{account.name}</p>
            <p className="mt-1 text-xl font-bold text-ink">{formatCurrency(account.balance - account.assigned)}</p>
            <p className="text-xs text-ink-muted">Ready to assign</p>
          </Card>
        ))}
      </div>

      {(["BUDGET", "SINKING_FUND", "GOAL"] as const).map((sectionKind) => {
        const items = envelopes.filter((envelope) => envelope.kind === sectionKind);
        const section = {
          BUDGET: {
            title: "Monthly budgets",
            description: "Money available for everyday spending.",
            emptyLabel: "budget",
          },
          SINKING_FUND: {
            title: "Sinking funds",
            description: "Build reserves for expenses you know will come eventually.",
            emptyLabel: "sinking fund",
          },
          GOAL: {
            title: "Goals",
            description: "Progress toward the things you care about.",
            emptyLabel: "goal",
          },
        }[sectionKind];
        return (
          <section key={sectionKind} aria-labelledby={`${sectionKind.toLowerCase()}-heading`}>
            <div className="mb-4">
              <h2 id={`${sectionKind.toLowerCase()}-heading`} className="text-xl font-bold text-ink">
                {section.title}
              </h2>
              <p className="text-sm text-ink-muted">{section.description}</p>
            </div>
            {items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(renderEnvelope)}</div>
            ) : (
              <button
                type="button"
                onClick={() => openCreate(sectionKind)}
                className="flex min-h-28 w-full items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface/50 p-5 text-sm font-semibold text-ink-muted hover:border-brand hover:text-brand-strong"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add your first {section.emptyLabel}
              </button>
            )}
          </section>
        );
      })}

      <Modal isOpen={modal === "create"} onClose={close} title="Create an envelope">
        <form onSubmit={createEnvelope} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Select
            label="Type"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as "BUDGET" | "SINKING_FUND" | "GOAL")
            }
            options={[
              { value: "BUDGET", label: "Monthly budget" },
              { value: "SINKING_FUND", label: "Sinking fund" },
              { value: "GOAL", label: "Goal" },
            ]}
          />
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              kind === "GOAL"
                ? "New phone"
                : kind === "SINKING_FUND"
                  ? "Car maintenance"
                  : "Groceries"
            }
            required
          />
          <Select label="Cash account" value={accountId} onChange={(event) => setAccountId(event.target.value)} options={accounts.map((account) => ({ value: account.id, label: account.name }))} />
          <Input
            label={
              kind === "GOAL"
                ? "Goal amount"
                : kind === "SINKING_FUND"
                  ? "Target balance (optional)"
                  : "Monthly target"
            }
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={kind === "BUDGET" ? monthlyTarget : target}
            onChange={(event) =>
              kind === "BUDGET"
                ? setMonthlyTarget(event.target.value)
                : setTarget(event.target.value)
            }
            placeholder="0.00"
          />
          {kind === "GOAL" && <Input label="Target date (optional)" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />}
          {kind !== "BUDGET" && (
            <fieldset className="space-y-4 rounded-xl border border-line p-4">
              <legend className="px-1 text-sm font-semibold text-ink">
                Automatic contributions
              </legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={automaticEnabled}
                  onChange={(event) => setAutomaticEnabled(event.target.checked)}
                  className="h-5 w-5 rounded border-line text-brand focus-visible:ring-2 focus-visible:ring-brand"
                />
                Add money on a schedule
              </label>
              {automaticEnabled && (
                <>
                  <Input
                    label="Contribution amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={recurringAmount}
                    onChange={(event) => setRecurringAmount(event.target.value)}
                    placeholder="75.00"
                    required
                  />
                  <Select
                    label="Frequency"
                    value={recurringFrequency}
                    onChange={(event) =>
                      setRecurringFrequency(event.target.value as "WEEKLY" | "MONTHLY")
                    }
                    options={[
                      { value: "WEEKLY", label: "Weekly" },
                      { value: "MONTHLY", label: "Monthly" },
                    ]}
                  />
                  {recurringFrequency === "WEEKLY" ? (
                    <Select
                      label="Day of week"
                      value={recurringWeekday}
                      onChange={(event) => setRecurringWeekday(event.target.value)}
                      options={weekdayOptions}
                    />
                  ) : (
                    <Select
                      label="Day of month"
                      value={recurringDayOfMonth}
                      onChange={(event) => setRecurringDayOfMonth(event.target.value)}
                      options={dayOfMonthOptions}
                    />
                  )}
                  <p className="text-xs text-ink-muted">
                    Contributions use unassigned money in this cash account. If there is
                    not enough, Sprout will retry without creating money.
                  </p>
                </>
              )}
            </fieldset>
          )}
          <Button type="submit" isLoading={loading} className="w-full">Create envelope</Button>
        </form>
      </Modal>

      <Modal isOpen={modal === "fund"} onClose={close} title="Add money">
        <form onSubmit={fund} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Input label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          <Button type="submit" isLoading={loading} className="w-full">Add money</Button>
        </form>
      </Modal>

      <Modal isOpen={modal === "move"} onClose={close} title="Move money">
        <form onSubmit={move} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <Select label="Move to" value={toEnvelopeId} onChange={(event) => setToEnvelopeId(event.target.value)} options={[{ value: "", label: "Choose an envelope" }, ...envelopes.filter((item) => item.id !== selectedEnvelopeId && item.accountId === envelopes.find((source) => source.id === selectedEnvelopeId)?.accountId).map((item) => ({ value: item.id, label: item.name }))]} required />
          <Input label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          <Button type="submit" isLoading={loading} className="w-full">Move money</Button>
        </form>
      </Modal>

      <Modal isOpen={modal === "schedule"} onClose={close} title="Automatic contributions">
        <form onSubmit={saveSchedule} className="space-y-4">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger">{error}</p>}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={automaticEnabled}
              onChange={(event) => setAutomaticEnabled(event.target.checked)}
              className="h-5 w-5 rounded border-line text-brand focus-visible:ring-2 focus-visible:ring-brand"
            />
            Automatically add money
          </label>
          {automaticEnabled && (
            <>
              <Input
                label="Contribution amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={recurringAmount}
                onChange={(event) => setRecurringAmount(event.target.value)}
                required
              />
              <Select
                label="Frequency"
                value={recurringFrequency}
                onChange={(event) =>
                  setRecurringFrequency(event.target.value as "WEEKLY" | "MONTHLY")
                }
                options={[
                  { value: "WEEKLY", label: "Weekly" },
                  { value: "MONTHLY", label: "Monthly" },
                ]}
              />
              {recurringFrequency === "WEEKLY" ? (
                <Select
                  label="Day of week"
                  value={recurringWeekday}
                  onChange={(event) => setRecurringWeekday(event.target.value)}
                  options={weekdayOptions}
                />
              ) : (
                <Select
                  label="Day of month"
                  value={recurringDayOfMonth}
                  onChange={(event) => setRecurringDayOfMonth(event.target.value)}
                  options={dayOfMonthOptions}
                />
              )}
              <p className="text-xs text-ink-muted">
                Sprout only assigns money that is ready to assign. Missed contributions
                stay due and retry after more income arrives.
              </p>
            </>
          )}
          <Button type="submit" isLoading={loading} className="w-full">
            Save schedule
          </Button>
        </form>
      </Modal>
    </div>
  );
}
