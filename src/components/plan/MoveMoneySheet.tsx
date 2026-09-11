"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { MoneyInput, parseMoney } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import {
  fundEnvelopeAction,
  moveMoneyAction,
  unassignEnvelopeAction,
  undoEnvelopeGroupAction,
} from "@/lib/actions/envelopes";
import { formatCurrency } from "@/lib/utils";
import { budgetHealth, envelopeTarget } from "@/lib/budget-math";
import type { SnapshotAccount, SnapshotEnvelope } from "@/lib/data/types";

export type MoveMode = "fund" | "move" | "unassign";

interface MoveMoneySheetProps {
  open: boolean;
  onClose: () => void;
  envelope: SnapshotEnvelope | null;
  envelopes: SnapshotEnvelope[];
  accounts: SnapshotAccount[];
  spentThisMonth: Record<string, number>;
  initialMode?: MoveMode;
}

/** Fund from ready-to-assign, move between envelopes, or return money to ready-to-assign. */
export function MoveMoneySheet({ open, onClose, envelope, envelopes, accounts, spentThisMonth, initialMode = "fund" }: MoveMoneySheetProps) {
  const toast = useToast();
  const [mode, setMode] = useState<MoveMode>(initialMode);
  const [amount, setAmount] = useState("");
  const [toEnvelopeId, setToEnvelopeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const account = accounts.find((item) => item.id === envelope?.accountId);
  const siblings = useMemo(
    () => envelopes.filter((item) => item.accountId === envelope?.accountId && item.id !== envelope?.id),
    [envelopes, envelope],
  );
  const value = parseMoney(amount);
  const shortfall = envelope ? budgetHealth(envelope, envelope.balance, spentThisMonth[envelope.id] ?? 0).shortfall : 0;
  const target = envelope ? envelopeTarget(envelope) : null;

  const reset = () => {
    setAmount("");
    setToEnvelopeId("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!envelope) return;
    setError(null);
    if (value <= 0) return setError("Enter an amount greater than zero");
    if (mode === "fund" && account && value > account.readyToAssign + 0.004) {
      return setError(`Only ${formatCurrency(account.readyToAssign)} is ready to assign in ${account.name}`);
    }
    if ((mode === "move" || mode === "unassign") && value > envelope.balance + 0.004) {
      return setError(`${envelope.name} only has ${formatCurrency(envelope.balance)}`);
    }
    if (mode === "move" && !toEnvelopeId) return setError("Choose where to move the money");

    setSaving(true);
    const result =
      mode === "fund"
        ? await fundEnvelopeAction(envelope.id, value)
        : mode === "unassign"
          ? await unassignEnvelopeAction(envelope.id, value)
          : await moveMoneyAction(envelope.id, toEnvelopeId, value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const destination = siblings.find((item) => item.id === toEnvelopeId);
    const groupId = result.data.groupId;
    toast.show({
      title:
        mode === "fund"
          ? `${formatCurrency(value)} added to ${envelope.name}`
          : mode === "unassign"
            ? `${formatCurrency(value)} returned to ready to assign`
            : `${formatCurrency(value)} moved to ${destination?.name ?? "envelope"}`,
      variant: "success",
      action: groupId
        ? {
            label: "Undo",
            onClick: async () => {
              const undo = await undoEnvelopeGroupAction(groupId);
              if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
            },
          }
        : undefined,
    });
    close();
  };

  const quickAmounts: { label: string; value: number }[] = [];
  if (envelope) {
    if (mode === "fund") {
      if (shortfall > 0) quickAmounts.push({ label: `Fill to target (${formatCurrency(shortfall)})`, value: shortfall });
      if (envelope.recurringAmount) quickAmounts.push({ label: `One contribution (${formatCurrency(envelope.recurringAmount)})`, value: envelope.recurringAmount });
      if (account && account.readyToAssign > 0) quickAmounts.push({ label: `Everything ready (${formatCurrency(account.readyToAssign)})`, value: account.readyToAssign });
    } else {
      if (envelope.balance > 0) quickAmounts.push({ label: `All (${formatCurrency(envelope.balance)})`, value: envelope.balance });
      if (target && envelope.balance > target) quickAmounts.push({ label: `Excess over target (${formatCurrency(envelope.balance - target)})`, value: envelope.balance - target });
      if (envelope.balance > 0) quickAmounts.push({ label: `Half (${formatCurrency(Math.round(envelope.balance * 50) / 100)})`, value: Math.round(envelope.balance * 50) / 100 });
    }
  }

  return (
    <Sheet
      open={open && Boolean(envelope)}
      onClose={close}
      title={envelope ? `${envelope.icon ? `${envelope.icon} ` : ""}${envelope.name}` : "Move money"}
      description={
        envelope
          ? `${formatCurrency(envelope.balance)} available${account ? ` · ${formatCurrency(account.readyToAssign)} ready to assign in ${account.name}` : ""}`
          : undefined
      }
    >
      {envelope && (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <SegmentedControl<MoveMode>
            label="Action"
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
            options={[
              { value: "fund", label: "Add" },
              { value: "move", label: "Move", disabled: siblings.length === 0 },
              { value: "unassign", label: "Return" },
            ]}
          />
          <p className="text-sm text-ink-muted">
            {mode === "fund"
              ? "Assign money that is ready to assign into this envelope."
              : mode === "move"
                ? "Shift money to another envelope in the same account."
                : "Send money back to ready to assign."}
          </p>
          <MoneyInput size="hero" label="Amount" value={amount} onValueChange={setAmount} error={error ?? undefined} data-autofocus />
          {quickAmounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quick) => (
                <Chip key={quick.label} size="sm" tone="brand" onClick={() => setAmount(String(quick.value))}>
                  {quick.label}
                </Chip>
              ))}
            </div>
          )}
          {mode === "move" && (
            <Select
              label="Move to"
              value={toEnvelopeId}
              onChange={(event) => setToEnvelopeId(event.target.value)}
              placeholder="Choose an envelope"
              options={siblings.map((item) => ({
                value: item.id,
                label: `${item.icon ? `${item.icon} ` : ""}${item.name} · ${formatCurrency(item.balance)}`,
              }))}
            />
          )}
          <Button type="submit" size="lg" className="w-full" isLoading={saving}>
            {mode === "fund" ? "Add money" : mode === "move" ? "Move money" : "Return to ready to assign"}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
