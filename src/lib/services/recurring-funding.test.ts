import { describe, expect, it } from "vitest";
import {
  advanceRecurringAt,
  getNextRecurringAt,
} from "@/lib/services/recurring-funding";

describe("recurring funding schedule", () => {
  it("chooses the next weekly occurrence in the user's timezone", () => {
    const next = getNextRecurringAt(
      {
        frequency: "WEEKLY",
        weekday: 1,
        timezone: "America/Denver",
      },
      new Date("2026-07-20T16:00:00.000Z"),
    );

    expect(next.toISOString()).toBe("2026-07-27T15:00:00.000Z");
  });

  it("uses today when the local contribution time has not passed", () => {
    const next = getNextRecurringAt(
      {
        frequency: "WEEKLY",
        weekday: 1,
        timezone: "America/Denver",
      },
      new Date("2026-07-20T14:00:00.000Z"),
    );

    expect(next.toISOString()).toBe("2026-07-20T15:00:00.000Z");
  });

  it("uses the last available day for short months", () => {
    const next = advanceRecurringAt(
      new Date("2027-01-31T09:00:00.000Z"),
      {
        frequency: "MONTHLY",
        dayOfMonth: 31,
        timezone: "UTC",
      },
    );

    expect(next.toISOString()).toBe("2027-02-28T09:00:00.000Z");
  });

  it("preserves local contribution time across daylight saving changes", () => {
    const next = advanceRecurringAt(
      new Date("2026-03-02T16:00:00.000Z"),
      {
        frequency: "WEEKLY",
        weekday: 1,
        timezone: "America/Denver",
      },
    );

    expect(next.toISOString()).toBe("2026-03-09T15:00:00.000Z");
  });
});
