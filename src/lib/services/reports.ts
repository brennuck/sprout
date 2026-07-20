import { prisma } from "@/lib/prisma";

export interface ReportRange {
  from: Date;
  to: Date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function calculateGoalImpact(
  funded: number,
  impactSpend: number,
  target: number | null,
  monthlyTarget: number | null,
) {
  return {
    progress: target ? Math.max(0, Math.min(100, (funded / target) * 100)) : null,
    hypotheticalTargetPercent: target ? (impactSpend / target) * 100 : null,
    estimatedDelayDays:
      monthlyTarget && monthlyTarget > 0
        ? Math.ceil((impactSpend / monthlyTarget) * 30)
        : null,
    noImpactEquivalent: funded + impactSpend,
  };
}

export async function getDashboardReport(ownerId: string, range: ReportRange) {
  const [transactions, accounts, envelopes] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        account: { userId: ownerId },
        date: { gte: range.from, lte: range.to },
      },
      include: {
        envelopeEntries: {
          include: { envelope: { select: { id: true, name: true } } },
        },
        goalImpactEnvelope: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.account.findMany({
      where: { userId: ownerId },
      select: { balance: true },
    }),
    prisma.envelope.findMany({
      where: { userId: ownerId, archivedAt: null },
      include: { entries: { select: { amount: true } } },
    }),
  ]);

  const cashFlowMap = new Map<string, { income: number; spending: number }>();
  const spendingMap = new Map<
    string,
    { envelopeId: string | null; name: string; amount: number; count: number }
  >();
  let income = 0;
  let spending = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const key = monthKey(transaction.date);
    const cashFlow = cashFlowMap.get(key) || { income: 0, spending: 0 };
    if (transaction.type === "INCOME") {
      income += amount;
      cashFlow.income += amount;
    }
    if (transaction.type === "EXPENSE") {
      spending += amount;
      cashFlow.spending += amount;
      const envelope = transaction.envelopeEntries.find((entry) => entry.type === "SPEND")?.envelope;
      const spendingKey = envelope?.id || "uncategorized";
      const category = spendingMap.get(spendingKey) || {
        envelopeId: envelope?.id || null,
        name: envelope?.name || "Uncategorized",
        amount: 0,
        count: 0,
      };
      category.amount += amount;
      category.count += 1;
      spendingMap.set(spendingKey, category);
    }
    cashFlowMap.set(key, cashFlow);
  }

  const currentNetWorth = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const cashFlow = Array.from(cashFlowMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({ month, ...values, net: values.income - values.spending }));
  const spendingByEnvelope = Array.from(spendingMap.values()).sort((a, b) => b.amount - a.amount);

  const goals = envelopes
    .filter((envelope) => envelope.kind === "GOAL")
    .map((goal) => {
      const funded = goal.entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
      const impactSpend = transactions
        .filter(
          (transaction) =>
            transaction.type === "EXPENSE" && transaction.goalImpactEnvelopeId === goal.id,
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const target = goal.targetAmount == null ? null : Number(goal.targetAmount);
      const monthlyTarget =
        goal.monthlyTarget == null ? null : Number(goal.monthlyTarget);
      const impact = calculateGoalImpact(funded, impactSpend, target, monthlyTarget);
      return {
        id: goal.id,
        name: goal.name,
        funded,
        target,
        hypotheticalSpend: impactSpend,
        ...impact,
      };
    });

  const allocationTotal = envelopes.reduce(
    (sum, envelope) =>
      sum +
      envelope.entries
        .reduce((entrySum, entry) => entrySum + Number(entry.amount), 0),
    0,
  );

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString() },
    summary: {
      income,
      spending,
      net: income - spending,
      currentNetWorth,
      allocated: allocationTotal,
    },
    cashFlow,
    spendingByEnvelope,
    goals,
  };
}
