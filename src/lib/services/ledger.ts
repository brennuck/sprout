import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { invalidateOwner } from "@/lib/cache";
import { requireAccountAccess, requireEnvelopeAccess } from "@/lib/authorization";
import { applyIncomePlan } from "@/lib/services/allocation";
import { processDueRecurringContributions } from "@/lib/services/recurring-funding";
import { touchPayee } from "@/lib/services/payees";
import { roundMoney } from "@/lib/budget-math";

function assertPositive(amount: number, field = "amount") {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", field);
  }
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export interface RestoreEntry {
  envelopeId: string;
  amount: number;
  type: "ALLOCATION" | "SPEND" | "MOVE" | "ADJUSTMENT" | "WITHDRAWAL";
  note: string | null;
}

interface TransactionInput {
  actorId: string;
  accountId: string;
  amount: number;
  description: string;
  type: "INCOME" | "EXPENSE";
  date?: Date;
  notes?: string | null;
  envelopeId?: string | null;
  goalImpactEnvelopeId?: string | null;
  scheduledTransactionId?: string | null;
  /** When restoring a deleted transaction, recreate these envelope entries verbatim instead of running plans. */
  restoreEntries?: RestoreEntry[];
  /** Skip payee learning (used for restores and automated postings). */
  skipPayee?: boolean;
}

export async function createLedgerTransaction(input: TransactionInput) {
  assertPositive(input.amount);

  const access = await requireAccountAccess(input.actorId, input.accountId, "EDIT");

  if (input.envelopeId) {
    const { envelope } = await requireEnvelopeAccess(input.actorId, input.envelopeId, "EDIT");
    if (envelope.accountId !== input.accountId) {
      throw new AppError(
        "The envelope must belong to the transaction account",
        400,
        "ACCOUNT_MISMATCH",
        "envelopeId",
      );
    }
  }

  if (input.goalImpactEnvelopeId) {
    const { envelope, access: goalAccess } = await requireEnvelopeAccess(
      input.actorId,
      input.goalImpactEnvelopeId,
      "VIEW",
    );
    if (envelope.kind !== "GOAL" || goalAccess.ownerId !== access.ownerId) {
      throw new AppError("Choose a goal from this dashboard", 400, "INVALID_GOAL", "goalImpactEnvelopeId");
    }
  }

  const date = input.date ?? new Date();
  const result = await prisma.$transaction(async (tx) => {
    const payeeId = input.skipPayee
      ? null
      : await touchPayee(tx, access.ownerId, input.description, {
          envelopeId: input.type === "EXPENSE" ? input.envelopeId ?? null : undefined,
          accountId: input.accountId,
        });

    const transaction = await tx.transaction.create({
      data: {
        amount: input.amount,
        description: input.description,
        notes: input.notes?.trim() || null,
        date,
        type: input.type,
        accountId: input.accountId,
        payeeId,
        scheduledTransactionId: input.scheduledTransactionId ?? null,
        goalImpactEnvelopeId:
          input.type === "EXPENSE" ? input.goalImpactEnvelopeId || null : null,
      },
    });

    await tx.account.update({
      where: { id: input.accountId },
      data: {
        balance: {
          increment: input.type === "EXPENSE" ? -input.amount : input.amount,
        },
      },
    });

    if (input.restoreEntries?.length) {
      await tx.envelopeEntry.createMany({
        data: input.restoreEntries.map((entry) => ({
          envelopeId: entry.envelopeId,
          amount: entry.amount,
          type: entry.type,
          note: entry.note,
          date,
          transactionId: transaction.id,
        })),
      });
      return { transaction, allocation: null };
    }

    if (input.type === "EXPENSE" && input.envelopeId) {
      await tx.envelopeEntry.create({
        data: {
          amount: -input.amount,
          type: "SPEND",
          note: input.description,
          date,
          envelopeId: input.envelopeId,
          transactionId: transaction.id,
        },
      });
    }

    const allocation =
      input.type === "INCOME"
        ? await applyIncomePlan(
            tx,
            access.ownerId,
            input.accountId,
            transaction.id,
            input.amount,
            date,
          )
        : null;

    return { transaction, allocation };
  });

  if (input.type === "INCOME") {
    try {
      await processDueRecurringContributions({ userId: access.ownerId });
    } catch (error) {
      console.error("Could not process due recurring contributions", error);
    }
  }

  invalidateOwner(access.ownerId);
  return { ...result, ownerId: access.ownerId };
}

export interface DeletedTransactionPayload {
  id: string;
  ownerId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
  accountId: string;
  transferToAccountId: string | null;
  amount: number;
  description: string;
  notes: string | null;
  date: string;
  goalImpactEnvelopeId: string | null;
  scheduledTransactionId: string | null;
  entries: RestoreEntry[];
}

export async function deleteLedgerTransaction(
  actorId: string,
  transactionId: string,
): Promise<DeletedTransactionPayload> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { envelopeEntries: true },
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  }

  const access = await requireAccountAccess(actorId, transaction.accountId, "EDIT");
  if (transaction.transferToAccountId) {
    await requireAccountAccess(actorId, transaction.transferToAccountId, "EDIT");
  }

  const amount = Number(transaction.amount);
  await prisma.$transaction(async (tx) => {
    if (transaction.type === "TRANSFER") {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: amount } },
      });
      if (transaction.transferToAccountId) {
        await tx.account.update({
          where: { id: transaction.transferToAccountId },
          data: { balance: { decrement: amount } },
        });
      }
    } else if (transaction.type === "ADJUSTMENT") {
      // Adjustments carry a signed amount.
      await tx.account.update({
        where: { id: transaction.accountId },
        data: { balance: { decrement: amount } },
      });
    } else {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: transaction.type === "EXPENSE" ? amount : -amount,
          },
        },
      });
    }

    await tx.transaction.delete({ where: { id: transactionId } });
  });

  invalidateOwner(access.ownerId);

  return {
    id: transaction.id,
    ownerId: access.ownerId,
    type: transaction.type,
    accountId: transaction.accountId,
    transferToAccountId: transaction.transferToAccountId,
    amount,
    description: transaction.description,
    notes: transaction.notes,
    date: transaction.date.toISOString(),
    goalImpactEnvelopeId: transaction.goalImpactEnvelopeId,
    scheduledTransactionId: transaction.scheduledTransactionId,
    entries: transaction.envelopeEntries.map((entry) => ({
      envelopeId: entry.envelopeId,
      amount: Number(entry.amount),
      type: entry.type,
      note: entry.note,
    })),
  };
}

/** Recreate a deleted transaction exactly (used by Undo). */
export async function restoreLedgerTransaction(actorId: string, payload: DeletedTransactionPayload) {
  const date = new Date(payload.date);
  if (payload.type === "TRANSFER") {
    if (!payload.transferToAccountId) {
      throw new AppError("Transfer destination no longer exists", 400, "MISSING_DESTINATION");
    }
    return createLedgerTransfer({
      actorId,
      fromAccountId: payload.accountId,
      toAccountId: payload.transferToAccountId,
      amount: payload.amount,
      description: payload.description,
      date,
      allowOverdraft: true,
    });
  }
  if (payload.type === "ADJUSTMENT") {
    await requireAccountAccess(actorId, payload.accountId, "EDIT");
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          amount: payload.amount,
          description: payload.description,
          notes: payload.notes,
          date,
          type: "ADJUSTMENT",
          accountId: payload.accountId,
        },
      });
      await tx.account.update({
        where: { id: payload.accountId },
        data: { balance: { increment: payload.amount } },
      });
      return created;
    });
    invalidateOwner(payload.ownerId);
    return { transaction, allocation: null, ownerId: payload.ownerId };
  }
  return createLedgerTransaction({
    actorId,
    accountId: payload.accountId,
    amount: payload.amount,
    description: payload.description,
    notes: payload.notes,
    type: payload.type,
    date,
    goalImpactEnvelopeId: payload.goalImpactEnvelopeId,
    scheduledTransactionId: payload.scheduledTransactionId,
    restoreEntries: payload.entries,
    skipPayee: true,
  });
}

export async function updateLedgerTransaction(input: {
  actorId: string;
  transactionId: string;
  amount: number;
  description: string;
  date: Date;
  notes?: string | null;
  envelopeId?: string | null;
  goalImpactEnvelopeId?: string | null;
}) {
  const existing = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
  });
  if (!existing) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  if (existing.type === "TRANSFER" || existing.type === "ADJUSTMENT") {
    throw new AppError("Transfers and adjustments cannot be edited. Delete and recreate instead.", 400, "EDIT_UNSUPPORTED");
  }
  assertPositive(input.amount);
  const access = await requireAccountAccess(input.actorId, existing.accountId, "EDIT");
  if (input.envelopeId) {
    const { envelope } = await requireEnvelopeAccess(input.actorId, input.envelopeId, "EDIT");
    if (envelope.accountId !== existing.accountId) {
      throw new AppError("Choose an envelope from this account", 400, "ACCOUNT_MISMATCH");
    }
  }
  if (input.goalImpactEnvelopeId) {
    const { envelope, access: goalAccess } = await requireEnvelopeAccess(
      input.actorId,
      input.goalImpactEnvelopeId,
    );
    if (envelope.kind !== "GOAL" || goalAccess.ownerId !== access.ownerId) {
      throw new AppError("Choose a goal from this dashboard", 400, "INVALID_GOAL");
    }
  }

  const oldAmount = Number(existing.amount);
  const balanceDelta =
    existing.type === "EXPENSE" ? oldAmount - input.amount : input.amount - oldAmount;

  const transaction = await prisma.$transaction(async (tx) => {
    await tx.envelopeEntry.deleteMany({ where: { transactionId: existing.id } });
    const payeeId = await touchPayee(tx, access.ownerId, input.description, {
      envelopeId: existing.type === "EXPENSE" ? input.envelopeId ?? null : undefined,
      accountId: existing.accountId,
    });
    const updated = await tx.transaction.update({
      where: { id: existing.id },
      data: {
        amount: input.amount,
        description: input.description,
        notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
        date: input.date,
        payeeId,
        goalImpactEnvelopeId:
          existing.type === "EXPENSE" ? input.goalImpactEnvelopeId || null : null,
      },
    });
    if (balanceDelta !== 0) {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: balanceDelta } },
      });
    }
    if (existing.type === "EXPENSE" && input.envelopeId) {
      await tx.envelopeEntry.create({
        data: {
          envelopeId: input.envelopeId,
          transactionId: existing.id,
          amount: -input.amount,
          type: "SPEND",
          note: input.description,
          date: input.date,
        },
      });
    } else if (existing.type === "INCOME") {
      await applyIncomePlan(
        tx,
        access.ownerId,
        existing.accountId,
        existing.id,
        input.amount,
        input.date,
      );
    }
    return updated;
  });

  invalidateOwner(access.ownerId);
  return transaction;
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

interface TransferInput {
  actorId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date?: Date;
  scheduledTransactionId?: string | null;
  /** Allow the source account to go negative (used for restores). */
  allowOverdraft?: boolean;
}

export async function createLedgerTransfer(input: TransferInput) {
  if (input.fromAccountId === input.toAccountId) {
    throw new AppError("Cannot transfer to the same account", 400, "SAME_ACCOUNT");
  }
  assertPositive(input.amount);

  const [fromAccess, toAccess, fromAccount] = await Promise.all([
    requireAccountAccess(input.actorId, input.fromAccountId, "EDIT"),
    requireAccountAccess(input.actorId, input.toAccountId, "EDIT"),
    prisma.account.findUnique({ where: { id: input.fromAccountId }, select: { balance: true } }),
  ]);

  if (fromAccess.ownerId !== toAccess.ownerId) {
    throw new AppError("Transfers must stay within one dashboard", 400, "OWNER_MISMATCH");
  }
  if (!fromAccount) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  if (!input.allowOverdraft && Number(fromAccount.balance) < input.amount) {
    throw new AppError("Insufficient funds", 400, "INSUFFICIENT_FUNDS", "amount");
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        amount: input.amount,
        description: input.description || "Transfer",
        date: input.date ?? new Date(),
        type: "TRANSFER",
        accountId: input.fromAccountId,
        transferToAccountId: input.toAccountId,
        scheduledTransactionId: input.scheduledTransactionId ?? null,
      },
    });
    await tx.account.update({
      where: { id: input.fromAccountId },
      data: { balance: { decrement: input.amount } },
    });
    await tx.account.update({
      where: { id: input.toAccountId },
      data: { balance: { increment: input.amount } },
    });
    return created;
  });

  invalidateOwner(fromAccess.ownerId);
  return { transaction, allocation: null, ownerId: fromAccess.ownerId };
}

// ---------------------------------------------------------------------------
// Envelope money movement
// ---------------------------------------------------------------------------

async function readyToAssignForAccount(accountId: string) {
  const [account, aggregate] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { balance: true } }),
    prisma.envelopeEntry.aggregate({
      where: { envelope: { accountId } },
      _sum: { amount: true },
    }),
  ]);
  return roundMoney(Number(account?.balance || 0) - Number(aggregate._sum.amount || 0));
}

export async function fundEnvelope(
  actorId: string,
  envelopeId: string,
  amount: number,
  note = "Manual allocation",
) {
  assertPositive(amount);
  const { envelope, access } = await requireEnvelopeAccess(actorId, envelopeId, "EDIT");

  const readyToAssign = await readyToAssignForAccount(envelope.accountId);
  if (amount > readyToAssign + 0.004) {
    throw new AppError(
      `Only $${readyToAssign.toFixed(2)} is ready to assign`,
      400,
      "INSUFFICIENT_UNASSIGNED",
      "amount",
    );
  }

  const entry = await prisma.envelopeEntry.create({
    data: { envelopeId, amount, type: "ALLOCATION", note, groupId: randomUUID() },
  });
  invalidateOwner(access.ownerId);
  return { entry, ownerId: access.ownerId };
}

/** Return money from an envelope to ready-to-assign. */
export async function unassignEnvelopeMoney(
  actorId: string,
  envelopeId: string,
  amount: number,
  note = "Returned to ready to assign",
) {
  assertPositive(amount);
  const { envelope, access } = await requireEnvelopeAccess(actorId, envelopeId, "EDIT");
  const aggregate = await prisma.envelopeEntry.aggregate({
    where: { envelopeId },
    _sum: { amount: true },
  });
  if (Number(aggregate._sum.amount || 0) + 0.004 < amount) {
    throw new AppError(`${envelope.name} only has $${Number(aggregate._sum.amount || 0).toFixed(2)}`, 400, "INSUFFICIENT_FUNDS", "amount");
  }
  const entry = await prisma.envelopeEntry.create({
    data: { envelopeId, amount: -amount, type: "WITHDRAWAL", note, groupId: randomUUID() },
  });
  invalidateOwner(access.ownerId);
  return { entry, ownerId: access.ownerId };
}

export async function moveEnvelopeMoney(
  actorId: string,
  fromEnvelopeId: string,
  toEnvelopeId: string,
  amount: number,
) {
  if (fromEnvelopeId === toEnvelopeId) {
    throw new AppError("Choose two different envelopes", 400, "SAME_ENVELOPE");
  }
  assertPositive(amount);

  const [{ envelope: from, access }, { envelope: to }, aggregate] = await Promise.all([
    requireEnvelopeAccess(actorId, fromEnvelopeId, "EDIT"),
    requireEnvelopeAccess(actorId, toEnvelopeId, "EDIT"),
    prisma.envelopeEntry.aggregate({
      where: { envelopeId: fromEnvelopeId },
      _sum: { amount: true },
    }),
  ]);

  if (from.accountId !== to.accountId || from.userId !== to.userId) {
    throw new AppError("Envelope moves must stay in one account", 400, "ACCOUNT_MISMATCH");
  }
  if (Number(aggregate._sum.amount || 0) + 0.004 < amount) {
    throw new AppError("Not enough money in the source envelope", 400, "INSUFFICIENT_FUNDS");
  }

  const groupId = randomUUID();
  await prisma.envelopeEntry.createMany({
    data: [
      { envelopeId: fromEnvelopeId, amount: -amount, type: "MOVE", groupId, note: `Moved to ${to.name}` },
      { envelopeId: toEnvelopeId, amount, type: "MOVE", groupId, note: `Moved from ${from.name}` },
    ],
  });
  invalidateOwner(access.ownerId);
  return { groupId, ownerId: access.ownerId };
}

/** Assign money to several envelopes of one account atomically. */
export async function quickAssign(
  actorId: string,
  accountId: string,
  lines: { envelopeId: string; amount: number }[],
  note = "Quick assign",
) {
  const clean = lines.filter((line) => line.amount > 0);
  if (!clean.length) throw new AppError("Nothing to assign", 400, "EMPTY_ASSIGNMENT");
  for (const line of clean) assertPositive(line.amount);

  const access = await requireAccountAccess(actorId, accountId, "EDIT");
  const envelopes = await prisma.envelope.findMany({
    where: { id: { in: clean.map((line) => line.envelopeId) } },
    select: { id: true, accountId: true, userId: true, archivedAt: true },
  });
  if (
    envelopes.length !== clean.length ||
    envelopes.some((envelope) => envelope.accountId !== accountId || envelope.userId !== access.ownerId || envelope.archivedAt)
  ) {
    throw new AppError("Every envelope must belong to this account", 400, "ACCOUNT_MISMATCH");
  }

  const total = roundMoney(clean.reduce((sum, line) => sum + line.amount, 0));
  const readyToAssign = await readyToAssignForAccount(accountId);
  if (total > readyToAssign + 0.004) {
    throw new AppError(`Only $${readyToAssign.toFixed(2)} is ready to assign`, 400, "INSUFFICIENT_UNASSIGNED");
  }

  const groupId = randomUUID();
  await prisma.envelopeEntry.createMany({
    data: clean.map((line) => ({
      envelopeId: line.envelopeId,
      amount: line.amount,
      type: "ALLOCATION" as const,
      note,
      groupId,
    })),
  });
  invalidateOwner(access.ownerId);
  return { groupId, total, ownerId: access.ownerId };
}

/** Reverse a manual allocation, move, withdrawal, or quick assign by its group id. */
export async function undoEnvelopeGroup(actorId: string, groupId: string) {
  const entries = await prisma.envelopeEntry.findMany({
    where: { groupId },
    include: { envelope: { select: { userId: true, accountId: true } } },
  });
  if (!entries.length) throw new AppError("Nothing to undo", 404, "GROUP_NOT_FOUND");
  if (entries.some((entry) => entry.transactionId || entry.recurrenceKey)) {
    throw new AppError("This change is linked to a transaction and cannot be undone directly", 400, "LINKED_ENTRY");
  }
  const access = await requireAccountAccess(actorId, entries[0].envelope.accountId, "EDIT");
  await prisma.envelopeEntry.deleteMany({ where: { groupId } });
  invalidateOwner(access.ownerId);
  return { ownerId: access.ownerId };
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

interface AccountInput {
  actorId: string;
  name: string;
  type: "SAVINGS" | "BUDGET" | "ALLOWANCE" | "RETIREMENT" | "STOCK";
  startingBalance?: number;
  fundFromAccountId?: string;
  fundAmount?: number;
}

export async function createLedgerAccount(input: AccountInput) {
  const startingBalance = input.startingBalance || 0;
  const fundAmount = input.fundAmount || 0;
  if (startingBalance < 0 || fundAmount < 0) {
    throw new AppError("Starting amounts cannot be negative", 400, "INVALID_AMOUNT");
  }

  if (input.fundFromAccountId) {
    await requireAccountAccess(input.actorId, input.fundFromAccountId, "EDIT");
    const source = await prisma.account.findUnique({
      where: { id: input.fundFromAccountId },
      select: { balance: true, userId: true },
    });
    if (!source || source.userId !== input.actorId) {
      throw new AppError("New accounts can only be funded from your own account", 400, "OWNER_MISMATCH");
    }
    if (Number(source.balance) < fundAmount) {
      throw new AppError("Insufficient funds in source account", 400, "INSUFFICIENT_FUNDS");
    }
  }

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: {
        name: input.name,
        type: input.type,
        balance: startingBalance + fundAmount,
        userId: input.actorId,
      },
    });
    if (input.fundFromAccountId && fundAmount > 0) {
      await tx.account.update({
        where: { id: input.fundFromAccountId },
        data: { balance: { decrement: fundAmount } },
      });
      await tx.transaction.create({
        data: {
          amount: fundAmount,
          description: `Initial funding for ${input.name}`,
          date: new Date(),
          type: "TRANSFER",
          accountId: input.fundFromAccountId,
          transferToAccountId: created.id,
        },
      });
    }
    return created;
  });
  invalidateOwner(input.actorId);
  return account;
}

export async function renameLedgerAccount(actorId: string, accountId: string, name: string) {
  const clean = name.trim();
  if (!clean) throw new AppError("Name is required", 400, "INVALID_NAME", "name");
  const access = await requireAccountAccess(actorId, accountId, "EDIT");
  const account = await prisma.account.update({ where: { id: accountId }, data: { name: clean.slice(0, 80) } });
  invalidateOwner(access.ownerId);
  return account;
}

/**
 * Reconcile an account to the balance the bank reports. The difference is
 * recorded as a signed ADJUSTMENT transaction so history stays auditable.
 */
export async function reconcileLedgerAccount(
  actorId: string,
  accountId: string,
  actualBalance: number,
  note = "Balance reconciled",
) {
  if (!Number.isFinite(actualBalance)) {
    throw new AppError("Enter the balance from your bank", 400, "INVALID_AMOUNT", "actualBalance");
  }
  const access = await requireAccountAccess(actorId, accountId, "EDIT");
  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { balance: true } });
  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  const difference = roundMoney(actualBalance - Number(account.balance));
  if (difference === 0) return { transaction: null, difference: 0, ownerId: access.ownerId };

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        amount: difference,
        description: note,
        date: new Date(),
        type: "ADJUSTMENT",
        accountId,
      },
    });
    await tx.account.update({ where: { id: accountId }, data: { balance: actualBalance } });
    return created;
  });
  invalidateOwner(access.ownerId);
  return { transaction, difference, ownerId: access.ownerId };
}

export async function deleteLedgerAccount(actorId: string, accountId: string) {
  const access = await requireAccountAccess(actorId, accountId, "EDIT");
  if (access.ownerId !== actorId) {
    throw new AppError("Only the owner can delete an account", 403, "OWNER_REQUIRED");
  }
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { balance: true, name: true },
  });
  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  if (Number(account.balance) !== 0) {
    throw new AppError(
      `Move the remaining balance from ${account.name} before deleting it`,
      400,
      "NON_ZERO_BALANCE",
    );
  }
  await prisma.account.delete({ where: { id: accountId } });
  invalidateOwner(actorId);
}

export async function convertLegacyAccount(
  actorId: string,
  sourceAccountId: string,
  destinationAccountId: string,
  envelopeName: string,
  kind: "BUDGET" | "SINKING_FUND" | "GOAL",
) {
  if (sourceAccountId === destinationAccountId) {
    throw new AppError("Choose a different cash account", 400, "SAME_ACCOUNT");
  }
  const [sourceAccess, destinationAccess, source] = await Promise.all([
    requireAccountAccess(actorId, sourceAccountId, "EDIT"),
    requireAccountAccess(actorId, destinationAccountId, "EDIT"),
    prisma.account.findUnique({
      where: { id: sourceAccountId },
      select: { name: true, type: true, balance: true },
    }),
  ]);
  if (
    sourceAccess.ownerId !== actorId ||
    destinationAccess.ownerId !== actorId ||
    !source ||
    !["BUDGET", "ALLOWANCE"].includes(source.type)
  ) {
    throw new AppError("Only your legacy budget accounts can be converted", 400, "NOT_LEGACY");
  }
  const amount = Number(source.balance);
  if (amount < 0) {
    throw new AppError("Resolve the negative balance before converting", 400, "NEGATIVE_BALANCE");
  }

  const envelope = await prisma.$transaction(async (tx) => {
    const created = await tx.envelope.create({
      data: {
        name: envelopeName,
        kind,
        userId: actorId,
        accountId: destinationAccountId,
      },
    });
    if (amount > 0) {
      const transfer = await tx.transaction.create({
        data: {
          amount,
          description: `Converted ${source.name} to ${envelopeName}`,
          date: new Date(),
          type: "TRANSFER",
          accountId: sourceAccountId,
          transferToAccountId: destinationAccountId,
        },
      });
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { balance: { decrement: amount }, name: `${source.name} (converted)` },
      });
      await tx.account.update({
        where: { id: destinationAccountId },
        data: { balance: { increment: amount } },
      });
      await tx.envelopeEntry.create({
        data: {
          envelopeId: created.id,
          transactionId: transfer.id,
          amount,
          type: "ALLOCATION",
          note: `Converted from ${source.name}`,
        },
      });
    } else {
      await tx.account.update({
        where: { id: sourceAccountId },
        data: { name: `${source.name} (converted)` },
      });
    }
    return created;
  });
  invalidateOwner(actorId);
  return envelope;
}
