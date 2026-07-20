import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { requireAccountAccess, requireEnvelopeAccess } from "@/lib/authorization";
import { applyIncomePlan } from "@/lib/services/allocation";

interface TransactionInput {
  actorId: string;
  accountId: string;
  amount: number;
  description: string;
  type: "INCOME" | "EXPENSE";
  date?: Date;
  envelopeId?: string | null;
  goalImpactEnvelopeId?: string | null;
}

export async function createLedgerTransaction(input: TransactionInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }

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
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        amount: input.amount,
        description: input.description,
        date,
        type: input.type,
        accountId: input.accountId,
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
}

export async function deleteLedgerTransaction(actorId: string, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { transferToAccount: { select: { id: true } } },
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  }

  await requireAccountAccess(actorId, transaction.accountId, "EDIT");
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
}

export async function updateLedgerTransaction(input: {
  actorId: string;
  transactionId: string;
  amount: number;
  description: string;
  date: Date;
  envelopeId?: string | null;
  goalImpactEnvelopeId?: string | null;
}) {
  const existing = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
  });
  if (!existing) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  if (existing.type === "TRANSFER") {
    throw new AppError("Transfers cannot be edited", 400, "TRANSFER_EDIT_UNSUPPORTED");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }
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

  return prisma.$transaction(async (tx) => {
    await tx.envelopeEntry.deleteMany({ where: { transactionId: existing.id } });
    const transaction = await tx.transaction.update({
      where: { id: existing.id },
      data: {
        amount: input.amount,
        description: input.description,
        date: input.date,
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
    return transaction;
  });
}

interface TransferInput {
  actorId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date?: Date;
}

export async function createLedgerTransfer(input: TransferInput) {
  if (input.fromAccountId === input.toAccountId) {
    throw new AppError("Cannot transfer to the same account", 400, "SAME_ACCOUNT");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }

  const [fromAccess, toAccess, fromAccount] = await Promise.all([
    requireAccountAccess(input.actorId, input.fromAccountId, "EDIT"),
    requireAccountAccess(input.actorId, input.toAccountId, "EDIT"),
    prisma.account.findUnique({ where: { id: input.fromAccountId }, select: { balance: true } }),
  ]);

  if (fromAccess.ownerId !== toAccess.ownerId) {
    throw new AppError("Transfers must stay within one dashboard", 400, "OWNER_MISMATCH");
  }
  if (!fromAccount || Number(fromAccount.balance) < input.amount) {
    throw new AppError("Insufficient funds", 400, "INSUFFICIENT_FUNDS", "amount");
  }

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        amount: input.amount,
        description: input.description || "Transfer",
        date: input.date ?? new Date(),
        type: "TRANSFER",
        accountId: input.fromAccountId,
        transferToAccountId: input.toAccountId,
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
    return transaction;
  });
}

export async function fundEnvelope(
  actorId: string,
  envelopeId: string,
  amount: number,
  note = "Manual allocation",
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }
  const { envelope } = await requireEnvelopeAccess(actorId, envelopeId, "EDIT");

  const [account, aggregate] = await Promise.all([
    prisma.account.findUnique({ where: { id: envelope.accountId }, select: { balance: true } }),
    prisma.envelopeEntry.aggregate({
      where: { envelope: { accountId: envelope.accountId } },
      _sum: { amount: true },
    }),
  ]);
  const readyToAssign = Number(account?.balance || 0) - Number(aggregate._sum.amount || 0);
  if (amount > readyToAssign) {
    throw new AppError(
      `Only $${readyToAssign.toFixed(2)} is ready to assign`,
      400,
      "INSUFFICIENT_UNASSIGNED",
      "amount",
    );
  }

  return prisma.envelopeEntry.create({
    data: { envelopeId, amount, type: "ALLOCATION", note },
  });
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
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }

  const [{ envelope: from }, { envelope: to }, aggregate] = await Promise.all([
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
  if (Number(aggregate._sum.amount || 0) < amount) {
    throw new AppError("Not enough money in the source envelope", 400, "INSUFFICIENT_FUNDS");
  }

  const groupId = randomUUID();
  await prisma.envelopeEntry.createMany({
    data: [
      { envelopeId: fromEnvelopeId, amount: -amount, type: "MOVE", groupId, note: `Moved to ${to.name}` },
      { envelopeId: toEnvelopeId, amount, type: "MOVE", groupId, note: `Moved from ${from.name}` },
    ],
  });
}

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

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
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
          transferToAccountId: account.id,
        },
      });
    }
    return account;
  });
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
}

export async function convertLegacyAccount(
  actorId: string,
  sourceAccountId: string,
  destinationAccountId: string,
  envelopeName: string,
  kind: "BUDGET" | "GOAL",
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

  return prisma.$transaction(async (tx) => {
    const envelope = await tx.envelope.create({
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
          envelopeId: envelope.id,
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
    return envelope;
  });
}
