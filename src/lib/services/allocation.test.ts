import { describe, expect, it } from "vitest";
import { calculateAllocations } from "@/lib/services/allocation";

describe("calculateAllocations", () => {
  it("runs fixed, percentage, and remainder rules in priority order", () => {
    const result = calculateAllocations(1000, [
      { envelopeId: "vacation", method: "REMAINDER", value: 0, priority: 3 },
      { envelopeId: "phone", method: "PERCENT", value: 25, priority: 2 },
      { envelopeId: "car", method: "FIXED", value: 200, priority: 1 },
    ]);

    expect(result.allocations).toEqual([
      { envelopeId: "car", method: "FIXED", amount: 200 },
      { envelopeId: "phone", method: "PERCENT", amount: 200 },
      { envelopeId: "vacation", method: "REMAINDER", amount: 600 },
    ]);
    expect(result.remainder).toBe(0);
  });

  it("never allocates more than the income amount", () => {
    const result = calculateAllocations(50, [
      { envelopeId: "car", method: "FIXED", value: 100, priority: 0 },
      { envelopeId: "phone", method: "FIXED", value: 100, priority: 1 },
    ]);

    expect(result.allocated).toBe(50);
    expect(result.remainder).toBe(0);
    expect(result.allocations).toHaveLength(1);
  });

  it("rounds every allocation to cents", () => {
    const result = calculateAllocations(10, [
      { envelopeId: "one", method: "PERCENT", value: 33.33, priority: 0 },
      { envelopeId: "two", method: "REMAINDER", value: 0, priority: 1 },
    ]);

    expect(result.allocations[0].amount).toBe(3.33);
    expect(result.allocations[1].amount).toBe(6.67);
    expect(result.allocated + result.remainder).toBe(10);
  });

  it("leaves unallocated income as a remainder", () => {
    const result = calculateAllocations(300, [
      { envelopeId: "car", method: "FIXED", value: 75, priority: 0 },
    ]);

    expect(result.allocated).toBe(75);
    expect(result.remainder).toBe(225);
  });
});
