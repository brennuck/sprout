"use server";

import { z } from "zod";
import { requireUser, runAction } from "@/lib/actions/shared";
import { prisma } from "@/lib/prisma";
import { createLedgerTransaction } from "@/lib/services/ledger";
import { parseTransactionsCsv } from "@/lib/services/csv";
import { ledgerDate } from "@/lib/validation";

export async function importTransactionsAction(csv: string) {
  return runAction(async () => {
    const user = await requireUser();
    const parsed = parseTransactionsCsv(z.string().max(2_000_000).parse(csv));
    const valid = parsed.rows.filter((row) => !row.error && (row.type === "INCOME" || row.type === "EXPENSE"));
    if (!valid.length) {
      return { imported: 0, skipped: parsed.rows.length, errors: parsed.errors };
    }

    const [accounts, envelopes] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
      prisma.envelope.findMany({
        where: { userId: user.id, archivedAt: null },
        select: { id: true, name: true, accountId: true },
      }),
    ]);
    const accountByName = new Map(accounts.map((account) => [account.name.toLowerCase(), account]));
    const envelopeByName = new Map(envelopes.map((envelope) => [envelope.name.toLowerCase(), envelope]));

    const errors = [...parsed.errors];
    let imported = 0;
    for (const row of valid) {
      const account =
        (row.account && accountByName.get(row.account.toLowerCase())) || accounts[0];
      if (!account) {
        errors.push(`Line ${row.line}: no cash account to import into`);
        continue;
      }
      const envelope = row.envelope ? envelopeByName.get(row.envelope.toLowerCase()) : undefined;
      try {
        await createLedgerTransaction({
          actorId: user.id,
          accountId: account.id,
          amount: row.amount,
          description: row.description,
          notes: row.notes || null,
          type: row.type as "INCOME" | "EXPENSE",
          date: ledgerDate(row.date),
          envelopeId: envelope && envelope.accountId === account.id ? envelope.id : null,
        });
        imported += 1;
      } catch (error) {
        errors.push(`Line ${row.line}: ${error instanceof Error ? error.message : "Could not import"}`);
      }
    }
    return { imported, skipped: parsed.rows.length - imported, errors };
  });
}
