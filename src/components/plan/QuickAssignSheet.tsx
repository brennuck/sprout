"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatCurrency } from "@/lib/utils";
import { planQuickAssign, type QuickAssignStrategy } from "@/lib/budget-math";
import { quickAssignAction, undoEnvelopeGroupAction } from "@/lib/actions/envelopes";
import type { SnapshotAccount, SnapshotEnvelope } from "@/lib/data/types";

const STRATEGIES: { value: QuickAssignStrategy; label: string; description: string }[] = [
  { value: "COVER_OVERSPENDING", label: "Cover overspending", description: "Bring negative envelopes back to zero." },
  { value: "FILL_BUDGETS", label: "Fill budgets", description: "Fund monthly budgets up to their target." },
  { value: "FUND_DUE", label: "Fund due contributions", description: "Apply sinking-fund and goal contributions that are waiting." },
  { value: "SPLIT_EVENLY", label: "Split leftover", description: "Share remaining ready-to-assign across envelopes that still have room." },
];

interface QuickAssignSheetProps {
  open: boolean;
  onClose: () => void;
  accounts: SnapshotAccount[];
  envelopes: SnapshotEnvelope[];
  spentThisMonth: Record<string, number>;
}

export function QuickAssignSheet({ open, onClose, accounts, envelopes, spentThisMonth }: QuickAssignSheetProps) {
  const toast = useToast();
  const cashAccounts = accounts.filter((account) => account.readyToAssign > 0 || envelopes.some((envelope) => envelope.accountId === account.id));
  const [accountId, setAccountId] = useState(cashAccounts[0]?.id ?? accounts[0]?.id ?? "");
  const [strategy, setStrategy] = useState<QuickAssignStrategy>("FILL_BUDGETS");
  const [saving, setSaving] = useState(false);

  const account = accounts.find((item) => item.id === accountId);
  const preview = useMemo(
    () =>
      account
        ? planQuickAssign({
            envelopes,
            spentThisMonth,
            accountId,
            readyToAssign: account.readyToAssign,
            strategy,
          })
        : { lines: [], total: 0, leftover: 0 },
    [account, accountId, envelopes, spentThisMonth, strategy],
  );

  const apply = async () => {
    if (!account || !preview.lines.length) return;
    setSaving(true);
    const result = await quickAssignAction({
      accountId,
      lines: preview.lines,
      note: STRATEGIES.find((item) => item.value === strategy)?.label,
    });
    setSaving(false);
    if (!result.ok) return toast.show({ title: result.error, variant: "error" });
    toast.show({
      title: `${formatCurrency(result.data.total)} assigned`,
      variant: "success",
      action: {
        label: "Undo",
        onClick: async () => {
          const undo = await undoEnvelopeGroupAction(result.data.groupId);
          if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
        },
      },
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Quick assign" description="Give leftover cash a job in one tap.">
      <div className="space-y-5">
        {accounts.length > 1 && (
          <Select
            label="From account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            options={accounts.map((item) => ({
              value: item.id,
              label: `${item.name} · ${formatCurrency(item.readyToAssign)} ready`,
            }))}
          />
        )}
        <SegmentedControl<QuickAssignStrategy>
          label="Strategy"
          value={strategy}
          onChange={setStrategy}
          options={STRATEGIES.map((item) => ({ value: item.value, label: item.label.split(" ")[0] }))}
        />
        <p className="text-sm text-ink-muted">{STRATEGIES.find((item) => item.value === strategy)?.description}</p>
        {preview.lines.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {preview.lines.map((line) => {
              const envelope = envelopes.find((item) => item.id === line.envelopeId);
              return (
                <li key={line.envelopeId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="truncate font-medium text-ink">
                    {envelope?.icon ? `${envelope.icon} ` : ""}
                    {envelope?.name ?? "Envelope"}
                  </span>
                  <span className="tabular font-semibold text-brand-strong">{formatCurrency(line.amount)}</span>
                </li>
              );
            })}
            <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-ink-muted">Still ready to assign</span>
              <span className="tabular font-semibold">{formatCurrency(preview.leftover)}</span>
            </li>
          </ul>
        ) : (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-ink-muted">Nothing to assign with this strategy.</p>
        )}
        <Button size="lg" className="w-full" onClick={apply} isLoading={saving} disabled={!preview.lines.length}>
          Assign {preview.total > 0 ? formatCurrency(preview.total) : "money"}
        </Button>
      </div>
    </Sheet>
  );
}
