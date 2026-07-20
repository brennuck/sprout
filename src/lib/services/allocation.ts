import type { AllocationRuleMethod, Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export interface AllocationRuleInput {
  envelopeId: string;
  method: AllocationRuleMethod;
  value: number;
  priority: number;
}

export interface AllocationResult {
  envelopeId: string;
  amount: number;
  method: AllocationRuleMethod;
}

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => value / 100;

export function calculateAllocations(amount: number, rules: AllocationRuleInput[]) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError("Income amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }

  const totalCents = toCents(amount);
  let remainingCents = totalCents;
  const allocations: AllocationResult[] = [];

  for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
    if (remainingCents <= 0) break;

    let allocationCents = 0;
    if (rule.method === "FIXED") {
      allocationCents = Math.min(remainingCents, Math.max(0, toCents(rule.value)));
    } else if (rule.method === "PERCENT") {
      const percentage = Math.min(100, Math.max(0, rule.value));
      allocationCents = Math.min(
        remainingCents,
        Math.round(remainingCents * (percentage / 100)),
      );
    } else {
      allocationCents = remainingCents;
    }

    if (allocationCents > 0) {
      allocations.push({
        envelopeId: rule.envelopeId,
        amount: fromCents(allocationCents),
        method: rule.method,
      });
      remainingCents -= allocationCents;
    }
  }

  return {
    allocations,
    allocated: fromCents(totalCents - remainingCents),
    remainder: fromCents(remainingCents),
  };
}

export async function getAllocationPreview(userId: string, accountId: string, amount: number) {
  const plan = await prisma.allocationPlan.findUnique({
    where: { userId_accountId: { userId, accountId } },
    include: { rules: { orderBy: { priority: "asc" } } },
  });

  if (!plan?.enabled) {
    return { planId: null, allocations: [], allocated: 0, remainder: amount };
  }

  const calculated = calculateAllocations(
    amount,
    plan.rules.map((rule) => ({
      envelopeId: rule.envelopeId,
      method: rule.method,
      value: Number(rule.value),
      priority: rule.priority,
    })),
  );

  return { planId: plan.id, ...calculated };
}

export async function applyIncomePlan(
  tx: Prisma.TransactionClient,
  ownerId: string,
  accountId: string,
  transactionId: string,
  amount: number,
  date: Date,
) {
  const plan = await tx.allocationPlan.findUnique({
    where: { userId_accountId: { userId: ownerId, accountId } },
    include: {
      rules: {
        orderBy: { priority: "asc" },
        include: { envelope: { select: { accountId: true, archivedAt: true } } },
      },
    },
  });

  if (!plan?.enabled) {
    return { planId: null, allocations: [], allocated: 0, remainder: amount };
  }

  const activeRules = plan.rules.filter(
    (rule) => rule.envelope.accountId === accountId && !rule.envelope.archivedAt,
  );
  const calculated = calculateAllocations(
    amount,
    activeRules.map((rule) => ({
      envelopeId: rule.envelopeId,
      method: rule.method,
      value: Number(rule.value),
      priority: rule.priority,
    })),
  );

  if (calculated.allocations.length > 0) {
    await tx.envelopeEntry.createMany({
      data: calculated.allocations.map((allocation) => ({
        amount: allocation.amount,
        type: "ALLOCATION",
        note: "Automatic income allocation",
        date,
        envelopeId: allocation.envelopeId,
        transactionId,
      })),
    });
  }

  return { planId: plan.id, ...calculated };
}
