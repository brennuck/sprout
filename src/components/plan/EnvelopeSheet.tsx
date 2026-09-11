"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  CalendarClock,
  Pencil,
  Plus,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EnvelopeForm, KIND_META } from "@/components/plan/EnvelopeForm";
import type { MoveMode } from "@/components/plan/MoveMoneySheet";
import {
  archiveEnvelopeAction,
  loadEnvelopeHistoryAction,
  setFocusGoalAction,
} from "@/lib/actions/envelopes";
import type { EnvelopeHistoryEntry } from "@/lib/services/envelopes";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  budgetHealth,
  envelopeTarget,
  ordinal,
  percent,
  projectEnvelope,
  relativeDayLabel,
} from "@/lib/budget-math";
import type { EnvelopeMonthStats, SnapshotAccount, SnapshotEnvelope } from "@/lib/data/types";

interface EnvelopeSheetProps {
  envelope: SnapshotEnvelope | null;
  open: boolean;
  onClose: () => void;
  accounts: SnapshotAccount[];
  stats?: EnvelopeMonthStats;
  focusGoalId: string | null;
  onMoveMoney: (mode: MoveMode) => void;
}

const entryLabels: Record<EnvelopeHistoryEntry["type"], string> = {
  ALLOCATION: "Added",
  SPEND: "Spent",
  MOVE: "Moved",
  ADJUSTMENT: "Adjusted",
  WITHDRAWAL: "Returned",
};

export function EnvelopeSheet({ envelope, open, onClose, accounts, stats, focusGoalId, onMoveMoney }: EnvelopeSheetProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<EnvelopeHistoryEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !envelope) return;
    setEditing(false);
    setHistory(null);
    setCursor(null);
    let active = true;
    void loadEnvelopeHistoryAction(envelope.id).then((result) => {
      if (!active) return;
      if (result.ok) {
        setHistory(result.data.rows);
        setCursor(result.data.nextCursor);
      } else {
        setHistory([]);
      }
    });
    return () => {
      active = false;
    };
  }, [open, envelope?.id, envelope]);

  if (!envelope) return null;

  const account = accounts.find((item) => item.id === envelope.accountId);
  const meta = KIND_META[envelope.kind];
  const target = envelopeTarget(envelope);
  const spent = stats?.spent ?? 0;
  const health = budgetHealth(envelope, envelope.balance, spent);
  const projection = envelope.kind === "BUDGET" ? null : projectEnvelope(envelope);
  const isFocus = envelope.kind === "GOAL" && envelope.id === focusGoalId;
  const archived = Boolean(envelope.archivedAt);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const result = await loadEnvelopeHistoryAction(envelope.id, cursor);
    if (result.ok) {
      setHistory((current) => [...(current ?? []), ...result.data.rows]);
      setCursor(result.data.nextCursor);
    }
    setLoadingMore(false);
  };

  const toggleArchive = async () => {
    setBusy(true);
    const result = await archiveEnvelopeAction(envelope.id, !archived);
    setBusy(false);
    if (!result.ok) return toast.show({ title: result.error, variant: "error" });
    toast.show({
      title: archived ? `${envelope.name} restored` : `${envelope.name} archived`,
      description: archived ? undefined : envelope.balance > 0 ? `${formatCurrency(envelope.balance)} stays assigned until you return it.` : undefined,
      variant: "success",
      action: {
        label: "Undo",
        onClick: async () => {
          const undo = await archiveEnvelopeAction(envelope.id, archived);
          if (!undo.ok) toast.show({ title: undo.error, variant: "error" });
        },
      },
    });
    onClose();
  };

  const makeFocus = async () => {
    setBusy(true);
    const result = await setFocusGoalAction(isFocus ? null : envelope.id);
    setBusy(false);
    if (!result.ok) return toast.show({ title: result.error, variant: "error" });
    toast.show({ title: isFocus ? "Focus goal cleared" : `${envelope.name} is now your focus goal`, variant: "success" });
  };

  const scheduleText = (() => {
    if (!envelope.recurringEnabled || !envelope.recurringAmount || !envelope.recurringFrequency) return "No automatic contributions";
    const cadence =
      envelope.recurringFrequency === "WEEKLY"
        ? `every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][envelope.recurringWeekday ?? 1]}`
        : `on the ${ordinal(envelope.recurringDayOfMonth ?? 1)} each month`;
    const next = envelope.nextRecurringAt ? ` · next ${relativeDayLabel(envelope.nextRecurringAt).toLowerCase()}` : "";
    return `${formatCurrency(envelope.recurringAmount)} ${cadence}${next}`;
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          {envelope.icon && <span aria-hidden="true">{envelope.icon}</span>}
          {envelope.name}
        </span>
      }
      description={`${meta.label}${account ? ` · ${account.name}` : ""}${archived ? " · Archived" : ""}`}
      headerAccessory={
        !archived && !editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </Button>
        ) : editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        ) : null
      }
    >
      {editing ? (
        <EnvelopeForm accounts={accounts} envelope={envelope} onSaved={() => setEditing(false)} />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl bg-surface-muted p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Available</p>
                <p className={`tabular text-3xl font-bold ${envelope.balance < 0 ? "text-danger" : "text-ink"}`}>
                  {formatCurrency(envelope.balance)}
                </p>
              </div>
              {target != null && (
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {envelope.kind === "BUDGET" ? "Monthly target" : "Target"}
                  </p>
                  <p className="tabular text-lg font-semibold text-ink">{formatCurrency(target)}</p>
                </div>
              )}
            </div>
            {target != null && (
              <div className="mt-3">
                <ProgressBar
                  value={envelope.kind === "BUDGET" ? health.fundedPercent : percent(envelope.balance, target)}
                  label={`${envelope.name} progress`}
                  tone={envelope.balance < 0 ? "danger" : health.status === "underfunded" ? "warning" : envelope.kind === "BUDGET" ? "brand" : "positive"}
                  size="lg"
                />
                <p className="mt-2 text-sm text-ink-secondary">
                  {envelope.balance < 0
                    ? `Overspent by ${formatCurrency(-envelope.balance)}. Move money in to cover it.`
                    : envelope.kind === "BUDGET"
                      ? stats
                        ? `${formatCurrency(stats.assigned)} assigned and ${formatCurrency(spent)} spent this month${health.shortfall > 0 ? ` · ${formatCurrency(health.shortfall)} short of target` : " · fully funded"}.`
                        : ""
                      : `${percent(envelope.balance, target).toFixed(0)}% saved${projection && projection.remaining > 0 ? ` · ${formatCurrency(projection.remaining)} to go` : ""}.`}
                </p>
              </div>
            )}
            {envelope.kind === "BUDGET" && target == null && stats && (
              <p className="mt-2 text-sm text-ink-secondary">
                {formatCurrency(stats.assigned)} assigned and {formatCurrency(spent)} spent this month.
              </p>
            )}
          </section>

          {projection && (
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Plan</p>
                <p className="mt-1 text-sm font-semibold text-ink">{scheduleText}</p>
                {projection.projectedCompletion && projection.status !== "complete" && (
                  <p className="mt-1 text-sm text-ink-secondary">
                    Projected to finish {formatDate(projection.projectedCompletion)} at this pace.
                  </p>
                )}
              </div>
              <div className={`rounded-2xl border p-4 ${projection.status === "behind" ? "border-warning/40 bg-warning-soft" : projection.status === "complete" ? "border-positive/40 bg-positive-soft" : "border-line"}`}>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {envelope.targetDate ? `Needed by ${formatDate(envelope.targetDate)}` : "Status"}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {projection.status === "complete"
                    ? "Fully funded"
                    : projection.status === "on-track"
                      ? "On track"
                      : projection.status === "behind"
                        ? projection.neededPerMonth != null
                          ? `Behind · needs ${formatCurrency(projection.neededPerMonth)}/month`
                          : "Behind schedule"
                        : projection.status === "no-plan"
                          ? projection.neededPerMonth != null
                            ? `Set aside ${formatCurrency(projection.neededPerMonth)}/month to make it`
                            : "No schedule yet"
                          : "Set a target to track progress"}
                </p>
                {projection.status !== "complete" && projection.plannedPerMonth > 0 && (
                  <p className="mt-1 text-sm text-ink-secondary">
                    Contributing about {formatCurrency(projection.plannedPerMonth)}/month.
                  </p>
                )}
              </div>
            </section>
          )}

          {envelope.note && <p className="rounded-xl bg-brand-soft/40 p-3 text-sm text-ink-secondary">{envelope.note}</p>}

          {!archived && (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button onClick={() => onMoveMoney("fund")} className="flex-col gap-1 py-3 sm:flex-row">
                <Plus className="h-4 w-4" aria-hidden="true" /> Add
              </Button>
              <Button variant="outline" onClick={() => onMoveMoney("move")} className="flex-col gap-1 py-3 sm:flex-row">
                <ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> Move
              </Button>
              <Button variant="outline" onClick={() => onMoveMoney("unassign")} className="flex-col gap-1 py-3 sm:flex-row">
                <Undo2 className="h-4 w-4" aria-hidden="true" /> Return
              </Button>
              {envelope.kind !== "BUDGET" ? (
                <Button variant="outline" onClick={() => setEditing(true)} className="flex-col gap-1 py-3 sm:flex-row">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" /> Schedule
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setEditing(true)} className="flex-col gap-1 py-3 sm:flex-row">
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                </Button>
              )}
            </section>
          )}

          {envelope.kind === "GOAL" && !archived && (
            <Button variant={isFocus ? "secondary" : "ghost"} onClick={makeFocus} isLoading={busy} className="w-full">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isFocus ? "Focus goal · tap to clear" : "Make this my focus goal"}
            </Button>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-secondary">History</h3>
            {history === null ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : history.length === 0 ? (
              <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-muted">Nothing has moved through this envelope yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{entry.note || entryLabels[entry.type]}</p>
                      <p className="text-xs text-ink-muted">
                        {entryLabels[entry.type]} · {formatDate(entry.date)}
                      </p>
                    </div>
                    <span className={`tabular text-sm font-semibold ${entry.amount < 0 ? "text-ink" : "text-positive"}`}>
                      {entry.amount < 0 ? "−" : "+"}
                      {formatCurrency(Math.abs(entry.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {cursor && (
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={loadMore} isLoading={loadingMore}>
                Load more
              </Button>
            )}
          </section>

          <Button variant="ghost" onClick={toggleArchive} isLoading={busy} className="w-full text-ink-muted hover:text-danger">
            {archived ? (
              <>
                <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> Restore envelope
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" aria-hidden="true" /> Archive envelope
              </>
            )}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
