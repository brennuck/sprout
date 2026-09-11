import { describe, expect, it } from "vitest";
import { advanceBillAt, getNextBillAt } from "@/lib/services/bills";

describe("bill schedules", () => {
  it("picks the next weekly due date in the user's timezone", () => {
    const next = getNextBillAt(
      { frequency: "WEEKLY", weekday: 1, timezone: "America/Denver" },
      new Date("2026-07-20T16:00:00.000Z"),
    );
    expect(next.toISOString()).toBe("2026-07-27T15:00:00.000Z");
  });

  it("advances a monthly bill into a shorter month", () => {
    const next = advanceBillAt(new Date("2027-01-31T09:00:00.000Z"), {
      frequency: "MONTHLY",
      dayOfMonth: 31,
      timezone: "UTC",
    });
    expect(next.toISOString().startsWith("2027-02-28")).toBe(true);
  });

  it("advances biweekly by 14 days", () => {
    const next = advanceBillAt(new Date("2026-09-01T15:00:00.000Z"), {
      frequency: "BIWEEKLY",
      weekday: 2,
      timezone: "America/Denver",
    });
    expect(next.toISOString()).toBe("2026-09-15T15:00:00.000Z");
  });
});
