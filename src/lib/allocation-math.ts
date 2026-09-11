export type AllocationRuleMethod = "FIXED" | "PERCENT" | "REMAINDER";

export interface AllocationRuleInput {
  envelopeId: string;
  method: AllocationRuleMethod;
  value: number;
  priority: number;
}

export interface AllocationResult {
  envelopeId: string;
  amount: number;
  method: AllocationRuleMethod;
}

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => value / 100;

/**
 * Split an income amount across ordered rules. FIXED takes up to its value,
 * PERCENT takes a share of what remains, REMAINDER takes everything left.
 * Pure and shared by the server (applyIncomePlan) and the client preview.
 */
export function calculateAllocations(amount: number, rules: AllocationRuleInput[]) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError("Income amount must be positive");
  }

  const totalCents = toCents(amount);
  let remainingCents = totalCents;
  const allocations: AllocationResult[] = [];

  for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
    if (remainingCents <= 0) break;

    let allocationCents = 0;
    if (rule.method === "FIXED") {
      allocationCents = Math.min(remainingCents, Math.max(0, toCents(rule.value)));
    } else if (rule.method === "PERCENT") {
      const percentage = Math.min(100, Math.max(0, rule.value));
      allocationCents = Math.min(remainingCents, Math.round(remainingCents * (percentage / 100)));
    } else {
      allocationCents = remainingCents;
    }

    if (allocationCents > 0) {
      allocations.push({
        envelopeId: rule.envelopeId,
        amount: fromCents(allocationCents),
        method: rule.method,
      });
      remainingCents -= allocationCents;
    }
  }

  return {
    allocations,
    allocated: fromCents(totalCents - remainingCents),
    remainder: fromCents(remainingCents),
  };
}
