import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [accounts, transactions] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.transaction.findMany({
        where: {
          OR: [
            { fromAccount: { userId: user.id } },
            { toAccount: { userId: user.id } },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Serialize the data for export
    const data = {
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: parseFloat(a.balance.toString()),
      })),
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: parseFloat(t.amount.toString()),
        description: t.description,
        date: t.date.toISOString(),
        type: t.type,
        takeFromSavings: t.takeFromSavings,
        fromAccountId: t.fromAccountId,
        toAccountId: t.toAccountId,
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Download data error:", error);
    return NextResponse.json(
      { error: "Failed to download data" },
      { status: 500 }
    );
  }
}

