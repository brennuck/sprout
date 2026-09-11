import { z } from "zod";

export const recurringScheduleSchema = z.union([
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

export const envelopeKindSchema = z.enum(["BUDGET", "SINKING_FUND", "GOAL"]);

export const createEnvelopeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  kind: envelopeKindSchema,
  accountId: z.string().min(1, "Choose a cash account"),
  icon: z.string().max(8).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  targetAmount: z.number().positive().nullable().optional(),
  monthlyTarget: z.number().positive().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  rollover: z.boolean().optional().default(true),
  recurringSchedule: recurringScheduleSchema.optional(),
});

export const updateEnvelopeSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().max(8).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  targetAmount: z.number().positive().nullable().optional(),
  monthlyTarget: z.number().positive().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  rollover: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  archived: z.boolean().optional(),
  recurringSchedule: recurringScheduleSchema.optional(),
});

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

export const moneySchema = z
  .number({ invalid_type_error: "Enter an amount" })
  .positive("Amount must be more than zero")
  .max(9_999_999_999, "Amount is too large");

export const createTransactionSchema = z.object({
  amount: moneySchema,
  description: z.string().trim().min(1, "Description is required").max(120),
  notes: z.string().max(500).nullable().optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Choose an account"),
  date: dateStringSchema.optional(),
  envelopeId: z.string().nullable().optional(),
  goalImpactEnvelopeId: z.string().nullable().optional(),
});

export const updateTransactionSchema = createTransactionSchema
  .omit({ accountId: true, type: true })
  .extend({ id: z.string() });

export const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: moneySchema,
  description: z.string().trim().max(120).optional(),
  date: dateStringSchema.optional(),
});

export const planRuleSchema = z.object({
  envelopeId: z.string(),
  method: z.enum(["FIXED", "PERCENT", "REMAINDER"]),
  value: z.number().min(0),
  priority: z.number().int().min(0),
});

export const savePlanSchema = z.object({
  accountId: z.string(),
  name: z.string().trim().min(1).max(80).default("Paycheck plan"),
  enabled: z.boolean().default(true),
  rules: z.array(planRuleSchema).max(50),
});

export const scheduleFrequencySchema = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]);

export const billSchema = z.object({
  description: z.string().trim().min(1, "Give the bill a name").max(120),
  amount: moneySchema,
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  accountId: z.string().min(1, "Choose an account"),
  transferToAccountId: z.string().nullable().optional(),
  envelopeId: z.string().nullable().optional(),
  frequency: scheduleFrequencySchema,
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  timezone: z.string().trim().min(1).max(100),
  startDate: dateStringSchema.optional(),
  autoPost: z.boolean().default(false),
  enabled: z.boolean().default(true),
  endsAt: dateStringSchema.nullable().optional(),
});

/** Interpret a YYYY-MM-DD string as UTC noon so it lands on the right calendar day everywhere. */
export function ledgerDate(date?: string | null) {
  if (!date) return new Date();
  return new Date(`${date}T12:00:00.000Z`);
}
