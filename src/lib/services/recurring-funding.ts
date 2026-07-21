import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type RecurringFrequencyValue = "WEEKLY" | "MONTHLY";

export interface RecurringScheduleInput {
  frequency: RecurringFrequencyValue;
  weekday?: number | null;
  dayOfMonth?: number | null;
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

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  timezone: string,
): Date {
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

function shiftLocalDate(
  year: number,
  month: number,
  day: number,
  days: number,
) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function validateSchedule(input: RecurringScheduleInput) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format();
  } catch {
    throw new AppError("Choose a valid timezone", 400, "INVALID_TIMEZONE", "timezone");
  }

  if (
    input.frequency === "WEEKLY" &&
    (!Number.isInteger(input.weekday) || input.weekday! < 0 || input.weekday! > 6)
  ) {
    throw new AppError("Choose a day of the week", 400, "INVALID_WEEKDAY", "weekday");
  }
  if (
    input.frequency === "MONTHLY" &&
    (!Number.isInteger(input.dayOfMonth) ||
      input.dayOfMonth! < 1 ||
      input.dayOfMonth! > 31)
  ) {
    throw new AppError(
      "Choose a day from 1 through 31",
      400,
      "INVALID_MONTH_DAY",
      "dayOfMonth",
    );
  }
}

export function getNextRecurringAt(
  input: RecurringScheduleInput,
  now = new Date(),
): Date {
  validateSchedule(input);
  const localNow = zonedParts(now, input.timezone);

  if (input.frequency === "WEEKLY") {
    const currentWeekday = new Date(
      Date.UTC(localNow.year, localNow.month - 1, localNow.day),
    ).getUTCDay();
    let daysAhead = (input.weekday! - currentWeekday + 7) % 7;
    let candidateDate = shiftLocalDate(
      localNow.year,
      localNow.month,
      localNow.day,
      daysAhead,
    );
    let candidate = zonedDateTimeToUtc(
      candidateDate.year,
      candidateDate.month,
      candidateDate.day,
      input.timezone,
    );
    if (candidate <= now) {
      daysAhead += 7;
      candidateDate = shiftLocalDate(
        localNow.year,
        localNow.month,
        localNow.day,
        daysAhead,
      );
      candidate = zonedDateTimeToUtc(
        candidateDate.year,
        candidateDate.month,
        candidateDate.day,
        input.timezone,
      );
    }
    return candidate;
  }

  const buildMonthlyCandidate = (year: number, month: number) => {
    const day = Math.min(input.dayOfMonth!, daysInMonth(year, month));
    return zonedDateTimeToUtc(year, month, day, input.timezone);
  };

  let candidate = buildMonthlyCandidate(localNow.year, localNow.month);
  if (candidate <= now) {
    const nextMonth = new Date(Date.UTC(localNow.year, localNow.month, 1));
    candidate = buildMonthlyCandidate(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth() + 1,
    );
  }
  return candidate;
}

export function advanceRecurringAt(
  scheduledAt: Date,
  input: RecurringScheduleInput,
): Date {
  validateSchedule(input);
  const localScheduled = zonedParts(scheduledAt, input.timezone);

  if (input.frequency === "WEEKLY") {
    const next = shiftLocalDate(
      localScheduled.year,
      localScheduled.month,
      localScheduled.day,
      7,
    );
    return zonedDateTimeToUtc(next.year, next.month, next.day, input.timezone);
  }

  const nextMonth = new Date(
    Date.UTC(localScheduled.year, localScheduled.month, 1),
  );
  const year = nextMonth.getUTCFullYear();
  const month = nextMonth.getUTCMonth() + 1;
  const day = Math.min(input.dayOfMonth!, daysInMonth(year, month));
  return zonedDateTimeToUtc(year, month, day, input.timezone);
}

type ApplyResult = "APPLIED" | "INSUFFICIENT" | "NOT_DUE";

async function applyOneRecurringContribution(
  envelopeId: string,
  now: Date,
): Promise<ApplyResult> {
  const run = () =>
    prisma.$transaction(
      async (tx) => {
        const envelope = await tx.envelope.findUnique({
          where: { id: envelopeId },
        });
        if (
          !envelope ||
          !["SINKING_FUND", "GOAL"].includes(envelope.kind) ||
          !envelope.recurringEnabled ||
          !envelope.recurringAmount ||
          !envelope.recurringFrequency ||
          !envelope.recurringTimezone ||
          !envelope.nextRecurringAt ||
          envelope.nextRecurringAt > now
        ) {
          return "NOT_DUE" as const;
        }

        const [account, assigned] = await Promise.all([
          tx.account.findUnique({
            where: { id: envelope.accountId },
            select: { balance: true },
          }),
          tx.envelopeEntry.aggregate({
            where: { envelope: { accountId: envelope.accountId } },
            _sum: { amount: true },
          }),
        ]);
        const amount = Number(envelope.recurringAmount);
        const readyToAssign =
          Number(account?.balance || 0) - Number(assigned._sum.amount || 0);
        if (readyToAssign < amount) return "INSUFFICIENT" as const;

        const scheduledFor = envelope.nextRecurringAt;
        const schedule = {
          frequency: envelope.recurringFrequency,
          weekday: envelope.recurringWeekday,
          dayOfMonth: envelope.recurringDayOfMonth,
          timezone: envelope.recurringTimezone,
        };
        const nextRecurringAt = advanceRecurringAt(scheduledFor, schedule);

        await tx.envelopeEntry.create({
          data: {
            envelopeId: envelope.id,
            amount,
            type: "ALLOCATION",
            note: `Automatic ${envelope.recurringFrequency.toLowerCase()} contribution`,
            recurrenceKey: `${envelope.id}:${scheduledFor.toISOString()}`,
            date: scheduledFor,
          },
        });
        await tx.envelope.update({
          where: { id: envelope.id },
          data: {
            lastRecurringAt: scheduledFor,
            nextRecurringAt,
          },
        });
        return "APPLIED" as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return "NOT_DUE";
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }
  return "NOT_DUE";
}

export async function processDueRecurringContributions(options?: {
  userId?: string;
  now?: Date;
  scheduleLimit?: number;
  occurrencesPerSchedule?: number;
}) {
  const now = options?.now ?? new Date();
  const due = await prisma.envelope.findMany({
    where: {
      userId: options?.userId,
      kind: { in: ["SINKING_FUND", "GOAL"] },
      archivedAt: null,
      recurringEnabled: true,
      nextRecurringAt: { lte: now },
    },
    select: { id: true },
    orderBy: { nextRecurringAt: "asc" },
    take: options?.scheduleLimit ?? 200,
  });

  let applied = 0;
  let insufficient = 0;
  const occurrenceLimit = options?.occurrencesPerSchedule ?? 52;

  for (const envelope of due) {
    for (let occurrence = 0; occurrence < occurrenceLimit; occurrence += 1) {
      const result = await applyOneRecurringContribution(envelope.id, now);
      if (result === "APPLIED") {
        applied += 1;
        continue;
      }
      if (result === "INSUFFICIENT") insufficient += 1;
      break;
    }
  }

  return { applied, insufficient, schedulesChecked: due.length };
}
