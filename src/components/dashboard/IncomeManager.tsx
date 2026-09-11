"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BadgeDollarSign, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Amount } from "@/components/ui/Stat";
import { useToast } from "@/components/ui/Toast";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { useAddSheet } from "@/components/add/AddSheet";
import { useLocalPreference } from "@/lib/hooks/useLocalPreference";
import { savePlanAction } from "@/lib/actions/accounts";
import { calculateAllocations } from "@/lib/allocation-math";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AllocationMethod, SnapshotRule } from "@/lib/data/types";

interface IncomeItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  accountName: string;
}

export function IncomeManager({ income }: { income: IncomeItem[] }) {
  const snapshot = useSnapshot();
  const toast = useToast();
  const { openAdd } = useAddSheet();
  const [accountId, setAccountId] = useLocalPreference("income-account", snapshot.accounts[0]?.id ?? "");
  const plan = snapshot.plans.find((item) => item.accountId === accountId);
  const [rules, setRules] = useState<SnapshotRule[]>(plan?.rules ?? []);
  const [previewAmount, setPreviewAmount] = useState("1200");
  const [saving, setSaving] = useState(false);

  const accountEnvelopes = snapshot.envelopes.filter((envelope) => envelope.accountId === accountId);
  const preview = useMemo(
    () => calculateAllocations(Math.max(0, Number(previewAmount) || 0), rules),
    [previewAmount, rules],
  );

  const changeAccount = (next: string) => {
    setAccountId(next);
    setRules(snapshot.plans.find((item) => item.accountId === next)?.rules ?? []);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRules((current) => {
      const oldIndex = current.findIndex((rule) => rule.envelopeId === active.id);
      const newIndex = current.findIndex((rule) => rule.envelopeId === over.id);
      return arrayMove(current, oldIndex, newIndex).map((rule, priority) => ({ ...rule, priority }));
    });
  };

  const save = async () => {
    setSaving(true);
    const result = await savePlanAction({
      accountId,
      name: "Paycheck plan",
      enabled: true,
      rules: rules.map((rule, priority) => ({ ...rule, priority })),
    });
    setSaving(false);
    if (!result.ok) return toast.show({ title: result.error, variant: "error" });
    toast.show({ title: "Paycheck plan saved", variant: "success" });
  };

  if (!snapshot.accounts.length) {
    return <EmptyState title="Create a cash account before recording income." />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Payday flow</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Income</h1>
          <p className="mt-2 max-w-2xl text-ink-secondary">Record money once. Sprout follows your plan and shows what is still ready to assign.</p>
        </div>
        <Button onClick={() => openAdd("income")}>
          <BadgeDollarSign className="h-4 w-4" aria-hidden="true" /> Record paycheck
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-xl font-bold text-ink">Paycheck preview</h2>
          <p className="mt-1 text-sm text-ink-muted">See how a deposit would split before you record it.</p>
          <div className="mt-4 space-y-4">
            <Select
              label="Deposit account"
              value={accountId}
              onChange={(event) => changeAccount(event.target.value)}
              options={snapshot.accounts.map((account) => ({
                value: account.id,
                label: `${account.name} · ${formatCurrency(account.readyToAssign)} ready`,
              }))}
            />
            <Input
              label="Preview amount"
              type="number"
              inputMode="decimal"
              value={previewAmount}
              onChange={(event) => setPreviewAmount(event.target.value)}
            />
            <ul className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              {preview.allocations.map((row) => (
                <li key={row.envelopeId} className="flex justify-between gap-3">
                  <span>{snapshot.envelopes.find((envelope) => envelope.id === row.envelopeId)?.name}</span>
                  <strong className="tabular">{formatCurrency(row.amount)}</strong>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                <span>Ready to assign</span>
                <span className="tabular">{formatCurrency(preview.remainder)}</span>
              </li>
            </ul>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">Automatic allocation plan</h2>
              <p className="text-sm text-ink-muted">Rules run top to bottom against the remaining paycheck. Drag to reorder.</p>
            </div>
            <Button size="sm" onClick={save} isLoading={saving}>
              <Save className="h-4 w-4" aria-hidden="true" /> Save
            </Button>
          </div>
          <div className="mt-5 space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={rules.map((rule) => rule.envelopeId)} strategy={verticalListSortingStrategy}>
                {rules.map((rule, index) => (
                  <RuleCard
                    key={rule.envelopeId}
                    rule={rule}
                    envelopes={accountEnvelopes.map((envelope) => ({ id: envelope.id, name: envelope.name }))}
                    onChange={(patch) => setRules(rules.map((item, i) => (i === index ? { ...item, ...patch } : item)))}
                    onRemove={() => setRules(rules.filter((_, i) => i !== index))}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {accountEnvelopes.length > rules.length && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const available = accountEnvelopes.find((envelope) => !rules.some((rule) => rule.envelopeId === envelope.id));
                  if (!available) return;
                  setRules([
                    ...rules,
                    {
                      envelopeId: available.id,
                      method: "FIXED",
                      value: available.monthlyTarget || 0,
                      priority: rules.length,
                    },
                  ]);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add allocation rule
              </Button>
            )}
            {!accountEnvelopes.length && (
              <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-muted">Create a budget or goal for this account before adding rules.</p>
            )}
          </div>
        </Card>
      </div>

      <section>
        <h2 className="text-xl font-bold text-ink">Recent income</h2>
        <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {income.length ? (
            income.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.description}</p>
                  <p className="text-sm text-ink-muted">{item.accountName} · {formatDate(item.date)}</p>
                </div>
                <Amount value={item.amount} type="INCOME" />
              </div>
            ))
          ) : (
            <EmptyState compact title="No income recorded yet." />
          )}
        </div>
      </section>
    </div>
  );
}

function RuleCard({
  rule,
  envelopes,
  onChange,
  onRemove,
}: {
  rule: SnapshotRule;
  envelopes: { id: string; name: string }[];
  onChange: (patch: Partial<SnapshotRule>) => void;
  onRemove: () => void;
}) {
  const sortable = useSortable({ id: rule.envelopeId });
  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className="rounded-xl border border-line p-3"
    >
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_140px_120px_44px] sm:items-end">
        <button
          type="button"
          aria-label="Reorder rule"
          className="flex h-11 w-11 items-center justify-center text-ink-muted"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Select
          label="Envelope"
          value={rule.envelopeId}
          onChange={(event) => onChange({ envelopeId: event.target.value })}
          options={envelopes.map((envelope) => ({ value: envelope.id, label: envelope.name }))}
        />
        <Select
          label="Rule"
          value={rule.method}
          onChange={(event) =>
            onChange({ method: event.target.value as AllocationMethod, value: event.target.value === "REMAINDER" ? 0 : rule.value })
          }
          options={[
            { value: "FIXED", label: "Fixed $" },
            { value: "PERCENT", label: "% remaining" },
            { value: "REMAINDER", label: "All remaining" },
          ]}
        />
        {rule.method === "REMAINDER" ? (
          <div className="hidden sm:block" />
        ) : (
          <Input
            label={rule.method === "FIXED" ? "Amount" : "Percent"}
            type="number"
            inputMode="decimal"
            min={0}
            max={rule.method === "PERCENT" ? 100 : undefined}
            step="0.01"
            value={rule.value}
            onChange={(event) => onChange({ value: Number(event.target.value) })}
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove allocation rule"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
