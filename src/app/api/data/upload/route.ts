import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

const uploadDataSchema = z.object({
  accounts: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["SAVINGS", "BUDGET", "ALLOWANCE", "RETIREMENT", "STOCK"]),
      balance: z.number(),
    })
  ),
  transactions: z
    .array(
      z.object({
        amount: z.number(),
        description: z.string().nullable().optional(),
        date: z.string(),
        type: z.enum(["INCOME", "EXPENSE"]),
        takeFromSavings: z.boolean().optional(),
        fromAccountId: z.string().nullable().optional(),
        toAccountId: z.string().nullable().optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = uploadDataSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid data format", details: result.error.errors },
        { status: 400 }
      );
    }

    const { accounts, transactions } = result.data;

    // Map old account IDs to new ones
    const accountIdMap = new Map<string, string>();

    await prisma.$transaction(async (tx) => {
      // Create accounts
      for (const account of accounts) {
        const newAccount = await tx.account.create({
          data: {
            name: account.name,
            type: account.type,
            balance: account.balance,
            userId: user.id,
          },
        });
        // Store mapping from old conceptual position to new ID
        accountIdMap.set(account.name, newAccount.id);
      }

      // Create transactions if provided
      if (transactions) {
        for (const transaction of transactions) {
          await tx.transaction.create({
            data: {
              amount: Math.abs(transaction.amount),
              description: transaction.description || null,
              date: new Date(transaction.date),
              type: transaction.type,
              takeFromSavings: transaction.takeFromSavings || false,
              // Map account IDs if they exist
              fromAccountId: transaction.fromAccountId
                ? accountIdMap.get(transaction.fromAccountId) || null
                : null,
              toAccountId: transaction.toAccountId
                ? accountIdMap.get(transaction.toAccountId) || null
                : null,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload data error:", error);
    return NextResponse.json(
      { error: "Failed to upload data" },
      { status: 500 }
    );
  }
}

