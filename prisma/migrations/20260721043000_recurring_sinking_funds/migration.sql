ALTER TYPE "EnvelopeKind" ADD VALUE 'SINKING_FUND' BEFORE 'GOAL';

CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

ALTER TABLE "envelopes"
ADD COLUMN "recurringAmount" DECIMAL(12,2),
ADD COLUMN "recurringFrequency" "RecurringFrequency",
ADD COLUMN "recurringWeekday" INTEGER,
ADD COLUMN "recurringDayOfMonth" INTEGER,
ADD COLUMN "recurringTimezone" TEXT,
ADD COLUMN "recurringEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "nextRecurringAt" TIMESTAMP(3),
ADD COLUMN "lastRecurringAt" TIMESTAMP(3);

ALTER TABLE "envelope_entries"
ADD COLUMN "recurrenceKey" TEXT;

CREATE INDEX "envelopes_recurringEnabled_nextRecurringAt_idx"
ON "envelopes"("recurringEnabled", "nextRecurringAt");

CREATE UNIQUE INDEX "envelope_entries_recurrenceKey_key"
ON "envelope_entries"("recurrenceKey");

ALTER TABLE "envelopes"
ADD CONSTRAINT "envelopes_recurring_schedule_check"
CHECK (
    (
        "recurringEnabled" = false
        AND (
            "recurringAmount" IS NULL
            OR "recurringAmount" > 0
        )
    )
    OR
    (
        "recurringEnabled" = true
        AND "kind"::text = 'SINKING_FUND'
        AND "recurringAmount" > 0
        AND "recurringFrequency" IS NOT NULL
        AND "recurringTimezone" IS NOT NULL
        AND "nextRecurringAt" IS NOT NULL
        AND (
            (
                "recurringFrequency" = 'WEEKLY'
                AND "recurringWeekday" BETWEEN 0 AND 6
                AND "recurringDayOfMonth" IS NULL
            )
            OR
            (
                "recurringFrequency" = 'MONTHLY'
                AND "recurringDayOfMonth" BETWEEN 1 AND 31
                AND "recurringWeekday" IS NULL
            )
        )
    )
);
