import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { invalidateOwner } from "@/lib/cache";
import { requireAccountAccess } from "@/lib/authorization";

export interface PlanRuleInput {
  envelopeId: string;
  method: "FIXED" | "PERCENT" | "REMAINDER";
  value: number;
  priority: number;
}

export async function saveAllocationPlan(input: {
  actorId: string;
  accountId: string;
  name?: string;
  enabled?: boolean;
  rules: PlanRuleInput[];
}) {
  const access = await requireAccountAccess(input.actorId, input.accountId, "EDIT");

  if (new Set(input.rules.map((rule) => rule.envelopeId)).size !== input.rules.length) {
    throw new AppError("Each envelope can appear only once", 400, "DUPLICATE_ENVELOPE");
  }
  if (input.rules.filter((rule) => rule.method === "REMAINDER").length > 1) {
    throw new AppError("Only one remainder rule is allowed", 400, "DUPLICATE_REMAINDER");
  }
  if (input.rules.some((rule) => rule.method === "PERCENT" && rule.value > 100)) {
    throw new AppError("Percent rules cannot exceed 100%", 400, "INVALID_RULE");
  }

  if (input.rules.length) {
    const envelopes = await prisma.envelope.findMany({
      where: { id: { in: input.rules.map((rule) => rule.envelopeId) } },
      select: { id: true, userId: true, accountId: true, archivedAt: true },
    });
    if (
      envelopes.length !== input.rules.length ||
      envelopes.some(
        (envelope) =>
          envelope.userId !== access.ownerId ||
          envelope.accountId !== input.accountId ||
          envelope.archivedAt,
      )
    ) {
      throw new AppError("Every rule must use an active envelope from this account", 400, "INVALID_RULE");
    }
  }

  const plan = await prisma.$transaction(async (tx) => {
    const saved = await tx.allocationPlan.upsert({
      where: { userId_accountId: { userId: access.ownerId, accountId: input.accountId } },
      create: {
        userId: access.ownerId,
        accountId: input.accountId,
        name: input.name ?? "Paycheck plan",
        enabled: input.enabled ?? true,
      },
      update: { name: input.name, enabled: input.enabled },
    });
    await tx.allocationRule.deleteMany({ where: { planId: saved.id } });
    if (input.rules.length) {
      await tx.allocationRule.createMany({
        data: input.rules
          .slice()
          .sort((a, b) => a.priority - b.priority)
          .map((rule, priority) => ({
            envelopeId: rule.envelopeId,
            method: rule.method,
            value: rule.value,
            priority,
            planId: saved.id,
          })),
      });
    }
    return saved;
  });

  invalidateOwner(access.ownerId);
  return plan;
}
