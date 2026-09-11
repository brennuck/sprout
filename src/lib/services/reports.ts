import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OWNER_CACHE_TTL_SECONDS, ownerTag } from "@/lib/cache";
import { monthKey as utcMonthKey } from "@/lib/budget-math";
import { calculateGoalImpact } from "@/lib/services/reports-math";

export interface ReportRange {
  from: Date;
  to: Date;
}

export { calculateGoalImpact } from "@/lib/services/reports-math";

const round = (value: number) => Math.round(value * 100) / 100;

interface CashFlowRow {
  month: string;
  type: string;
  total: number;
}

interface SpendRow {
  envelope_id: string | null;
  name: string;
  total: number;
  count: bigint;
}

interface NetDeltaRow {
  month: string;
  total: number;
}

async function loadDashboardReport(ownerId: string, fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);

  const [cashFlowRows, spendRows, netDeltaRows, accounts, envelopes, impactTx] = await Promise.all([
    prisma.$queryRaw<CashFlowRow[]>`
      SELECT to_char(t.date, 'YYYY-MM') AS month, t.type::text AS type, SUM(t.amount)::float AS total
      FROM transactions t
      INNER JOIN accounts a ON a.id = t."accountId"
      WHERE a."userId" = ${ownerId}
        AND t.date >= ${from}
        AND t.date <= ${to}
        AND t.type IN ('INCOME', 'EXPENSE')
      GROUP BY 1, 2
      ORDER BY 1
    `,
    prisma.$queryRaw<SpendRow[]>`
      SELECT e.id AS envelope_id, e.name AS name, SUM(-ee.amount)::float AS total, COUNT(*)::bigint AS count
      FROM envelope_entries ee
      INNER JOIN envelopes e ON e.id = ee."envelopeId"
      WHERE e."userId" = ${ownerId}
        AND ee.type = 'SPEND'
        AND ee.date >= ${from}
        AND ee.date <= ${to}
      GROUP BY e.id, e.name
      ORDER BY total DESC
    `,
    prisma.$queryRaw<NetDeltaRow[]>`
      SELECT to_char(t.date, 'YYYY-MM') AS month,
        SUM(
          CASE
            WHEN t.type = 'INCOME' THEN t.amount
            WHEN t.type = 'EXPENSE' THEN -t.amount
            WHEN t.type = 'ADJUSTMENT' THEN t.amount
            ELSE 0
          END
        )::float AS total
      FROM transactions t
      INNER JOIN accounts a ON a.id = t."accountId"
      WHERE a."userId" = ${ownerId}
        AND t.date <= ${to}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.account.findMany({
      where: { userId: ownerId },
      select: { balance: true },
    }),
    prisma.envelope.findMany({
      where: { userId: ownerId, archivedAt: null },
      select: {
        id: true,
        name: true,
        kind: true,
        targetAmount: true,
        monthlyTarget: true,
        targetDate: true,
        recurringAmount: true,
        recurringFrequency: true,
        recurringEnabled: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["goalImpactEnvelopeId"],
      where: {
        account: { userId: ownerId },
        type: "EXPENSE",
        date: { gte: from, lte: to },
        goalImpactEnvelopeId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const uncategorized = await prisma.transaction.aggregate({
    where: {
      account: { userId: ownerId },
      type: "EXPENSE",
      date: { gte: from, lte: to },
      envelopeEntries: { none: { type: "SPEND" } },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const envelopeBalances = await prisma.envelopeEntry.groupBy({
    by: ["envelopeId"],
    where: { envelope: { userId: ownerId } },
    _sum: { amount: true },
  });
  const balanceById = new Map(envelopeBalances.map((row) => [row.envelopeId, Number(row._sum.amount ?? 0)]));
  const impactById = new Map(
    impactTx.map((row) => [row.goalImpactEnvelopeId!, Number(row._sum.amount ?? 0)]),
  );

  const cashFlowMap = new Map<string, { income: number; spending: number }>();
  let income = 0;
  let spending = 0;
  for (const row of cashFlowRows) {
    const bucket = cashFlowMap.get(row.month) ?? { income: 0, spending: 0 };
    if (row.type === "INCOME") {
      bucket.income += row.total;
      income += row.total;
    } else {
      bucket.spending += row.total;
      spending += row.total;
    }
    cashFlowMap.set(row.month, bucket);
  }
  const cashFlow = Array.from(cashFlowMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month,
      income: round(values.income),
      spending: round(values.spending),
      net: round(values.income - values.spending),
    }));

  const spendingByEnvelope = spendRows.map((row) => ({
    envelopeId: row.envelope_id,
    name: row.name,
    amount: round(row.total),
    count: Number(row.count),
  }));
  const uncategorizedAmount = Number(uncategorized._sum.amount ?? 0);
  if (uncategorizedAmount > 0) {
    spendingByEnvelope.push({
      envelopeId: null,
      name: "Uncategorized",
      amount: round(uncategorizedAmount),
      count: uncategorized._count._all,
    });
  }
  spendingByEnvelope.sort((a, b) => b.amount - a.amount);

  const currentNetWorth = round(accounts.reduce((sum, account) => sum + Number(account.balance), 0));
  const deltas = netDeltaRows.map((row) => ({ month: row.month, total: round(row.total) }));
  const lastMonth = utcMonthKey(to);
  let running = currentNetWorth;
  const afterTo = deltas.filter((row) => row.month > lastMonth).reduce((sum, row) => sum + row.total, 0);
  running -= afterTo;
  const netWorth = deltas
    .filter((row) => row.month <= lastMonth)
    .slice()
    .reverse()
    .map((row) => {
      const point = { month: row.month, value: round(running) };
      running -= row.total;
      return point;
    })
    .reverse();

  const goals = envelopes
    .filter((envelope) => envelope.kind === "GOAL")
    .map((goal) => {
      const funded = round(balanceById.get(goal.id) ?? 0);
      const impactSpend = round(impactById.get(goal.id) ?? 0);
      const target = goal.targetAmount == null ? null : Number(goal.targetAmount);
      const monthlyTarget = goal.monthlyTarget == null ? null : Number(goal.monthlyTarget);
      return {
        id: goal.id,
        name: goal.name,
        funded,
        target,
        targetDate: goal.targetDate?.toISOString() ?? null,
        recurringAmount: goal.recurringAmount == null ? null : Number(goal.recurringAmount),
        recurringFrequency: goal.recurringFrequency,
        recurringEnabled: goal.recurringEnabled,
        hypotheticalSpend: impactSpend,
        ...calculateGoalImpact(funded, impactSpend, target, monthlyTarget),
      };
    });

  const allocated = round(
    envelopes.reduce((sum, envelope) => sum + (balanceById.get(envelope.id) ?? 0), 0),
  );

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      income: round(income),
      spending: round(spending),
      net: round(income - spending),
      currentNetWorth,
      allocated,
    },
    cashFlow,
    spendingByEnvelope,
    netWorth,
    goals,
  };
}

export type DashboardReport = Awaited<ReturnType<typeof loadDashboardReport>>;

export const getDashboardReport = cache(async (ownerId: string, range: ReportRange) => {
  const tagged = unstable_cache(loadDashboardReport, ["dashboard-report", ownerId], {
    revalidate: OWNER_CACHE_TTL_SECONDS,
    tags: [ownerTag(ownerId)],
  });
  return tagged(ownerId, range.from.toISOString(), range.to.toISOString());
});
