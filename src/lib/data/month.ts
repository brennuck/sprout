import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OWNER_CACHE_TTL_SECONDS, ownerTag } from "@/lib/cache";
import type { EnvelopeMonthStats, MonthPlan } from "@/lib/data/types";
import { monthRange, isValidMonthKey } from "@/lib/budget-math";

const round = (value: number) => Math.round(value * 100) / 100;

async function loadMonthPlan(ownerId: string, month: string): Promise<MonthPlan> {
  const { start, end } = monthRange(month);

  const [assignedRows, spentRows, balanceRows] = await Promise.all([
    prisma.envelopeEntry.groupBy({
      by: ["envelopeId"],
      where: {
        envelope: { userId: ownerId },
        type: { in: ["ALLOCATION", "MOVE", "ADJUSTMENT", "WITHDRAWAL"] },
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    prisma.envelopeEntry.groupBy({
      by: ["envelopeId"],
      where: {
        envelope: { userId: ownerId },
        type: "SPEND",
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    prisma.envelopeEntry.groupBy({
      by: ["envelopeId"],
      where: {
        envelope: { userId: ownerId },
        date: { lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const envelopes: Record<string, EnvelopeMonthStats> = {};
  const ensure = (envelopeId: string) =>
    (envelopes[envelopeId] ??= { envelopeId, assigned: 0, spent: 0, available: 0 });

  for (const row of assignedRows) ensure(row.envelopeId).assigned = round(Number(row._sum.amount ?? 0));
  for (const row of spentRows) ensure(row.envelopeId).spent = round(-Number(row._sum.amount ?? 0));
  for (const row of balanceRows) ensure(row.envelopeId).available = round(Number(row._sum.amount ?? 0));

  const totals = Object.values(envelopes).reduce(
    (sum, stats) => ({
      assigned: round(sum.assigned + stats.assigned),
      spent: round(sum.spent + stats.spent),
      available: round(sum.available + stats.available),
    }),
    { assigned: 0, spent: 0, available: 0 },
  );

  return { month, envelopes, totals };
}

async function loadMonthCashFlow(ownerId: string, month: string) {
  const { start, end } = monthRange(month);
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      account: { userId: ownerId },
      date: { gte: start, lt: end },
      type: { in: ["INCOME", "EXPENSE"] },
    },
    _sum: { amount: true },
  });
  const income = round(Number(rows.find((row) => row.type === "INCOME")?._sum.amount ?? 0));
  const spending = round(Number(rows.find((row) => row.type === "EXPENSE")?._sum.amount ?? 0));
  return { income, spending };
}

export const getMonthCashFlow = cache(async (ownerId: string, month: string) => {
  if (!isValidMonthKey(month)) throw new Error(`Invalid month key: ${month}`);
  const tagged = unstable_cache(loadMonthCashFlow, ["month-cashflow", ownerId, month], {
    revalidate: OWNER_CACHE_TTL_SECONDS,
    tags: [ownerTag(ownerId)],
  });
  return tagged(ownerId, month);
});

export const getMonthPlan = cache(async (ownerId: string, month: string): Promise<MonthPlan> => {
  if (!isValidMonthKey(month)) {
    throw new Error(`Invalid month key: ${month}`);
  }
  const tagged = unstable_cache(loadMonthPlan, ["month-plan", ownerId, month], {
    revalidate: OWNER_CACHE_TTL_SECONDS,
    tags: [ownerTag(ownerId)],
  });
  return tagged(ownerId, month);
});
