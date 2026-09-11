import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OWNER_CACHE_TTL_SECONDS, ownerTag } from "@/lib/cache";
import type { TransactionKind, TransactionRow } from "@/lib/data/types";

export const transactionInclude = {
  account: { select: { name: true } },
  transferToAccount: { select: { name: true } },
  envelopeEntries: {
    where: { type: "SPEND" as const },
    include: { envelope: { select: { id: true, name: true } } },
    take: 1,
  },
  goalImpactEnvelope: { select: { id: true, name: true } },
} satisfies Prisma.TransactionInclude;

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

export function serializeTransaction(transaction: TransactionWithRelations): TransactionRow {
  const spend = transaction.envelopeEntries[0];
  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    description: transaction.description,
    notes: transaction.notes,
    type: transaction.type,
    date: transaction.date.toISOString(),
    createdAt: transaction.createdAt.toISOString(),
    accountId: transaction.accountId,
    accountName: transaction.account.name,
    transferToAccountId: transaction.transferToAccountId,
    transferToAccountName: transaction.transferToAccount?.name ?? null,
    envelopeId: spend?.envelope.id ?? null,
    envelopeName: spend?.envelope.name ?? null,
    goalImpactEnvelopeId: transaction.goalImpactEnvelope?.id ?? null,
    goalImpactName: transaction.goalImpactEnvelope?.name ?? null,
    payeeId: transaction.payeeId,
    scheduledTransactionId: transaction.scheduledTransactionId,
  };
}

async function loadRecentTransactions(ownerId: string, take: number) {
  const rows = await prisma.transaction.findMany({
    where: { account: { userId: ownerId } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: transactionInclude,
  });
  return rows.map(serializeTransaction);
}

export const getRecentTransactions = cache(
  async (ownerId: string, take = 20): Promise<TransactionRow[]> => {
    const tagged = unstable_cache(loadRecentTransactions, ["recent-transactions", ownerId], {
      revalidate: OWNER_CACHE_TTL_SECONDS,
      tags: [ownerTag(ownerId)],
    });
    return tagged(ownerId, take);
  },
);

export interface TransactionFilters {
  search?: string;
  type?: TransactionKind | "ALL";
  accountId?: string | "ALL";
  envelopeId?: string | "ALL" | "NONE";
  from?: string;
  to?: string;
}

export interface TransactionPage {
  rows: TransactionRow[];
  nextCursor: string | null;
  total: number;
}

const PAGE_SIZE = 40;

export function buildTransactionWhere(
  ownerId: string,
  filters: TransactionFilters,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { account: { userId: ownerId } };
  const and: Prisma.TransactionWhereInput[] = [];

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    and.push({
      OR: [
        { description: { contains: query, mode: "insensitive" } },
        { notes: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (filters.type && filters.type !== "ALL") and.push({ type: filters.type });
  if (filters.accountId && filters.accountId !== "ALL") {
    and.push({
      OR: [{ accountId: filters.accountId }, { transferToAccountId: filters.accountId }],
    });
  }
  if (filters.envelopeId && filters.envelopeId !== "ALL") {
    if (filters.envelopeId === "NONE") {
      and.push({ type: "EXPENSE", envelopeEntries: { none: { type: "SPEND" } } });
    } else {
      and.push({ envelopeEntries: { some: { envelopeId: filters.envelopeId, type: "SPEND" } } });
    }
  }
  if (filters.from) and.push({ date: { gte: new Date(`${filters.from}T00:00:00.000Z`) } });
  if (filters.to) and.push({ date: { lte: new Date(`${filters.to}T23:59:59.999Z`) } });

  if (and.length) where.AND = and;
  return where;
}

/**
 * Cursor-paginated ledger listing. Not cached: filter combinations are
 * unbounded and results are cheap thanks to the (accountId, date) index.
 */
export async function listTransactions(
  ownerId: string,
  filters: TransactionFilters,
  cursor?: string | null,
  take = PAGE_SIZE,
): Promise<TransactionPage> {
  const where = buildTransactionWhere(ownerId, filters);
  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: transactionInclude,
    }),
    cursor ? Promise.resolve(-1) : prisma.transaction.count({ where }),
  ]);

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    rows: page.map(serializeTransaction),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  };
}
