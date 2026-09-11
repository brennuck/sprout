"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Sparkles, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { Sheet } from "@/components/ui/Sheet";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { EnvelopeForm, KIND_META } from "@/components/plan/EnvelopeForm";
import { EnvelopeSheet } from "@/components/plan/EnvelopeSheet";
import { MoveMoneySheet, type MoveMode } from "@/components/plan/MoveMoneySheet";
import { QuickAssignSheet } from "@/components/plan/QuickAssignSheet";
import { useAddSheet } from "@/components/add/AddSheet";
import { useLocalPreference } from "@/lib/hooks/useLocalPreference";
import { reorderEnvelopesAction } from "@/lib/actions/envelopes";
import { formatCurrency } from "@/lib/utils";
import {
  budgetHealth,
  currentMonthKey,
  envelopeTarget,
  formatMonth,
  monthElapsedRatio,
  percent,
  projectEnvelope,
  shiftMonth,
} from "@/lib/budget-math";
import type { EnvelopeKind, EnvelopeMonthStats, MonthPlan, SnapshotEnvelope } from "@/lib/data/types";

interface PlanViewProps {
  month: string;
  monthPlan: MonthPlan;
}

export function PlanView({ month, monthPlan }: PlanViewProps) {
  const snapshot = useSnapshot();
  const router = useRouter();
  const { openAdd } = useAddSheet();
  const [createKind, setCreateKind] = useState<EnvelopeKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [move, setMove] = useState<{ id: string; mode: MoveMode } | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [reorder, setReorder] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [collapsed, setCollapsed] = useLocalPreference<Record<string, boolean>>("plan-collapsed", {});

  const spentThisMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const stats of Object.values(monthPlan.envelopes)) map[stats.envelopeId] = stats.spent;
    return map;
  }, [monthPlan]);

  const selected = snapshot.envelopes.find((envelope) => envelope.id === selectedId)
    ?? snapshot.archivedEnvelopes.find((envelope) => envelope.id === selectedId)
    ?? null;
  const moving = snapshot.envelopes.find((envelope) => envelope.id === move?.id) ?? null;

  const go = (next: string) => {
    const params = new URLSearchParams();
    if (next !== currentMonthKey()) params.set("month", next);
    router.push(params.size ? `/budgets?${params}` : "/budgets");
  };

  if (!snapshot.accounts.length) {
    return (
      <EmptyState
        title="Create a cash account first"
        description="Budgets, sinking funds, and goals live inside the account that holds the money."
        action={
          <Link href="/settings">
            <Button>Add an account</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Your plan</p>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Give every dollar a job</h1>
          <p className="mt-2 max-w-2xl text-ink-secondary">
            Cover the month, keep sinking funds on schedule, and watch goals grow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setQuickOpen(true)} disabled={snapshot.totals.readyToAssign <= 0}>
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Quick assign
          </Button>
          <Button onClick={() => setCreateKind("BUDGET")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New envelope
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-2 py-2 shadow-card">
        <IconButton label="Previous month" onClick={() => go(shiftMonth(month, -1))}>
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <div className="text-center">
          <p className="font-display text-lg font-bold text-ink">{formatMonth(month)}</p>
          {month !== currentMonthKey() && (
            <button type="button" className="text-xs font-semibold text-brand" onClick={() => go(currentMonthKey())}>
              Jump to this month
            </button>
          )}
        </div>
        <IconButton label="Next month" onClick={() => go(shiftMonth(month, 1))}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {snapshot.accounts.map((account) => (
          <Card key={account.id} className="p-4">
            <Stat
              size="sm"
              label={account.name}
              value={account.readyToAssign}
              tone={account.readyToAssign < 0 ? "danger" : account.readyToAssign > 0 ? "brand" : "default"}
              hint="Ready to assign"
            />
          </Card>
        ))}
        <Card className="p-4">
          <Stat size="sm" label="Assigned this month" value={monthPlan.totals.assigned} />
        </Card>
        <Card className="p-4">
          <Stat size="sm" label="Spent this month" value={monthPlan.totals.spent} />
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip selected={reorder} onClick={() => setReorder((value) => !value)} size="sm">
          {reorder ? "Done reordering" : "Reorder"}
        </Chip>
        {snapshot.archivedEnvelopes.length > 0 && (
          <Chip selected={showArchived} onClick={() => setShowArchived((value) => !value)} size="sm">
            Archived ({snapshot.archivedEnvelopes.length})
          </Chip>
        )}
        <Link href="/income" className="ml-auto text-sm font-semibold text-brand">
          Paycheck plan
        </Link>
      </div>

      {(["BUDGET", "SINKING_FUND", "GOAL"] as const).map((kind) => {
        const items = snapshot.envelopes.filter((envelope) => envelope.kind === kind);
        const meta = KIND_META[kind];
        const isCollapsed = collapsed[kind];
        return (
          <section key={kind} aria-labelledby={`${kind}-heading`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCollapsed((current) => ({ ...current, [kind]: !current[kind] }))}
                className="flex min-h-11 items-center gap-2 text-left"
                aria-expanded={!isCollapsed}
              >
                <h2 id={`${kind}-heading`} className="text-lg font-bold text-ink">
                  {meta.plural}
                </h2>
                <span className="text-sm text-ink-muted">{items.length}</span>
              </button>
              <Button size="sm" variant="ghost" onClick={() => setCreateKind(kind)}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add
              </Button>
            </div>
            {!isCollapsed && (
              items.length ? (
                <EnvelopeList
                  kind={kind}
                  items={items}
                  monthPlan={monthPlan}
                  month={month}
                  focusGoalId={snapshot.focusGoalId}
                  reorder={reorder}
                  onOpen={setSelectedId}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setCreateKind(kind)}
                  className="flex min-h-24 w-full items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface/50 text-sm font-semibold text-ink-muted hover:border-brand hover:text-brand-strong"
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add your first {meta.label.toLowerCase()}
                </button>
              )
            )}
          </section>
        );
      })}

      {showArchived && snapshot.archivedEnvelopes.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">Archived</h2>
          <div className="space-y-2">
            {snapshot.archivedEnvelopes.map((envelope) => (
              <button
                key={envelope.id}
                type="button"
                onClick={() => setSelectedId(envelope.id)}
                className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 text-left opacity-70"
              >
                <span className="font-medium text-ink">{envelope.icon ? `${envelope.icon} ` : ""}{envelope.name}</span>
                <span className="tabular text-sm">{formatCurrency(envelope.balance)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-sm text-ink-muted">
        Need to log spending?{" "}
        <button type="button" className="font-semibold text-brand" onClick={() => openAdd("expense")}>
          Add an expense
        </button>
      </p>

      <Sheet
        open={createKind !== null}
        onClose={() => setCreateKind(null)}
        title={createKind ? `New ${KIND_META[createKind].label.toLowerCase()}` : "New envelope"}
      >
        {createKind && (
          <EnvelopeForm
            accounts={snapshot.accounts}
            defaultKind={createKind}
            onSaved={() => setCreateKind(null)}
          />
        )}
      </Sheet>

      <EnvelopeSheet
        envelope={selected}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        accounts={snapshot.accounts}
        stats={selected ? monthPlan.envelopes[selected.id] : undefined}
        focusGoalId={snapshot.focusGoalId}
        onMoveMoney={(mode) => {
          if (!selected) return;
          setMove({ id: selected.id, mode });
        }}
      />
      <MoveMoneySheet
        open={Boolean(move)}
        onClose={() => setMove(null)}
        envelope={moving}
        envelopes={snapshot.envelopes}
        accounts={snapshot.accounts}
        spentThisMonth={spentThisMonth}
        initialMode={move?.mode ?? "fund"}
      />
      <QuickAssignSheet
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        accounts={snapshot.accounts}
        envelopes={snapshot.envelopes}
        spentThisMonth={spentThisMonth}
      />
    </div>
  );
}

function EnvelopeList({
  kind: _kind,
  items,
  monthPlan,
  month,
  focusGoalId,
  reorder,
  onOpen,
}: {
  kind: EnvelopeKind;
  items: SnapshotEnvelope[];
  monthPlan: MonthPlan;
  month: string;
  focusGoalId: string | null;
  reorder: boolean;
  onOpen: (id: string) => void;
}) {
  const [order, setOrder] = useState(items.map((item) => item.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const ids = reorder ? order.filter((id) => items.some((item) => item.id === id)) : items.map((item) => item.id);
  const byId = new Map(items.map((item) => [item.id, item]));

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const next = arrayMove(ids, oldIndex, newIndex);
    setOrder(next);
    await reorderEnvelopesAction(next);
  };

  const list = (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {ids.map((id) => {
        const envelope = byId.get(id);
        if (!envelope) return null;
        return (
          <EnvelopeRow
            key={id}
            envelope={envelope}
            stats={monthPlan.envelopes[id]}
            month={month}
            focused={envelope.id === focusGoalId}
            reorder={reorder}
            onOpen={() => onOpen(id)}
          />
        );
      })}
    </div>
  );

  if (!reorder) return list;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}

function EnvelopeRow({
  envelope,
  stats,
  month,
  focused,
  reorder,
  onOpen,
}: {
  envelope: SnapshotEnvelope;
  stats?: EnvelopeMonthStats;
  month: string;
  focused: boolean;
  reorder: boolean;
  onOpen: () => void;
}) {
  const sortable = useSortable({ id: envelope.id, disabled: !reorder });
  const target = envelopeTarget(envelope);
  const spent = stats?.spent ?? 0;
  const health = budgetHealth(envelope, envelope.balance, spent);
  const projection = envelope.kind === "BUDGET" ? null : projectEnvelope(envelope);
  const progress =
    envelope.kind === "BUDGET" ? health.fundedPercent : percent(envelope.balance, target);
  const tone =
    envelope.balance < 0 ? "danger" : health.status === "underfunded" || projection?.status === "behind" ? "warning" : envelope.kind === "GOAL" ? "positive" : "brand";

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
      className="flex items-stretch rounded-2xl border border-line bg-surface shadow-card"
    >
      {reorder && (
        <button
          type="button"
          aria-label={`Reorder ${envelope.name}`}
          className="flex w-11 items-center justify-center text-ink-muted touch-none"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {envelope.icon ? <span className="mr-1.5">{envelope.icon}</span> : null}
              {envelope.name}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {envelope.kind === "BUDGET" && stats
                ? `${formatCurrency(spent)} spent this month`
                : projection
                  ? projection.status === "complete"
                    ? "Fully funded"
                    : projection.status === "behind"
                      ? "Behind schedule"
                      : projection.status === "on-track"
                        ? "On track"
                        : KIND_META[envelope.kind].label
                  : KIND_META[envelope.kind].label}
              {focused && (
                <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-brand">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> Focus
                </span>
              )}
            </p>
          </div>
          <p className={`tabular text-lg font-bold ${envelope.balance < 0 ? "text-danger" : "text-ink"}`}>
            {formatCurrency(envelope.balance)}
          </p>
        </div>
        {target != null && (
          <div className="mt-3">
            <ProgressBar
              value={progress}
              label={`${envelope.name} progress`}
              tone={tone}
              marker={envelope.kind === "BUDGET" ? monthElapsedRatio(month) * 100 : null}
            />
          </div>
        )}
      </button>
    </div>
  );
}
