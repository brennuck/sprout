import { describe, expect, it } from "vitest";
import { calculateGoalImpact } from "@/lib/services/reports";

describe("calculateGoalImpact", () => {
  it("keeps actual progress separate from hypothetical spending", () => {
    const result = calculateGoalImpact(300, 60, 1000, 200);

    expect(result.progress).toBe(30);
    expect(result.hypotheticalTargetPercent).toBe(6);
    expect(result.estimatedDelayDays).toBe(9);
    expect(result.noImpactEquivalent).toBe(360);
  });

  it("does not invent percentages or dates without a plan", () => {
    const result = calculateGoalImpact(300, 60, null, null);

    expect(result.progress).toBeNull();
    expect(result.hypotheticalTargetPercent).toBeNull();
    expect(result.estimatedDelayDays).toBeNull();
  });

  it("caps funded progress at 100 percent", () => {
    expect(calculateGoalImpact(1200, 0, 1000, 100).progress).toBe(100);
  });
});
