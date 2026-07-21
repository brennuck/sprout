import { NextResponse } from "next/server";
import { z } from "zod";
import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import {
  requireAccountAccess,
  requireDashboardAccess,
  requireEnvelopeAccess,
} from "@/lib/authorization";
import { fundEnvelope, moveEnvelopeMoney } from "@/lib/services/ledger";
import { getNextRecurringAt } from "@/lib/services/recurring-funding";

const recurringScheduleSchema = z.union([
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    amount: z.number().positive(),
    frequency: z.literal("WEEKLY"),
    weekday: z.number().int().min(0).max(6),
    dayOfMonth: z.null().optional(),
    timezone: z.string().trim().min(1).max(100),
  }),
  z.object({
    enabled: z.literal(true),
    amount: z.number().positive(),
    frequency: z.literal("MONTHLY"),
    weekday: z.null().optional(),
    dayOfMonth: z.number().int().min(1).max(31),
    timezone: z.string().trim().min(1).max(100),
  }),
]);

const createSchema = z.object({
  action: z.literal("CREATE").optional().default("CREATE"),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["BUDGET", "SINKING_FUND", "GOAL"]),
  accountId: z.string().min(1),
  targetAmount: z.number().positive().nullable().optional(),
  monthlyTarget: z.number().positive().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  rollover: z.boolean().optional().default(true),
  recurringSchedule: recurringScheduleSchema.optional(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("FUND"),
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

const updateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80).optional(),
  targetAmount: z.number().positive().nullable().optional(),
  monthlyTarget: z.number().positive().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  rollover: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  archived: z.boolean().optional(),
  recurringSchedule: recurringScheduleSchema.optional(),
});

function serializeEnvelope<T extends {
  targetAmount: unknown;
  monthlyTarget: unknown;
  recurringAmount: unknown;
  entries: { amount: unknown }[];
}>(
  envelope: T,
) {
  const { entries, ...rest } = envelope;
  return {
    ...rest,
    targetAmount: envelope.targetAmount == null ? null : Number(envelope.targetAmount),
    monthlyTarget: envelope.monthlyTarget == null ? null : Number(envelope.monthlyTarget),
    recurringAmount:
      envelope.recurringAmount == null ? null : Number(envelope.recurringAmount),
    balance: entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
  };
}

export async function GET(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownerId = new URL(request.url).searchParams.get("ownerId") || user.id;
    await requireDashboardAccess(user.id, ownerId);

    const envelopes = await prisma.envelope.findMany({
      where: { userId: ownerId, archivedAt: null },
      include: {
        entries: { select: { amount: true } },
        account: { select: { id: true, name: true, balance: true } },
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(
      envelopes.map((envelope) => ({
        ...serializeEnvelope(envelope),
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

    if (body.action === "FUND" || body.action === "MOVE") {
      const action = actionSchema.parse(body);
      if (action.action === "FUND") {
        const entry = await fundEnvelope(user.id, action.envelopeId, action.amount);
        return NextResponse.json({ id: entry.id }, { status: 201 });
      }
      await moveEnvelopeMoney(
        user.id,
        action.fromEnvelopeId,
        action.toEnvelopeId,
        action.amount,
      );
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const input = createSchema.parse(body);
    const access = await requireAccountAccess(user.id, input.accountId, "EDIT");
    if (
      input.recurringSchedule?.enabled &&
      !["SINKING_FUND", "GOAL"].includes(input.kind)
    ) {
      return NextResponse.json(
        { error: "Automatic contributions are only available for sinking funds and goals" },
        { status: 400 },
      );
    }
    const recurring =
      input.recurringSchedule?.enabled
        ? {
            recurringAmount: input.recurringSchedule.amount,
            recurringFrequency: input.recurringSchedule.frequency,
            recurringWeekday:
              input.recurringSchedule.frequency === "WEEKLY"
                ? input.recurringSchedule.weekday
                : null,
            recurringDayOfMonth:
              input.recurringSchedule.frequency === "MONTHLY"
                ? input.recurringSchedule.dayOfMonth
                : null,
            recurringTimezone: input.recurringSchedule.timezone,
            recurringEnabled: true,
            nextRecurringAt: getNextRecurringAt({
              frequency: input.recurringSchedule.frequency,
              weekday: input.recurringSchedule.weekday,
              dayOfMonth: input.recurringSchedule.dayOfMonth,
              timezone: input.recurringSchedule.timezone,
            }),
          }
        : {};
    const envelope = await prisma.envelope.create({
      data: {
        name: input.name,
        kind: input.kind,
        accountId: input.accountId,
        userId: access.ownerId,
        targetAmount: input.targetAmount,
        monthlyTarget: input.monthlyTarget,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        rollover: input.rollover,
        ...recurring,
      },
    });
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
    const { envelope: existing } = await requireEnvelopeAccess(user.id, input.id, "EDIT");
    if (
      input.recurringSchedule?.enabled &&
      !["SINKING_FUND", "GOAL"].includes(existing.kind)
    ) {
      return NextResponse.json(
        { error: "Automatic contributions are only available for sinking funds and goals" },
        { status: 400 },
      );
    }
    const recurring =
      input.recurringSchedule === undefined
        ? {}
        : input.recurringSchedule.enabled
          ? {
              recurringAmount: input.recurringSchedule.amount,
              recurringFrequency: input.recurringSchedule.frequency,
              recurringWeekday:
                input.recurringSchedule.frequency === "WEEKLY"
                  ? input.recurringSchedule.weekday
                  : null,
              recurringDayOfMonth:
                input.recurringSchedule.frequency === "MONTHLY"
                  ? input.recurringSchedule.dayOfMonth
                  : null,
              recurringTimezone: input.recurringSchedule.timezone,
              recurringEnabled: true,
              nextRecurringAt: getNextRecurringAt({
                frequency: input.recurringSchedule.frequency,
                weekday: input.recurringSchedule.weekday,
                dayOfMonth: input.recurringSchedule.dayOfMonth,
                timezone: input.recurringSchedule.timezone,
              }),
            }
          : {
              recurringEnabled: false,
              nextRecurringAt: null,
            };

    const envelope = await prisma.envelope.update({
      where: { id: input.id },
      data: {
        name: input.name,
        targetAmount: input.targetAmount,
        monthlyTarget: input.monthlyTarget,
        targetDate:
          input.targetDate === undefined
            ? undefined
            : input.targetDate
              ? new Date(input.targetDate)
              : null,
        rollover: input.rollover,
        sortOrder: input.sortOrder,
        archivedAt:
          input.archived === undefined ? undefined : input.archived ? new Date() : null,
        ...recurring,
      },
    });
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
    await requireEnvelopeAccess(user.id, id, "EDIT");
    await prisma.envelope.update({ where: { id }, data: { archivedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const response = errorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
