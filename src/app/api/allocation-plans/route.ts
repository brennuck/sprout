import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";
import { requireAccountAccess } from "@/lib/authorization";
import { calculateAllocations } from "@/lib/services/allocation";

export const dynamic = "force-dynamic";

const savePlanSchema = z.object({
  accountId: z.string(),
  name: z.string().trim().min(1).max(80).default("Paycheck plan"),
  enabled: z.boolean().default(true),
  rules: z
    .array(
      z.object({
        envelopeId: z.string(),
        method: z.enum(["FIXED", "PERCENT", "REMAINDER"]),
        value: z.number().min(0),
        priority: z.number().int().min(0),
      }),
    )
    .max(50),
});

export async function GET(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId");
    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }
    const access = await requireAccountAccess(user.id, accountId);
    const plan = await prisma.allocationPlan.findUnique({
      where: { userId_accountId: { userId: access.ownerId, accountId } },
      include: {
        rules: {
          include: { envelope: { select: { name: true, kind: true } } },
          orderBy: { priority: "asc" },
        },
      },
    });

    const amount = Number(url.searchParams.get("amount") || 0);
    const rules =
      plan?.rules.map((rule) => ({
        ...rule,
        value: Number(rule.value),
      })) || [];
    const preview =
      amount > 0
        ? calculateAllocations(
            amount,
            rules.map((rule) => ({
              envelopeId: rule.envelopeId,
              method: rule.method,
              value: rule.value,
              priority: rule.priority,
            })),
          )
        : null;

    return NextResponse.json({ plan: plan ? { ...plan, rules } : null, preview });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = savePlanSchema.parse(await request.json());
    const access = await requireAccountAccess(user.id, input.accountId, "EDIT");

    if (new Set(input.rules.map((rule) => rule.envelopeId)).size !== input.rules.length) {
      throw new AppError("Each envelope can appear only once", 400, "DUPLICATE_ENVELOPE");
    }
    if (input.rules.filter((rule) => rule.method === "REMAINDER").length > 1) {
      throw new AppError("Only one remainder rule is allowed", 400, "DUPLICATE_REMAINDER");
    }

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

    const plan = await prisma.$transaction(async (tx) => {
      const saved = await tx.allocationPlan.upsert({
        where: { userId_accountId: { userId: access.ownerId, accountId: input.accountId } },
        create: {
          userId: access.ownerId,
          accountId: input.accountId,
          name: input.name,
          enabled: input.enabled,
        },
        update: { name: input.name, enabled: input.enabled },
      });
      await tx.allocationRule.deleteMany({ where: { planId: saved.id } });
      if (input.rules.length) {
        await tx.allocationRule.createMany({
          data: input.rules.map((rule) => ({ ...rule, planId: saved.id })),
        });
      }
      return saved;
    });

    return NextResponse.json(plan);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
