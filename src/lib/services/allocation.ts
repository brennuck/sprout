import type { AllocationRuleMethod, Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  calculateAllocations as calculatePure,
  type AllocationRuleInput,
  type AllocationResult,
} from "@/lib/allocation-math";

export type { AllocationRuleInput, AllocationResult };

export function calculateAllocations(amount: number, rules: AllocationRuleInput[]) {
  try {
    return calculatePure(amount, rules);
  } catch (error) {
    if (error instanceof RangeError) {
      throw new AppError("Income amount must be positive", 400, "INVALID_AMOUNT", "amount");
    }
    throw error;
  }
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
      method: rule.method as AllocationRuleMethod,
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
