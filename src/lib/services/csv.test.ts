import { describe, expect, it } from "vitest";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/services/csv";

describe("CSV round-trip", () => {
  it("escapes commas and quotes and parses them back", () => {
    const csv = transactionsToCsv([
      {
        date: "2026-09-10",
        type: "EXPENSE",
        description: 'Lunch, "tacos"',
        amount: 12.5,
        account: "Checking",
        envelope: "Dining",
        notes: "with Sam",
      },
    ]);
    expect(csv.startsWith("date,type,description,amount,account,envelope,notes")).toBe(true);
    const parsed = parseTransactionsCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      date: "2026-09-10",
      type: "EXPENSE",
      description: 'Lunch, "tacos"',
      amount: 12.5,
      envelope: "Dining",
    });
  });

  it("reports invalid rows without throwing", () => {
    const parsed = parseTransactionsCsv("date,type,description,amount\nnope,SPEND,Coffee,-3");
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.rows[0].error).toBeTruthy();
  });
});
