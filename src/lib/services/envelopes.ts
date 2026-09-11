import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { invalidateOwner } from "@/lib/cache";
import { requireAccountAccess, requireEnvelopeAccess } from "@/lib/authorization";
import { getNextRecurringAt } from "@/lib/services/recurring-funding";

export type RecurringScheduleInput =
  | { enabled: false }
  | {
      enabled: true;
      amount: number;
      frequency: "WEEKLY";
      weekday: number;
      dayOfMonth?: null;
      timezone: string;
    }
  | {
      enabled: true;
      amount: number;
      frequency: "MONTHLY";
      weekday?: null;
      dayOfMonth: number;
      timezone: string;
    };

export function recurringColumns(schedule: RecurringScheduleInput | undefined) {
  if (schedule === undefined) return {};
  if (!schedule.enabled) {
    return { recurringEnabled: false, nextRecurringAt: null };
  }
  return {
    recurringAmount: schedule.amount,
    recurringFrequency: schedule.frequency,
    recurringWeekday: schedule.frequency === "WEEKLY" ? schedule.weekday : null,
    recurringDayOfMonth: schedule.frequency === "MONTHLY" ? schedule.dayOfMonth : null,
    recurringTimezone: schedule.timezone,
    recurringEnabled: true,
    nextRecurringAt: getNextRecurringAt({
      frequency: schedule.frequency,
      weekday: schedule.frequency === "WEEKLY" ? schedule.weekday : null,
      dayOfMonth: schedule.frequency === "MONTHLY" ? schedule.dayOfMonth : null,
      timezone: schedule.timezone,
    }),
  };
}

export interface CreateEnvelopeInput {
  actorId: string;
  name: string;
  kind: "BUDGET" | "SINKING_FUND" | "GOAL";
  accountId: string;
  icon?: string | null;
  note?: string | null;
  targetAmount?: number | null;
  monthlyTarget?: number | null;
  targetDate?: string | null;
  rollover?: boolean;
  recurringSchedule?: RecurringScheduleInput;
}

export async function createEnvelope(input: CreateEnvelopeInput) {
  const access = await requireAccountAccess(input.actorId, input.accountId, "EDIT");
  if (input.recurringSchedule?.enabled && input.kind === "BUDGET") {
    throw new AppError(
      "Automatic contributions are only available for sinking funds and goals",
      400,
      "RECURRING_NOT_ALLOWED",
    );
  }
  const maxSort = await prisma.envelope.aggregate({
    where: { userId: access.ownerId, kind: input.kind },
    _max: { sortOrder: true },
  });
  const envelope = await prisma.envelope.create({
    data: {
      name: input.name.trim(),
      kind: input.kind,
      icon: input.icon || null,
      note: input.note?.trim() || null,
      accountId: input.accountId,
      userId: access.ownerId,
      targetAmount: input.targetAmount ?? null,
      monthlyTarget: input.monthlyTarget ?? null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      rollover: input.rollover ?? true,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      ...recurringColumns(input.recurringSchedule),
    },
  });
  invalidateOwner(access.ownerId);
  return envelope;
}

export interface UpdateEnvelopeInput {
  actorId: string;
  id: string;
  name?: string;
  icon?: string | null;
  note?: string | null;
  targetAmount?: number | null;
  monthlyTarget?: number | null;
  targetDate?: string | null;
  rollover?: boolean;
  sortOrder?: number;
  archived?: boolean;
  recurringSchedule?: RecurringScheduleInput;
}

export async function updateEnvelope(input: UpdateEnvelopeInput) {
  const { envelope: existing, access } = await requireEnvelopeAccess(input.actorId, input.id, "EDIT");
  if (input.recurringSchedule?.enabled && existing.kind === "BUDGET") {
    throw new AppError(
      "Automatic contributions are only available for sinking funds and goals",
      400,
      "RECURRING_NOT_ALLOWED",
    );
  }
  const envelope = await prisma.envelope.update({
    where: { id: input.id },
    data: {
      name: input.name?.trim(),
      icon: input.icon === undefined ? undefined : input.icon || null,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
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
      ...recurringColumns(input.recurringSchedule),
    },
  });
  invalidateOwner(access.ownerId);
  return envelope;
}

export async function archiveEnvelope(actorId: string, id: string, archived = true) {
  const { access } = await requireEnvelopeAccess(actorId, id, "EDIT");
  const envelope = await prisma.envelope.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  invalidateOwner(access.ownerId);
  return envelope;
}

/** Persist a new order for envelopes of one kind. */
export async function reorderEnvelopes(actorId: string, orderedIds: string[]) {
  if (!orderedIds.length) return;
  const envelopes = await prisma.envelope.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, userId: true, accountId: true },
  });
  if (envelopes.length !== orderedIds.length) {
    throw new AppError("Some envelopes no longer exist", 404, "ENVELOPE_NOT_FOUND");
  }
  const access = await requireAccountAccess(actorId, envelopes[0].accountId, "EDIT");
  if (envelopes.some((envelope) => envelope.userId !== access.ownerId)) {
    throw new AppError("Envelopes must belong to one dashboard", 400, "OWNER_MISMATCH");
  }
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.envelope.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
  invalidateOwner(access.ownerId);
}

export async function setFocusGoal(actorId: string, goalEnvelopeId: string | null) {
  if (!goalEnvelopeId) {
    await prisma.goalPreference.deleteMany({ where: { userId: actorId } });
    invalidateOwner(actorId);
    return null;
  }
  const { envelope, access } = await requireEnvelopeAccess(actorId, goalEnvelopeId, "VIEW");
  if (envelope.kind !== "GOAL") {
    throw new AppError("Only goals can be the focus goal", 400, "INVALID_GOAL");
  }
  if (access.ownerId !== actorId) {
    throw new AppError("Choose one of your own goals", 400, "OWNER_MISMATCH");
  }
  const preference = await prisma.goalPreference.upsert({
    where: { userId: actorId },
    create: { userId: actorId, goalEnvelopeId },
    update: { goalEnvelopeId },
  });
  invalidateOwner(actorId);
  return preference;
}

export interface EnvelopeHistoryEntry {
  id: string;
  amount: number;
  type: "ALLOCATION" | "SPEND" | "MOVE" | "ADJUSTMENT" | "WITHDRAWAL";
  note: string | null;
  date: string;
  transactionId: string | null;
  groupId: string | null;
}

export async function getEnvelopeHistory(
  actorId: string,
  envelopeId: string,
  cursor?: string | null,
  take = 30,
): Promise<{ rows: EnvelopeHistoryEntry[]; nextCursor: string | null }> {
  await requireEnvelopeAccess(actorId, envelopeId, "VIEW");
  const rows = await prisma.envelopeEntry.findMany({
    where: { envelopeId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    rows: page.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      type: row.type,
      note: row.note,
      date: row.date.toISOString(),
      transactionId: row.transactionId,
      groupId: row.groupId,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
