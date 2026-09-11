import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { requireDashboardAccess } from "@/lib/authorization";
import { fundEnvelope, moveEnvelopeMoney, unassignEnvelopeMoney } from "@/lib/services/ledger";
import { archiveEnvelope, createEnvelope, updateEnvelope } from "@/lib/services/envelopes";
import { createEnvelopeSchema, updateEnvelopeSchema } from "@/lib/validation";

const createSchema = createEnvelopeSchema.extend({
  action: z.literal("CREATE").optional().default("CREATE"),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("FUND"),
    envelopeId: z.string(),
    amount: z.number().positive(),
  }),
  z.object({
    action: z.literal("UNASSIGN"),
    envelopeId: z.string(),
    amount: z.number().positive(),
  }),
  z.object({
    action: z.literal("MOVE"),
    fromEnvelopeId: z.string(),
    toEnvelopeId: z.string(),
    amount: z.number().positive(),
  }),
]);

const updateSchema = updateEnvelopeSchema;

export async function GET(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownerId = new URL(request.url).searchParams.get("ownerId") || user.id;
    await requireDashboardAccess(user.id, ownerId);

    const [envelopes, sums] = await Promise.all([
      prisma.envelope.findMany({
        where: { userId: ownerId, archivedAt: null },
        include: { account: { select: { id: true, name: true, balance: true } } },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.envelopeEntry.groupBy({
        by: ["envelopeId"],
        where: { envelope: { userId: ownerId } },
        _sum: { amount: true },
      }),
    ]);
    const balances = new Map(sums.map((row) => [row.envelopeId, Number(row._sum.amount ?? 0)]));

    return NextResponse.json(
      envelopes.map((envelope) => ({
        ...envelope,
        targetAmount: envelope.targetAmount == null ? null : Number(envelope.targetAmount),
        monthlyTarget: envelope.monthlyTarget == null ? null : Number(envelope.monthlyTarget),
        recurringAmount: envelope.recurringAmount == null ? null : Number(envelope.recurringAmount),
        balance: balances.get(envelope.id) ?? 0,
        account: { ...envelope.account, balance: Number(envelope.account.balance) },
      })),
    );
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();

    if (body.action === "FUND" || body.action === "MOVE" || body.action === "UNASSIGN") {
      const action = actionSchema.parse(body);
      if (action.action === "FUND") {
        const { entry } = await fundEnvelope(user.id, action.envelopeId, action.amount);
        return NextResponse.json({ id: entry.id, groupId: entry.groupId }, { status: 201 });
      }
      if (action.action === "UNASSIGN") {
        const { entry } = await unassignEnvelopeMoney(user.id, action.envelopeId, action.amount);
        return NextResponse.json({ id: entry.id, groupId: entry.groupId }, { status: 201 });
      }
      const { groupId } = await moveEnvelopeMoney(
        user.id,
        action.fromEnvelopeId,
        action.toEnvelopeId,
        action.amount,
      );
      return NextResponse.json({ success: true, groupId }, { status: 201 });
    }

    const input = createSchema.parse(body);
    const envelope = await createEnvelope({ actorId: user.id, ...input });
    return NextResponse.json(envelope, { status: 201 });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = updateSchema.parse(await request.json());
    const envelope = await updateEnvelope({ actorId: user.id, ...input });
    return NextResponse.json(envelope);
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Envelope ID required" }, { status: 400 });
    await archiveEnvelope(user.id, id, true);
    return NextResponse.json({ success: true });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
