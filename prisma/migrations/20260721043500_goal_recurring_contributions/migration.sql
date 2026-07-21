ALTER TABLE "envelopes"
DROP CONSTRAINT "envelopes_recurring_schedule_check";

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
        AND "kind"::text IN ('SINKING_FUND', 'GOAL')
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
