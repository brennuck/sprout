import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

const createAccountSchema = z.object({
    name: z.string().min(1, "Account name is required"),
    type: z.enum(["SAVINGS", "BUDGET", "ALLOWANCE", "RETIREMENT", "STOCK"]),
    startingBalance: z.number().optional().default(0),
    fundFromAccountId: z.string().optional(),
    fundAmount: z.number().optional(),
});

export async function GET() {
    try {
        const { user } = await validateRequest();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const accounts = await prisma.account.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error("Get accounts error:", error);
        return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await validateRequest();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const result = createAccountSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
        }

        const { name, type, startingBalance, fundFromAccountId, fundAmount } = result.data;

        // If funding from another account, verify it exists and has enough balance
        if (fundFromAccountId && fundAmount && fundAmount > 0) {
            const sourceAccount = await prisma.account.findFirst({
                where: { id: fundFromAccountId, userId: user.id },
            });

            if (!sourceAccount) {
                return NextResponse.json({ error: "Source account not found" }, { status: 404 });
            }

            if (Number(sourceAccount.balance) < fundAmount) {
                return NextResponse.json({ error: "Insufficient funds in source account" }, { status: 400 });
            }
        }

        // Create account and optionally transfer funds atomically
        const account = await prisma.$transaction(async (tx) => {
            // Create the new account with starting balance
            const totalBalance = startingBalance + (fundAmount || 0);

            const newAccount = await tx.account.create({
                data: {
                    name,
                    type,
                    balance: totalBalance,
                    userId: user.id,
                },
            });

            // If funding from another account, deduct and create transfer record
            if (fundFromAccountId && fundAmount && fundAmount > 0) {
                // Deduct from source account
                await tx.account.update({
                    where: { id: fundFromAccountId },
                    data: {
                        balance: {
                            decrement: fundAmount,
                        },
                    },
                });

                // Create transfer transaction for audit trail
                await tx.transaction.create({
                    data: {
                        amount: fundAmount,
                        description: `Initial funding for ${name}`,
                        date: new Date(),
                        type: "TRANSFER",
                        accountId: fundFromAccountId,
                        transferToAccountId: newAccount.id,
                    },
                });
            }

            return newAccount;
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error("Create account error:", error);
        return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }
}
