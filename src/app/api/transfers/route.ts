import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional().default("Transfer"),
});

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = transferSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fromAccountId, toAccountId, amount, description } = result.data;

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same account" },
        { status: 400 }
      );
    }

    // Verify both accounts belong to user
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { id: fromAccountId, userId: user.id },
      }),
      prisma.account.findFirst({
        where: { id: toAccountId, userId: user.id },
      }),
    ]);

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check sufficient funds
    if (Number(fromAccount.balance) < amount) {
      return NextResponse.json(
        { error: "Insufficient funds" },
        { status: 400 }
      );
    }

    // Create transfer transaction and update both balances atomically
    const transfer = await prisma.$transaction(async (tx) => {
      // Create the transfer transaction
      const transaction = await tx.transaction.create({
        data: {
          amount,
          description,
          date: new Date(),
          type: "TRANSFER",
          accountId: fromAccountId,
          transferToAccountId: toAccountId,
        },
      });

      // Deduct from source account
      await tx.account.update({
        where: { id: fromAccountId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Add to destination account
      await tx.account.update({
        where: { id: toAccountId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      return transaction;
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.error("Transfer error:", error);
    return NextResponse.json(
      { error: "Failed to complete transfer" },
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
    const transferId = searchParams.get("id");

    if (!transferId) {
      return NextResponse.json({ error: "Transfer ID required" }, { status: 400 });
    }

    // Get transfer and verify ownership
    const transfer = await prisma.transaction.findFirst({
      where: {
        id: transferId,
        type: "TRANSFER",
      },
      include: {
        account: true,
        transferToAccount: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    // Verify user owns both accounts
    if (transfer.account.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const amount = Number(transfer.amount);

    // Reverse the transfer and delete
    await prisma.$transaction(async (tx) => {
      // Add back to source account
      await tx.account.update({
        where: { id: transfer.accountId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // Remove from destination account (if it still exists)
      if (transfer.transferToAccountId) {
        await tx.account.update({
          where: { id: transfer.transferToAccountId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });
      }

      // Delete the transfer
      await tx.transaction.delete({
        where: { id: transferId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transfer error:", error);
    return NextResponse.json(
      { error: "Failed to delete transfer" },
      { status: 500 }
    );
  }
}

