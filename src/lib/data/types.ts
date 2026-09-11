export type EnvelopeKind = "BUDGET" | "SINKING_FUND" | "GOAL";
export type RecurringFrequency = "WEEKLY" | "MONTHLY";
export type ScheduleFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
export type TransactionKind = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
export type AllocationMethod = "FIXED" | "PERCENT" | "REMAINDER";

export interface SnapshotAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  /** Sum of every envelope balance backed by this account. */
  assigned: number;
  readyToAssign: number;
  createdAt: string;
}

export interface SnapshotEnvelope {
  id: string;
  name: string;
  kind: EnvelopeKind;
  icon: string | null;
  note: string | null;
  accountId: string;
  balance: number;
  targetAmount: number | null;
  monthlyTarget: number | null;
  targetDate: string | null;
  rollover: boolean;
  sortOrder: number;
  recurringAmount: number | null;
  recurringFrequency: RecurringFrequency | null;
  recurringWeekday: number | null;
  recurringDayOfMonth: number | null;
  recurringTimezone: string | null;
  recurringEnabled: boolean;
  nextRecurringAt: string | null;
  lastRecurringAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface SnapshotRule {
  envelopeId: string;
  method: AllocationMethod;
  value: number;
  priority: number;
}

export interface SnapshotPlan {
  id: string;
  accountId: string;
  name: string;
  enabled: boolean;
  rules: SnapshotRule[];
}

export interface SnapshotPayee {
  id: string;
  name: string;
  useCount: number;
  lastUsedAt: string;
  lastEnvelopeId: string | null;
  lastAccountId: string | null;
}

export interface SnapshotBill {
  id: string;
  description: string;
  amount: number;
  type: TransactionKind;
  accountId: string;
  transferToAccountId: string | null;
  envelopeId: string | null;
  payeeId: string | null;
  frequency: ScheduleFrequency;
  weekday: number | null;
  dayOfMonth: number | null;
  month: number | null;
  timezone: string;
  nextDueAt: string;
  lastPostedAt: string | null;
  autoPost: boolean;
  enabled: boolean;
  endsAt: string | null;
}

export interface BudgetSnapshot {
  ownerId: string;
  generatedAt: string;
  accounts: SnapshotAccount[];
  envelopes: SnapshotEnvelope[];
  archivedEnvelopes: SnapshotEnvelope[];
  plans: SnapshotPlan[];
  focusGoalId: string | null;
  payees: SnapshotPayee[];
  bills: SnapshotBill[];
  pendingInvitations: number;
  totals: {
    cash: number;
    assigned: number;
    readyToAssign: number;
  };
}

export interface TransactionRow {
  id: string;
  amount: number;
  description: string;
  notes: string | null;
  type: TransactionKind;
  date: string;
  createdAt: string;
  accountId: string;
  accountName: string;
  transferToAccountId: string | null;
  transferToAccountName: string | null;
  envelopeId: string | null;
  envelopeName: string | null;
  goalImpactEnvelopeId: string | null;
  goalImpactName: string | null;
  payeeId: string | null;
  scheduledTransactionId: string | null;
}

export interface EnvelopeMonthStats {
  envelopeId: string;
  /** Net money assigned into the envelope during the month (allocations, moves, adjustments, withdrawals). */
  assigned: number;
  /** Money spent from the envelope during the month, as a positive number. */
  spent: number;
  /** Envelope balance at the end of the month (or now, for the current month). */
  available: number;
}

export interface MonthPlan {
  month: string; // YYYY-MM
  envelopes: Record<string, EnvelopeMonthStats>;
  totals: { assigned: number; spent: number; available: number };
}
