import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

const createTransactionSchema = z.object({
  amount: z.number(),
  description: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string(),
  takeFromSavings: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromAccount: { userId: user.id } },
          { toAccount: { userId: user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createTransactionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, description, type, accountId, takeFromSavings } = result.data;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Create transaction and update balances in a transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // Create the transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          amount: Math.abs(amount),
          description,
          date: new Date(),
          type,
          takeFromSavings,
          ...(type === "EXPENSE"
            ? { fromAccountId: accountId }
            : { toAccountId: accountId }),
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: amount, // amount is already negative for expenses
          },
        },
      });

      // Handle savings account update if applicable
      if (takeFromSavings && account.type !== "SAVINGS") {
        const savingsAccount = await tx.account.findFirst({
          where: { userId: user.id, type: "SAVINGS" },
        });

        if (savingsAccount) {
          await tx.account.update({
            where: { id: savingsAccount.id },
            data: {
              balance: {
                decrement: amount, // opposite of main account
              },
            },
          });
        }
      }

      return newTransaction;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Create transaction error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

