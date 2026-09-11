"use server";

import { z } from "zod";
import { requireUser, runAction } from "@/lib/actions/shared";
import {
  createLedgerTransaction,
  createLedgerTransfer,
  deleteLedgerTransaction,
  restoreLedgerTransaction,
  updateLedgerTransaction,
  type DeletedTransactionPayload,
} from "@/lib/services/ledger";
import { listTransactions, type TransactionFilters } from "@/lib/data/transactions";
import { prisma } from "@/lib/prisma";
import { serializeTransaction, transactionInclude } from "@/lib/data/transactions";
import {
  createTransactionSchema,
  ledgerDate,
  transferSchema,
  updateTransactionSchema,
} from "@/lib/validation";

export async function addTransactionAction(input: z.input<typeof createTransactionSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = createTransactionSchema.parse(input);
    const result = await createLedgerTransaction({
      actorId: user.id,
      accountId: data.accountId,
      amount: data.amount,
      description: data.description,
      notes: data.notes,
      type: data.type,
      date: ledgerDate(data.date),
      envelopeId: data.envelopeId,
      goalImpactEnvelopeId: data.goalImpactEnvelopeId,
    });
    const row = await prisma.transaction.findUnique({
      where: { id: result.transaction.id },
      include: transactionInclude,
    });
    return {
      transaction: row ? serializeTransaction(row) : null,
      allocation: result.allocation
        ? {
            allocations: result.allocation.allocations,
            allocated: result.allocation.allocated,
            remainder: result.allocation.remainder,
          }
        : null,
    };
  });
}

export async function addTransferAction(input: z.input<typeof transferSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = transferSchema.parse(input);
    const result = await createLedgerTransfer({
      actorId: user.id,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      amount: data.amount,
      description: data.description,
      date: data.date ? ledgerDate(data.date) : undefined,
    });
    const row = await prisma.transaction.findUnique({
      where: { id: result.transaction.id },
      include: transactionInclude,
    });
    return { transaction: row ? serializeTransaction(row) : null };
  });
}

export async function updateTransactionAction(input: z.input<typeof updateTransactionSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = updateTransactionSchema.parse(input);
    await updateLedgerTransaction({
      actorId: user.id,
      transactionId: data.id,
      amount: data.amount,
      description: data.description,
      notes: data.notes,
      date: ledgerDate(data.date),
      envelopeId: data.envelopeId,
      goalImpactEnvelopeId: data.goalImpactEnvelopeId,
    });
    const row = await prisma.transaction.findUnique({
      where: { id: data.id },
      include: transactionInclude,
    });
    return { transaction: row ? serializeTransaction(row) : null };
  });
}

export async function deleteTransactionAction(transactionId: string) {
  return runAction(async () => {
    const user = await requireUser();
    return deleteLedgerTransaction(user.id, transactionId);
  });
}

export async function restoreTransactionAction(payload: DeletedTransactionPayload) {
  return runAction(async () => {
    const user = await requireUser();
    const result = await restoreLedgerTransaction(user.id, payload);
    return { id: result.transaction.id };
  });
}

export async function loadTransactionsAction(filters: TransactionFilters, cursor?: string | null) {
  return runAction(async () => {
    const user = await requireUser();
    return listTransactions(user.id, filters, cursor);
  });
}
