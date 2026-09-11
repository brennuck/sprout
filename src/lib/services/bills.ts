import type { Prisma, ScheduleFrequency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { invalidateOwner, invalidateOwners } from "@/lib/cache";
import { requireAccountAccess, requireEnvelopeAccess } from "@/lib/authorization";
import {
  createLedgerTransaction,
  createLedgerTransfer,
} from "@/lib/services/ledger";
import { touchPayee } from "@/lib/services/payees";

export type BillFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

export interface BillScheduleInput {
  frequency: BillFrequency;
  weekday?: number | null;
  dayOfMonth?: number | null;
  month?: number | null;
  timezone: string;
}

interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, timezone: string): LocalDateTime {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function zonedDateTimeToUtc(year: number, month: number, day: number, timezone: string) {
  const target = Date.UTC(year, month - 1, day, 9, 0, 0);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(new Date(guess), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const difference = target - actualAsUtc;
    if (difference === 0) break;
    guess += difference;
  }
  return new Date(guess);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftLocalDate(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function validateTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new AppError("Choose a valid timezone", 400, "INVALID_TIMEZONE", "timezone");
  }
}

export function validateBillSchedule(input: BillScheduleInput) {
  validateTimezone(input.timezone);
  if (
    (input.frequency === "WEEKLY" || input.frequency === "BIWEEKLY") &&
    (!Number.isInteger(input.weekday) || input.weekday! < 0 || input.weekday! > 6)
  ) {
    throw new AppError("Choose a day of the week", 400, "INVALID_WEEKDAY", "weekday");
  }
  if (
    (input.frequency === "MONTHLY" || input.frequency === "YEARLY") &&
    (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth! < 1 || input.dayOfMonth! > 31)
  ) {
    throw new AppError("Choose a day from 1 through 31", 400, "INVALID_MONTH_DAY", "dayOfMonth");
  }
  if (
    input.frequency === "YEARLY" &&
    (!Number.isInteger(input.month) || input.month! < 1 || input.month! > 12)
  ) {
    throw new AppError("Choose a month", 400, "INVALID_MONTH", "month");
  }
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getNextBillAt(input: BillScheduleInput, now = new Date()): Date {
  validateBillSchedule(input);
  const localNow = zonedParts(now, input.timezone);

  const fromShift = (days: number) => {
    const next = shiftLocalDate(localNow.year, localNow.month, localNow.day, days);
    return zonedDateTimeToUtc(next.year, next.month, next.day, input.timezone);
  };

  if (input.frequency === "WEEKLY" || input.frequency === "BIWEEKLY") {
    const currentWeekday = weekdayOf(localNow.year, localNow.month, localNow.day);
    let daysAhead = (input.weekday! - currentWeekday + 7) % 7;
    let candidate = fromShift(daysAhead);
    if (candidate <= now) {
      daysAhead += input.frequency === "BIWEEKLY" ? 14 : 7;
      candidate = fromShift(daysAhead);
    }
    return candidate;
  }

  if (input.frequency === "MONTHLY") {
    const build = (year: number, month: number) => {
      const day = Math.min(input.dayOfMonth!, daysInMonth(year, month));
      return zonedDateTimeToUtc(year, month, day, input.timezone);
    };
    let candidate = build(localNow.year, localNow.month);
    if (candidate <= now) {
      const nextMonth = new Date(Date.UTC(localNow.year, localNow.month, 1));
      candidate = build(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1);
    }
    return candidate;
  }

  const buildYearly = (year: number) => {
    const month = input.month!;
    const day = Math.min(input.dayOfMonth!, daysInMonth(year, month));
    return zonedDateTimeToUtc(year, month, day, input.timezone);
  };
  let candidate = buildYearly(localNow.year);
  if (candidate <= now) candidate = buildYearly(localNow.year + 1);
  return candidate;
}

export function advanceBillAt(scheduledAt: Date, input: BillScheduleInput): Date {
  validateBillSchedule(input);
  const local = zonedParts(scheduledAt, input.timezone);

  if (input.frequency === "WEEKLY" || input.frequency === "BIWEEKLY") {
    const next = shiftLocalDate(
      local.year,
      local.month,
      local.day,
      input.frequency === "WEEKLY" ? 7 : 14,
    );
    return zonedDateTimeToUtc(next.year, next.month, next.day, input.timezone);
  }

  if (input.frequency === "MONTHLY") {
    const nextMonth = new Date(Date.UTC(local.year, local.month, 1));
    const year = nextMonth.getUTCFullYear();
    const month = nextMonth.getUTCMonth() + 1;
    const day = Math.min(input.dayOfMonth!, daysInMonth(year, month));
    return zonedDateTimeToUtc(year, month, day, input.timezone);
  }

  const day = Math.min(input.dayOfMonth!, daysInMonth(local.year + 1, input.month!));
  return zonedDateTimeToUtc(local.year + 1, input.month!, day, input.timezone);
}

function scheduleOf(bill: {
  frequency: ScheduleFrequency;
  weekday: number | null;
  dayOfMonth: number | null;
  month: number | null;
  timezone: string;
}): BillScheduleInput {
  return {
    frequency: bill.frequency,
    weekday: bill.weekday,
    dayOfMonth: bill.dayOfMonth,
    month: bill.month,
    timezone: bill.timezone,
  };
}

export interface BillInput {
  actorId: string;
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  accountId: string;
  transferToAccountId?: string | null;
  envelopeId?: string | null;
  frequency: BillFrequency;
  weekday?: number | null;
  dayOfMonth?: number | null;
  month?: number | null;
  timezone: string;
  startDate?: string;
  autoPost?: boolean;
  enabled?: boolean;
  endsAt?: string | null;
}

async function authorizeBillAccounts(input: BillInput) {
  const access = await requireAccountAccess(input.actorId, input.accountId, "EDIT");
  if (input.type === "TRANSFER") {
    if (!input.transferToAccountId) {
      throw new AppError("Choose where the transfer goes", 400, "MISSING_DESTINATION", "transferToAccountId");
    }
    const to = await requireAccountAccess(input.actorId, input.transferToAccountId, "EDIT");
    if (to.ownerId !== access.ownerId) {
      throw new AppError("Transfers must stay within one dashboard", 400, "OWNER_MISMATCH");
    }
  }
  if (input.envelopeId) {
    const { envelope } = await requireEnvelopeAccess(input.actorId, input.envelopeId, "EDIT");
    if (envelope.accountId !== input.accountId) {
      throw new AppError("The envelope must belong to the bill's account", 400, "ACCOUNT_MISMATCH", "envelopeId");
    }
  }
  return access;
}

function columnsFromInput(input: BillInput) {
  const schedule: BillScheduleInput = {
    frequency: input.frequency,
    weekday: input.frequency === "WEEKLY" || input.frequency === "BIWEEKLY" ? input.weekday ?? 1 : null,
    dayOfMonth: input.frequency === "MONTHLY" || input.frequency === "YEARLY" ? input.dayOfMonth ?? 1 : null,
    month: input.frequency === "YEARLY" ? input.month ?? 1 : null,
    timezone: input.timezone,
  };
  validateBillSchedule(schedule);
  const start = input.startDate ? new Date(`${input.startDate}T12:00:00.000Z`) : new Date();
  return {
    schedule,
    nextDueAt: getNextBillAt(schedule, new Date(start.getTime() - 1)),
  };
}

export async function createBill(input: BillInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new AppError("Amount must be positive", 400, "INVALID_AMOUNT", "amount");
  }
  const access = await authorizeBillAccounts(input);
  const { schedule, nextDueAt } = columnsFromInput(input);
  const bill = await prisma.$transaction(async (tx) => {
    const payeeId = await touchPayee(tx, access.ownerId, input.description, {
      envelopeId: input.envelopeId ?? null,
      accountId: input.accountId,
    });
    return tx.scheduledTransaction.create({
      data: {
        description: input.description.trim(),
        amount: input.amount,
        type: input.type,
        frequency: schedule.frequency,
        weekday: schedule.weekday,
        dayOfMonth: schedule.dayOfMonth,
        month: schedule.month,
        timezone: schedule.timezone,
        nextDueAt,
        autoPost: input.autoPost ?? false,
        enabled: input.enabled ?? true,
        endsAt: input.endsAt ? new Date(`${input.endsAt}T12:00:00.000Z`) : null,
        userId: access.ownerId,
        accountId: input.accountId,
        transferToAccountId: input.type === "TRANSFER" ? input.transferToAccountId ?? null : null,
        envelopeId: input.envelopeId ?? null,
        payeeId,
      },
    });
  });
  invalidateOwner(access.ownerId);
  return bill;
}

export async function updateBill(actorId: string, id: string, patch: Partial<BillInput>) {
  const existing = await prisma.scheduledTransaction.findUnique({ where: { id } });
  if (!existing) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
  const access = await requireAccountAccess(actorId, existing.accountId, "EDIT");
  const merged: BillInput = {
    actorId,
    description: patch.description ?? existing.description,
    amount: patch.amount ?? Number(existing.amount),
    type: (patch.type ?? existing.type) as BillInput["type"],
    accountId: patch.accountId ?? existing.accountId,
    transferToAccountId: patch.transferToAccountId === undefined ? existing.transferToAccountId : patch.transferToAccountId,
    envelopeId: patch.envelopeId === undefined ? existing.envelopeId : patch.envelopeId,
    frequency: patch.frequency ?? existing.frequency,
    weekday: patch.weekday === undefined ? existing.weekday : patch.weekday,
    dayOfMonth: patch.dayOfMonth === undefined ? existing.dayOfMonth : patch.dayOfMonth,
    month: patch.month === undefined ? existing.month : patch.month,
    timezone: patch.timezone ?? existing.timezone,
    autoPost: patch.autoPost ?? existing.autoPost,
    enabled: patch.enabled ?? existing.enabled,
    endsAt: patch.endsAt === undefined ? (existing.endsAt ? existing.endsAt.toISOString().slice(0, 10) : null) : patch.endsAt,
    startDate: patch.startDate,
  };
  await authorizeBillAccounts(merged);
  const { schedule, nextDueAt } = columnsFromInput(merged);
  const bill = await prisma.scheduledTransaction.update({
    where: { id },
    data: {
      description: merged.description.trim(),
      amount: merged.amount,
      type: merged.type,
      frequency: schedule.frequency,
      weekday: schedule.weekday,
      dayOfMonth: schedule.dayOfMonth,
      month: schedule.month,
      timezone: schedule.timezone,
      nextDueAt: patch.startDate || patch.frequency || patch.weekday !== undefined || patch.dayOfMonth !== undefined || patch.month !== undefined || patch.timezone
        ? nextDueAt
        : undefined,
      autoPost: merged.autoPost,
      enabled: merged.enabled,
      endsAt: merged.endsAt ? new Date(`${merged.endsAt}T12:00:00.000Z`) : null,
      accountId: merged.accountId,
      transferToAccountId: merged.type === "TRANSFER" ? merged.transferToAccountId ?? null : null,
      envelopeId: merged.envelopeId ?? null,
    },
  });
  invalidateOwner(access.ownerId);
  return bill;
}

export async function deleteBill(actorId: string, id: string) {
  const existing = await prisma.scheduledTransaction.findUnique({ where: { id } });
  if (!existing) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
  const access = await requireAccountAccess(actorId, existing.accountId, "EDIT");
  await prisma.scheduledTransaction.delete({ where: { id } });
  invalidateOwner(access.ownerId);
}

async function postOne(
  bill: Prisma.ScheduledTransactionGetPayload<object>,
  actorId: string,
  amountOverride?: number,
) {
  if (bill.endsAt && bill.nextDueAt > bill.endsAt) {
    await prisma.scheduledTransaction.update({ where: { id: bill.id }, data: { enabled: false } });
    return { posted: false, skipped: true };
  }

  const existing = await prisma.transaction.findFirst({
    where: { scheduledTransactionId: bill.id, date: bill.nextDueAt },
    select: { id: true },
  });
  const schedule = scheduleOf(bill);
  const nextDueAt = advanceBillAt(bill.nextDueAt, schedule);

  if (existing) {
    await prisma.scheduledTransaction.update({
      where: { id: bill.id },
      data: { nextDueAt, lastPostedAt: bill.nextDueAt },
    });
    return { posted: false, skipped: true };
  }

  const amount = amountOverride ?? Number(bill.amount);
  if (bill.type === "TRANSFER") {
    if (!bill.transferToAccountId) {
      throw new AppError("This transfer is missing a destination account", 400, "MISSING_DESTINATION");
    }
    await createLedgerTransfer({
      actorId,
      fromAccountId: bill.accountId,
      toAccountId: bill.transferToAccountId,
      amount,
      description: bill.description,
      date: bill.nextDueAt,
      scheduledTransactionId: bill.id,
    });
  } else {
    await createLedgerTransaction({
      actorId,
      accountId: bill.accountId,
      amount,
      description: bill.description,
      type: bill.type === "INCOME" ? "INCOME" : "EXPENSE",
      date: bill.nextDueAt,
      envelopeId: bill.envelopeId,
      scheduledTransactionId: bill.id,
      skipPayee: true,
    });
  }

  await prisma.scheduledTransaction.update({
    where: { id: bill.id },
    data: {
      lastPostedAt: bill.nextDueAt,
      nextDueAt,
      enabled: bill.endsAt && nextDueAt > bill.endsAt ? false : bill.enabled,
    },
  });
  return { posted: true, skipped: false, amount };
}

export async function markBillPaid(actorId: string, id: string, amount?: number) {
  const bill = await prisma.scheduledTransaction.findUnique({ where: { id } });
  if (!bill) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
  await requireAccountAccess(actorId, bill.accountId, "EDIT");
  const result = await postOne(bill, actorId, amount);
  invalidateOwner(bill.userId);
  return result;
}

export async function skipBillOccurrence(actorId: string, id: string) {
  const bill = await prisma.scheduledTransaction.findUnique({ where: { id } });
  if (!bill) throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
  const access = await requireAccountAccess(actorId, bill.accountId, "EDIT");
  const nextDueAt = advanceBillAt(bill.nextDueAt, scheduleOf(bill));
  await prisma.scheduledTransaction.update({
    where: { id },
    data: {
      nextDueAt,
      enabled: bill.endsAt && nextDueAt > bill.endsAt ? false : bill.enabled,
    },
  });
  invalidateOwner(access.ownerId);
  return { nextDueAt };
}

export async function processDueBills(options?: { userId?: string; now?: Date; autoPostOnly?: boolean }) {
  const now = options?.now ?? new Date();
  const due = await prisma.scheduledTransaction.findMany({
    where: {
      userId: options?.userId,
      enabled: true,
      nextDueAt: { lte: now },
      ...(options?.autoPostOnly === false ? {} : { autoPost: true }),
    },
    orderBy: { nextDueAt: "asc" },
    take: 200,
  });

  let posted = 0;
  let skipped = 0;
  const owners = new Set<string>();

  for (const bill of due) {
    try {
      const result = await postOne(bill, bill.userId);
      owners.add(bill.userId);
      if (result.posted) posted += 1;
      else skipped += 1;
    } catch (error) {
      console.error("Could not post scheduled transaction", bill.id, error);
    }
  }

  invalidateOwners(owners);
  return { posted, skipped, checked: due.length };
}
