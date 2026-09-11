import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OWNER_CACHE_TTL_SECONDS, ownerTag } from "@/lib/cache";
import type {
  BudgetSnapshot,
  SnapshotEnvelope,
} from "@/lib/data/types";

const num = (value: unknown) => (value == null ? 0 : Number(value));
const nullableNum = (value: unknown) => (value == null ? null : Number(value));
const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const round = (value: number) => Math.round(value * 100) / 100;

async function loadSnapshot(ownerId: string): Promise<BudgetSnapshot> {
  const [owner, accounts, envelopes, sums, plans, preference, payees, bills] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: ownerId }, select: { email: true } }),
      prisma.account.findMany({
        where: { userId: ownerId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.envelope.findMany({
        where: { userId: ownerId },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.envelopeEntry.groupBy({
        by: ["envelopeId"],
        where: { envelope: { userId: ownerId } },
        _sum: { amount: true },
      }),
      prisma.allocationPlan.findMany({
        where: { userId: ownerId },
        include: { rules: { orderBy: { priority: "asc" } } },
      }),
      prisma.goalPreference.findUnique({ where: { userId: ownerId } }),
      prisma.payee.findMany({
        where: { userId: ownerId },
        orderBy: [{ useCount: "desc" }, { lastUsedAt: "desc" }],
        take: 60,
      }),
      prisma.scheduledTransaction.findMany({
        where: { userId: ownerId },
        orderBy: { nextDueAt: "asc" },
      }),
    ]);

  const pendingInvitations = owner
    ? await prisma.invitation.count({
        where: {
          status: "PENDING",
          OR: [{ recipientId: ownerId }, { email: owner.email }],
        },
      })
    : 0;

  const balanceByEnvelope = new Map(
    sums.map((row) => [row.envelopeId, num(row._sum.amount)]),
  );

  const serializedEnvelopes: SnapshotEnvelope[] = envelopes.map((envelope) => ({
    id: envelope.id,
    name: envelope.name,
    kind: envelope.kind,
    icon: envelope.icon,
    note: envelope.note,
    accountId: envelope.accountId,
    balance: round(balanceByEnvelope.get(envelope.id) ?? 0),
    targetAmount: nullableNum(envelope.targetAmount),
    monthlyTarget: nullableNum(envelope.monthlyTarget),
    targetDate: iso(envelope.targetDate),
    rollover: envelope.rollover,
    sortOrder: envelope.sortOrder,
    recurringAmount: nullableNum(envelope.recurringAmount),
    recurringFrequency: envelope.recurringFrequency,
    recurringWeekday: envelope.recurringWeekday,
    recurringDayOfMonth: envelope.recurringDayOfMonth,
    recurringTimezone: envelope.recurringTimezone,
    recurringEnabled: envelope.recurringEnabled,
    nextRecurringAt: iso(envelope.nextRecurringAt),
    lastRecurringAt: iso(envelope.lastRecurringAt),
    archivedAt: iso(envelope.archivedAt),
    createdAt: envelope.createdAt.toISOString(),
  }));

  const active = serializedEnvelopes.filter((envelope) => !envelope.archivedAt);
  const archived = serializedEnvelopes.filter((envelope) => envelope.archivedAt);

  const assignedByAccount = new Map<string, number>();
  for (const envelope of serializedEnvelopes) {
    assignedByAccount.set(
      envelope.accountId,
      (assignedByAccount.get(envelope.accountId) ?? 0) + envelope.balance,
    );
  }

  const serializedAccounts = accounts.map((account) => {
    const balance = num(account.balance);
    const assigned = round(assignedByAccount.get(account.id) ?? 0);
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balance,
      assigned,
      readyToAssign: round(balance - assigned),
      createdAt: account.createdAt.toISOString(),
    };
  });

  const cash = round(serializedAccounts.reduce((sum, account) => sum + account.balance, 0));
  const assigned = round(serializedAccounts.reduce((sum, account) => sum + account.assigned, 0));

  return {
    ownerId,
    generatedAt: new Date().toISOString(),
    accounts: serializedAccounts,
    envelopes: active,
    archivedEnvelopes: archived,
    plans: plans.map((plan) => ({
      id: plan.id,
      accountId: plan.accountId,
      name: plan.name,
      enabled: plan.enabled,
      rules: plan.rules.map((rule) => ({
        envelopeId: rule.envelopeId,
        method: rule.method,
        value: num(rule.value),
        priority: rule.priority,
      })),
    })),
    focusGoalId: preference?.goalEnvelopeId ?? null,
    payees: payees.map((payee) => ({
      id: payee.id,
      name: payee.name,
      useCount: payee.useCount,
      lastUsedAt: payee.lastUsedAt.toISOString(),
      lastEnvelopeId: payee.lastEnvelopeId,
      lastAccountId: payee.lastAccountId,
    })),
    bills: bills.map((bill) => ({
      id: bill.id,
      description: bill.description,
      amount: num(bill.amount),
      type: bill.type,
      accountId: bill.accountId,
      transferToAccountId: bill.transferToAccountId,
      envelopeId: bill.envelopeId,
      payeeId: bill.payeeId,
      frequency: bill.frequency,
      weekday: bill.weekday,
      dayOfMonth: bill.dayOfMonth,
      month: bill.month,
      timezone: bill.timezone,
      nextDueAt: bill.nextDueAt.toISOString(),
      lastPostedAt: iso(bill.lastPostedAt),
      autoPost: bill.autoPost,
      enabled: bill.enabled,
      endsAt: iso(bill.endsAt),
    })),
    pendingInvitations,
    totals: { cash, assigned, readyToAssign: round(cash - assigned) },
  };
}

/**
 * The single read model behind every dashboard page. Cached per owner in the
 * Next data cache (tags are static per wrapper, so one wrapper per owner) and
 * deduplicated per request with React `cache`. Invalidated by `invalidateOwner`
 * after any write.
 */
export const getBudgetSnapshot = cache(async (ownerId: string): Promise<BudgetSnapshot> => {
  const tagged = unstable_cache(loadSnapshot, ["budget-snapshot", ownerId], {
    revalidate: OWNER_CACHE_TTL_SECONDS,
    tags: [ownerTag(ownerId)],
  });
  return tagged(ownerId);
});

/** Envelopes with an automatic contribution that is due right now. */
export function countDueRecurring(snapshot: BudgetSnapshot, now = new Date()) {
  return snapshot.envelopes.filter(
    (envelope) =>
      envelope.recurringEnabled &&
      envelope.nextRecurringAt &&
      new Date(envelope.nextRecurringAt) <= now,
  ).length;
}

/** Bills that are due today or overdue. */
export function dueBills(snapshot: BudgetSnapshot, now = new Date()) {
  return snapshot.bills.filter(
    (bill) => bill.enabled && new Date(bill.nextDueAt) <= now,
  );
}

/** Bills due within the next `days` days, including overdue ones. */
export function upcomingBills(snapshot: BudgetSnapshot, days = 14, now = new Date()) {
  const horizon = new Date(now.getTime() + days * 86_400_000);
  return snapshot.bills.filter(
    (bill) => bill.enabled && new Date(bill.nextDueAt) <= horizon,
  );
}
