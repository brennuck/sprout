/**
 * Pure budgeting math shared by the server loaders, server actions, and UI.
 * No I/O here so everything is unit-testable.
 */

import type { SnapshotEnvelope } from "@/lib/data/types";

export const roundMoney = (value: number) => Math.round(value * 100) / 100;
export const toCents = (value: number) => Math.round(value * 100);
export const fromCents = (cents: number) => cents / 100;

// ---------------------------------------------------------------------------
// Month keys (YYYY-MM)
// ---------------------------------------------------------------------------

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): string {
  // Use the local calendar month so the navigator matches what the user sees.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidMonthKey(key: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(key)) return false;
  const month = Number(key.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** UTC range [start, end) covering the month. Ledger dates are stored as UTC noon. */
export function monthRange(key: string): { start: Date; end: Date } {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function shiftMonth(key: string, delta: number): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7)) - 1 + delta;
  const date = new Date(Date.UTC(year, month, 1));
  return monthKey(date);
}

export function formatMonth(key: string, options: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" }) {
  const { start } = monthRange(key);
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(start);
}

export function daysInMonthKey(key: string): number {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0..1 progress through the month for the given instant (1 for past months, 0 for future). */
export function monthElapsedRatio(key: string, now = new Date()): number {
  const { start, end } = monthRange(key);
  if (now <= start) return 0;
  if (now >= end) return 1;
  return (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}

// ---------------------------------------------------------------------------
// Envelope progress
// ---------------------------------------------------------------------------

export function envelopeTarget(envelope: Pick<SnapshotEnvelope, "kind" | "targetAmount" | "monthlyTarget">) {
  if (envelope.kind === "BUDGET") return envelope.monthlyTarget ?? envelope.targetAmount ?? null;
  return envelope.targetAmount ?? envelope.monthlyTarget ?? null;
}

export function percent(value: number, total: number | null | undefined) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

export type EnvelopeStatus = "overspent" | "underfunded" | "on-track" | "funded" | "untargeted";

export interface BudgetEnvelopeHealth {
  status: EnvelopeStatus;
  /** How much money would bring the envelope to its target (0 when funded). */
  shortfall: number;
  /** Percent of target that is covered by current balance. */
  fundedPercent: number;
}

/**
 * Health of a monthly budget envelope in a given month. Underfunded means the
 * money assigned this month plus the carried balance does not reach the
 * monthly target.
 */
export function budgetHealth(
  envelope: Pick<SnapshotEnvelope, "kind" | "targetAmount" | "monthlyTarget">,
  available: number,
  spentThisMonth: number,
): BudgetEnvelopeHealth {
  const target = envelopeTarget(envelope);
  if (available < 0) {
    return { status: "overspent", shortfall: roundMoney(-available), fundedPercent: 0 };
  }
  if (!target) {
    return { status: "untargeted", shortfall: 0, fundedPercent: 0 };
  }
  // For budgets, the "target" describes the whole month's spending power:
  // spent so far + still available.
  const covered = envelope.kind === "BUDGET" ? available + spentThisMonth : available;
  const shortfall = roundMoney(Math.max(0, target - covered));
  const fundedPercent = percent(covered, target);
  if (shortfall <= 0) return { status: "funded", shortfall: 0, fundedPercent: 100 };
  return { status: "underfunded", shortfall, fundedPercent };
}

// ---------------------------------------------------------------------------
// Goal and sinking fund projections
// ---------------------------------------------------------------------------

export interface Projection {
  target: number | null;
  remaining: number;
  /** Months (fractional) until the target date, or null when no date. */
  monthsToTargetDate: number | null;
  /** Contribution per month needed to hit the target on time. */
  neededPerMonth: number | null;
  /** Monthly contribution implied by the recurring schedule. */
  plannedPerMonth: number;
  /** Estimated completion date at the planned rate, or null if never. */
  projectedCompletion: Date | null;
  status: "complete" | "on-track" | "behind" | "no-plan" | "no-target";
}

export function monthlyEquivalent(
  amount: number | null | undefined,
  frequency: "WEEKLY" | "MONTHLY" | null | undefined,
  enabled: boolean,
) {
  if (!enabled || !amount || !frequency) return 0;
  return frequency === "WEEKLY" ? amount * (52 / 12) : amount;
}

export function monthsBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return ms / (365.25 / 12 * 86_400_000);
}

export function projectEnvelope(
  envelope: Pick<
    SnapshotEnvelope,
    "balance" | "targetAmount" | "targetDate" | "recurringAmount" | "recurringFrequency" | "recurringEnabled"
  >,
  now = new Date(),
): Projection {
  const target = envelope.targetAmount ?? null;
  const remaining = target == null ? 0 : roundMoney(Math.max(0, target - envelope.balance));
  const plannedPerMonth = roundMoney(
    monthlyEquivalent(envelope.recurringAmount, envelope.recurringFrequency, envelope.recurringEnabled),
  );
  const targetDate = envelope.targetDate ? new Date(envelope.targetDate) : null;
  const monthsToTargetDate = targetDate ? Math.max(0, monthsBetween(now, targetDate)) : null;

  if (target == null) {
    return {
      target,
      remaining,
      monthsToTargetDate,
      neededPerMonth: null,
      plannedPerMonth,
      projectedCompletion: null,
      status: "no-target",
    };
  }

  if (remaining <= 0) {
    return {
      target,
      remaining: 0,
      monthsToTargetDate,
      neededPerMonth: 0,
      plannedPerMonth,
      projectedCompletion: now,
      status: "complete",
    };
  }

  const neededPerMonth =
    monthsToTargetDate == null
      ? null
      : monthsToTargetDate < 0.05
        ? remaining
        : roundMoney(remaining / monthsToTargetDate);

  const projectedCompletion =
    plannedPerMonth > 0
      ? new Date(now.getTime() + (remaining / plannedPerMonth) * (365.25 / 12) * 86_400_000)
      : null;

  let status: Projection["status"] = "no-plan";
  if (plannedPerMonth > 0) {
    if (targetDate && projectedCompletion) {
      const completionDay = Date.UTC(
        projectedCompletion.getUTCFullYear(),
        projectedCompletion.getUTCMonth(),
        projectedCompletion.getUTCDate(),
      );
      const targetDay = Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
      );
      status = completionDay <= targetDay ? "on-track" : "behind";
    } else {
      status = "on-track";
    }
  } else if (targetDate) {
    status = "behind";
  }

  return {
    target,
    remaining,
    monthsToTargetDate,
    neededPerMonth,
    plannedPerMonth,
    projectedCompletion,
    status,
  };
}

// ---------------------------------------------------------------------------
// Quick assign
// ---------------------------------------------------------------------------

export type QuickAssignStrategy =
  | "FILL_BUDGETS"
  | "COVER_OVERSPENDING"
  | "FUND_DUE"
  | "SPLIT_EVENLY";

export interface QuickAssignLine {
  envelopeId: string;
  amount: number;
}

export interface QuickAssignInput {
  envelopes: Array<
    Pick<SnapshotEnvelope, "id" | "kind" | "accountId" | "balance" | "targetAmount" | "monthlyTarget" | "recurringAmount" | "recurringFrequency" | "recurringEnabled" | "nextRecurringAt">
  >;
  spentThisMonth: Record<string, number>;
  accountId: string;
  readyToAssign: number;
  strategy: QuickAssignStrategy;
  now?: Date;
}

/**
 * Compute a set of allocations for one cash account without exceeding what is
 * ready to assign. Envelopes are considered in the order provided so callers
 * control priority (sortOrder).
 */
export function planQuickAssign(input: QuickAssignInput): { lines: QuickAssignLine[]; total: number; leftover: number } {
  const now = input.now ?? new Date();
  let remaining = toCents(Math.max(0, input.readyToAssign));
  const lines: QuickAssignLine[] = [];
  const envelopes = input.envelopes.filter((envelope) => envelope.accountId === input.accountId);

  const push = (envelopeId: string, cents: number) => {
    const amount = Math.min(remaining, Math.max(0, cents));
    if (amount <= 0) return;
    remaining -= amount;
    lines.push({ envelopeId, amount: fromCents(amount) });
  };

  switch (input.strategy) {
    case "COVER_OVERSPENDING": {
      for (const envelope of envelopes) {
        if (envelope.balance < 0) push(envelope.id, toCents(-envelope.balance));
      }
      break;
    }
    case "FILL_BUDGETS": {
      for (const envelope of envelopes) {
        if (envelope.kind !== "BUDGET") continue;
        const health = budgetHealth(envelope, envelope.balance, input.spentThisMonth[envelope.id] ?? 0);
        if (health.shortfall > 0) push(envelope.id, toCents(health.shortfall));
      }
      break;
    }
    case "FUND_DUE": {
      for (const envelope of envelopes) {
        if (envelope.kind === "BUDGET" || !envelope.recurringEnabled || !envelope.recurringAmount) continue;
        if (!envelope.nextRecurringAt || new Date(envelope.nextRecurringAt) > now) continue;
        push(envelope.id, toCents(envelope.recurringAmount));
      }
      break;
    }
    case "SPLIT_EVENLY": {
      const eligible = envelopes.filter((envelope) => {
        const target = envelopeTarget(envelope);
        return target == null || envelope.balance < target;
      });
      if (!eligible.length) break;
      const share = Math.floor(remaining / eligible.length);
      let extra = remaining - share * eligible.length;
      for (const envelope of eligible) {
        const bonus = extra > 0 ? 1 : 0;
        extra -= bonus;
        push(envelope.id, share + bonus);
      }
      break;
    }
  }

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, total: roundMoney(total), leftover: fromCents(remaining) };
}

// ---------------------------------------------------------------------------
// Bill scheduling helpers (pure)
// ---------------------------------------------------------------------------

export function describeFrequency(
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY",
  weekday?: number | null,
  dayOfMonth?: number | null,
  month?: number | null,
) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  switch (frequency) {
    case "WEEKLY":
      return `Every ${weekdays[weekday ?? 1]}`;
    case "BIWEEKLY":
      return `Every other ${weekdays[weekday ?? 1]}`;
    case "MONTHLY":
      return `Monthly on the ${ordinal(dayOfMonth ?? 1)}`;
    case "YEARLY":
      return `Every ${months[(month ?? 1) - 1]} ${ordinal(dayOfMonth ?? 1)}`;
  }
}

export function ordinal(n: number) {
  const suffix = ["th", "st", "nd", "rd"];
  const value = n % 100;
  return `${n}${suffix[(value - 20) % 10] || suffix[value] || suffix[0]}`;
}

export function daysUntil(date: Date | string, now = new Date()) {
  const target = typeof date === "string" ? new Date(date) : date;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);
}

export function relativeDayLabel(date: Date | string, now = new Date()) {
  const days = daysUntil(date, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days < 7) return `In ${days} days`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}
