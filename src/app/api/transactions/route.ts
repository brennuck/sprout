import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

const createTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string(),
  date: z.string().optional(),
});

export async function GET() {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
      },
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { name: true },
        },
      },
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

    const { amount, description, type, accountId, date } = result.data;

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Calculate the balance change (negative for expenses)
    const balanceChange = type === "EXPENSE" ? -amount : amount;

    // Create transaction and update balance atomically
    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          amount,
          description,
          date: date ? new Date(date) : new Date(),
          type,
          accountId,
        },
      });

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

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

export async function DELETE(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("id");

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    // Get transaction and verify ownership
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        account: { userId: user.id },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Reverse the balance change and delete
    const balanceChange = transaction.type === "EXPENSE" 
      ? Number(transaction.amount) 
      : -Number(transaction.amount);

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: transaction.accountId! },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
