import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionsToCsv } from "@/lib/services/csv";
import { isoDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await validateRequest();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const rows = await prisma.transaction.findMany({
    where: { account: { userId: user.id } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { name: true } },
      envelopeEntries: {
        where: { type: "SPEND" },
        include: { envelope: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const csv = transactionsToCsv(
    rows.map((row) => ({
      date: isoDateKey(row.date),
      type: row.type,
      description: row.description,
      amount: Number(row.amount),
      account: row.account.name,
      envelope: row.envelopeEntries[0]?.envelope.name ?? "",
      notes: row.notes ?? "",
    })),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sprout-transactions.csv"`,
    },
  });
}
