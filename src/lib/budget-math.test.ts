import { describe, expect, it } from "vitest";
import {
  budgetHealth,
  currentMonthKey,
  daysUntil,
  describeFrequency,
  isValidMonthKey,
  monthElapsedRatio,
  monthKey,
  monthRange,
  monthlyEquivalent,
  ordinal,
  percent,
  planQuickAssign,
  projectEnvelope,
  relativeDayLabel,
  shiftMonth,
} from "@/lib/budget-math";

const envelope = {
  id: "groceries",
  kind: "BUDGET" as const,
  accountId: "checking",
  balance: 80,
  targetAmount: null,
  monthlyTarget: 400,
  recurringAmount: null,
  recurringFrequency: null,
  recurringEnabled: false,
  nextRecurringAt: null,
};

describe("month keys", () => {
  it("formats, shifts, and validates YYYY-MM keys", () => {
    expect(monthKey(new Date(Date.UTC(2026, 8, 10)))).toBe("2026-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(isValidMonthKey("2026-09")).toBe(true);
    expect(isValidMonthKey("2026-13")).toBe(false);
    expect(currentMonthKey(new Date(2026, 8, 10))).toBe("2026-09");
  });

  it("returns a UTC range covering the month", () => {
    const { start, end } = monthRange("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});

describe("budgetHealth", () => {
  it("treats a negative balance as overspent", () => {
    expect(budgetHealth(envelope, -12, 50)).toMatchObject({ status: "overspent", shortfall: 12 });
  });

  it("counts spent plus remaining toward a monthly target", () => {
    const health = budgetHealth(envelope, 80, 120);
    expect(health.status).toBe("underfunded");
    expect(health.shortfall).toBe(200);
  });

  it("marks a budget funded when spent plus available covers the target", () => {
    expect(budgetHealth(envelope, 200, 200).status).toBe("funded");
  });
});

describe("projectEnvelope", () => {
  it("projects completion from a monthly contribution", () => {
    const result = projectEnvelope(
      {
        balance: 250,
        targetAmount: 1000,
        targetDate: "2026-12-01T00:00:00.000Z",
        recurringAmount: 250,
        recurringFrequency: "MONTHLY",
        recurringEnabled: true,
      },
      new Date("2026-09-01T12:00:00.000Z"),
    );
    expect(result.status).toBe("on-track");
    expect(result.remaining).toBe(750);
    expect(result.plannedPerMonth).toBe(250);
    expect(result.projectedCompletion?.toISOString().startsWith("2026-12")).toBe(true);
  });

  it("flags a goal as behind when the schedule cannot hit the date", () => {
    const result = projectEnvelope(
      {
        balance: 0,
        targetAmount: 1200,
        targetDate: "2026-10-01T00:00:00.000Z",
        recurringAmount: 50,
        recurringFrequency: "MONTHLY",
        recurringEnabled: true,
      },
      new Date("2026-09-01T12:00:00.000Z"),
    );
    expect(result.status).toBe("behind");
    expect(result.neededPerMonth).toBeGreaterThan(50);
  });
});

describe("planQuickAssign", () => {
  const envelopes = [
    { ...envelope, id: "over", balance: -40, monthlyTarget: 200 },
    { ...envelope, id: "groceries", balance: 50, monthlyTarget: 200 },
    {
      ...envelope,
      id: "car",
      kind: "SINKING_FUND" as const,
      monthlyTarget: null,
      targetAmount: 600,
      recurringEnabled: true,
      recurringAmount: 75,
      recurringFrequency: "MONTHLY" as const,
      nextRecurringAt: "2026-09-01T15:00:00.000Z",
    },
    { ...envelope, id: "fun", balance: 10, monthlyTarget: 80 },
  ];

  it("covers overspent envelopes first", () => {
    const result = planQuickAssign({
      envelopes,
      spentThisMonth: {},
      accountId: "checking",
      readyToAssign: 100,
      strategy: "COVER_OVERSPENDING",
    });
    expect(result.lines).toEqual([{ envelopeId: "over", amount: 40 }]);
    expect(result.leftover).toBe(60);
  });

  it("fills monthly budgets up to their target without exceeding ready-to-assign", () => {
    const result = planQuickAssign({
      envelopes,
      spentThisMonth: { groceries: 20, fun: 0 },
      accountId: "checking",
      readyToAssign: 200,
      strategy: "FILL_BUDGETS",
    });
    expect(result.lines.find((line) => line.envelopeId === "groceries")?.amount).toBe(130);
    expect(result.total).toBeLessThanOrEqual(200);
  });

  it("funds due sinking-fund contributions", () => {
    const result = planQuickAssign({
      envelopes,
      spentThisMonth: {},
      accountId: "checking",
      readyToAssign: 100,
      strategy: "FUND_DUE",
      now: new Date("2026-09-10T12:00:00.000Z"),
    });
    expect(result.lines).toEqual([{ envelopeId: "car", amount: 75 }]);
  });

  it("splits leftover cents evenly", () => {
    const result = planQuickAssign({
      envelopes: [
        { ...envelope, id: "a", balance: 0, monthlyTarget: null },
        { ...envelope, id: "b", balance: 0, monthlyTarget: null },
        { ...envelope, id: "c", balance: 0, monthlyTarget: null },
      ],
      spentThisMonth: {},
      accountId: "checking",
      readyToAssign: 10.01,
      strategy: "SPLIT_EVENLY",
    });
    expect(result.total).toBe(10.01);
    expect(result.leftover).toBe(0);
    expect(result.lines.map((line) => line.amount).sort()).toEqual([3.33, 3.34, 3.34]);
  });
});

describe("helpers", () => {
  it("converts weekly contributions to a monthly equivalent", () => {
    expect(monthlyEquivalent(50, "WEEKLY", true)).toBeCloseTo(216.666, 2);
    expect(monthlyEquivalent(75, "MONTHLY", false)).toBe(0);
  });

  it("describes schedules and relative days", () => {
    expect(describeFrequency("MONTHLY", null, 1)).toBe("Monthly on the 1st");
    expect(ordinal(22)).toBe("22nd");
    expect(percent(25, 50)).toBe(50);
    expect(daysUntil("2026-09-12T12:00:00", new Date(2026, 8, 10))).toBe(2);
    expect(relativeDayLabel("2026-09-10T12:00:00", new Date(2026, 8, 10))).toBe("Today");
  });

  it("treats a past month as fully elapsed", () => {
    expect(monthElapsedRatio("2020-01", new Date("2026-09-01"))).toBe(1);
    expect(monthElapsedRatio("2099-01", new Date("2026-09-01"))).toBe(0);
  });
});
