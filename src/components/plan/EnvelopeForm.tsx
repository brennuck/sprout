"use client";

import { useEffect, useMemo, useState } from "react";
import { PiggyBank, Target, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Checkbox } from "@/components/ui/Checkbox";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { createEnvelopeAction, updateEnvelopeAction } from "@/lib/actions/envelopes";
import { formatCurrency } from "@/lib/utils";
import { monthsBetween, roundMoney } from "@/lib/budget-math";
import type { EnvelopeKind, SnapshotAccount, SnapshotEnvelope } from "@/lib/data/types";

export const ENVELOPE_ICONS = [
  "🛒", "🏠", "🚗", "⚡", "💊", "🍽️", "☕", "🎉", "✈️", "🎁", "🐶", "👶", "📱", "💻",
  "🎓", "🛡️", "💰", "🏖️", "🔧", "👕", "🎮", "🏋️", "🎵", "💍", "🌱",
];

const weekdayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
  (label, value) => ({ value: String(value), label }),
);
const dayOfMonthOptions = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

export const KIND_META: Record<EnvelopeKind, { label: string; plural: string; description: string; icon: typeof Target; placeholder: string }> = {
  BUDGET: {
    label: "Monthly budget",
    plural: "Monthly budgets",
    description: "Everyday spending that refills each month.",
    icon: WalletCards,
    placeholder: "Groceries",
  },
  SINKING_FUND: {
    label: "Sinking fund",
    plural: "Sinking funds",
    description: "Save a little every month for expenses you know are coming.",
    icon: PiggyBank,
    placeholder: "Car insurance",
  },
  GOAL: {
    label: "Goal",
    plural: "Goals",
    description: "Something you are saving up for.",
    icon: Target,
    placeholder: "Trip to Japan",
  },
};

interface EnvelopeFormProps {
  accounts: SnapshotAccount[];
  envelope?: SnapshotEnvelope | null;
  defaultKind?: EnvelopeKind;
  defaultAccountId?: string;
  onSaved: (id: string) => void;
}

export function EnvelopeForm({ accounts, envelope, defaultKind = "BUDGET", defaultAccountId, onSaved }: EnvelopeFormProps) {
  const toast = useToast();
  const editing = Boolean(envelope);
  const [kind, setKind] = useState<EnvelopeKind>(envelope?.kind ?? defaultKind);
  const [name, setName] = useState(envelope?.name ?? "");
  const [icon, setIcon] = useState<string>(envelope?.icon ?? "");
  const [accountId, setAccountId] = useState(envelope?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? "");
  const [target, setTarget] = useState(
    envelope ? String(envelope.kind === "BUDGET" ? envelope.monthlyTarget ?? "" : envelope.targetAmount ?? "") : "",
  );
  const [targetDate, setTargetDate] = useState(envelope?.targetDate ? envelope.targetDate.slice(0, 10) : "");
  const [note, setNote] = useState(envelope?.note ?? "");
  const [recurringEnabled, setRecurringEnabled] = useState(envelope?.recurringEnabled ?? false);
  const [recurringAmount, setRecurringAmount] = useState(envelope?.recurringAmount ? String(envelope.recurringAmount) : "");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">(envelope?.recurringFrequency ?? "MONTHLY");
  const [weekday, setWeekday] = useState(String(envelope?.recurringWeekday ?? 1));
  const [dayOfMonth, setDayOfMonth] = useState(String(envelope?.recurringDayOfMonth ?? 1));
  const [timezone, setTimezone] = useState(envelope?.recurringTimezone ?? "UTC");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!envelope?.recurringTimezone) {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    }
  }, [envelope?.recurringTimezone]);

  const targetValue = parseMoney(target);
  const suggestion = useMemo(() => {
    if (kind === "BUDGET" || !targetValue || !targetDate) return null;
    const months = monthsBetween(new Date(), new Date(`${targetDate}T12:00:00`));
    if (months <= 0) return null;
    const remaining = Math.max(0, targetValue - (envelope?.balance ?? 0));
    if (remaining <= 0) return null;
    return { perMonth: roundMoney(remaining / months), perWeek: roundMoney(remaining / (months * (52 / 12))) };
  }, [kind, targetValue, targetDate, envelope?.balance]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError({ field: "name", message: "Give it a name" });
    if (!accountId) return setError({ field: "account", message: "Choose a cash account" });
    if (kind !== "BUDGET" && recurringEnabled && parseMoney(recurringAmount) <= 0) {
      return setError({ field: "recurring", message: "Enter the automatic contribution amount" });
    }

    const recurringSchedule =
      kind === "BUDGET"
        ? undefined
        : recurringEnabled
          ? frequency === "WEEKLY"
            ? { enabled: true as const, amount: parseMoney(recurringAmount), frequency: "WEEKLY" as const, weekday: Number(weekday), timezone }
            : { enabled: true as const, amount: parseMoney(recurringAmount), frequency: "MONTHLY" as const, dayOfMonth: Number(dayOfMonth), timezone }
          : { enabled: false as const };

    setSaving(true);
    const result = editing
      ? await updateEnvelopeAction({
          id: envelope!.id,
          name: name.trim(),
          icon: icon || null,
          note: note || null,
          targetAmount: kind === "BUDGET" ? null : targetValue || null,
          monthlyTarget: kind === "BUDGET" ? targetValue || null : null,
          targetDate: kind === "BUDGET" ? null : targetDate || null,
          recurringSchedule,
        })
      : await createEnvelopeAction({
          name: name.trim(),
          kind,
          accountId,
          icon: icon || null,
          note: note || null,
          targetAmount: kind === "BUDGET" ? null : targetValue || null,
          monthlyTarget: kind === "BUDGET" ? targetValue || null : null,
          targetDate: kind === "BUDGET" ? null : targetDate || null,
          recurringSchedule,
        });
    setSaving(false);
    if (!result.ok) {
      setError({ field: result.field, message: result.error });
      return;
    }
    toast.show({ title: editing ? `${name.trim()} updated` : `${name.trim()} created`, variant: "success" });
    onSaved(result.data.id);
  };

  const meta = KIND_META[kind];

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {!editing && (
        <SegmentedControl<EnvelopeKind>
          label="Envelope type"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setTarget("");
          }}
          options={[
            { value: "BUDGET", label: "Budget" },
            { value: "SINKING_FUND", label: "Sinking fund" },
            { value: "GOAL", label: "Goal" },
          ]}
        />
      )}
      <p className="text-sm text-ink-muted">{meta.description}</p>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink-secondary">Icon</p>
        <ChipRow>
          <Chip selected={!icon} onClick={() => setIcon("")} size="sm">None</Chip>
          {ENVELOPE_ICONS.map((emoji) => (
            <Chip key={emoji} selected={icon === emoji} onClick={() => setIcon(emoji)} size="sm" aria-label={`Icon ${emoji}`}>
              <span className="text-base leading-none">{emoji}</span>
            </Chip>
          ))}
        </ChipRow>
      </div>

      <Input
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={meta.placeholder}
        error={error?.field === "name" ? error.message : undefined}
        maxLength={80}
        data-autofocus
      />

      {!editing && accounts.length > 1 && (
        <Select
          label="Cash account"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          options={accounts.map((account) => ({ value: account.id, label: `${account.name} · ${formatCurrency(account.readyToAssign)} ready` }))}
          hint="Envelopes divide up the real money in this account."
        />
      )}

      <MoneyInput
        label={kind === "BUDGET" ? "Monthly target" : kind === "GOAL" ? "Goal amount" : "Target balance"}
        hint={
          kind === "BUDGET"
            ? "How much you want available for this each month."
            : kind === "SINKING_FUND"
              ? "Optional. The amount you want saved up when the expense hits."
              : "How much you need to reach the goal."
        }
        value={target}
        onValueChange={setTarget}
      />

      {kind !== "BUDGET" && (
        <Input
          label={kind === "GOAL" ? "Target date (optional)" : "Needed by (optional)"}
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      )}

      {kind !== "BUDGET" && (
        <fieldset className="space-y-4 rounded-2xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Automatic contributions</legend>
          <Checkbox
            checked={recurringEnabled}
            onChange={(event) => setRecurringEnabled(event.target.checked)}
            label="Add money on a schedule"
            description="Uses money that is ready to assign. If there is not enough, Sprout waits and retries."
          />
          {recurringEnabled && (
            <>
              {suggestion && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft/60 p-3 text-sm text-ink-secondary">
                  <span>To hit your date:</span>
                  <Chip
                    size="sm"
                    tone="brand"
                    onClick={() => {
                      setFrequency("MONTHLY");
                      setRecurringAmount(String(suggestion.perMonth));
                    }}
                  >
                    {formatCurrency(suggestion.perMonth)}/month
                  </Chip>
                  <Chip
                    size="sm"
                    tone="brand"
                    onClick={() => {
                      setFrequency("WEEKLY");
                      setRecurringAmount(String(suggestion.perWeek));
                    }}
                  >
                    {formatCurrency(suggestion.perWeek)}/week
                  </Chip>
                </div>
              )}
              <MoneyInput
                label="Contribution amount"
                value={recurringAmount}
                onValueChange={setRecurringAmount}
                error={error?.field === "recurring" ? error.message : undefined}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Frequency"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as "WEEKLY" | "MONTHLY")}
                  options={[
                    { value: "WEEKLY", label: "Weekly" },
                    { value: "MONTHLY", label: "Monthly" },
                  ]}
                />
                {frequency === "WEEKLY" ? (
                  <Select label="Day of week" value={weekday} onChange={(event) => setWeekday(event.target.value)} options={weekdayOptions} />
                ) : (
                  <Select label="Day of month" value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} options={dayOfMonthOptions} />
                )}
              </div>
            </>
          )}
        </fieldset>
      )}

      <Textarea label="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} />

      {error && !error.field && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">
          {error.message}
        </p>
      )}
      {error?.field === "account" && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" isLoading={saving}>
        {editing ? "Save changes" : `Create ${meta.label.toLowerCase()}`}
      </Button>
    </form>
  );
}
