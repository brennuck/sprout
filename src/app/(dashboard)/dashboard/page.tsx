import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import type { Decimal } from "@prisma/client/runtime/library";

export interface AccountWithBalance {
    id: string;
    name: string;
    type: string;
    balance: number;
}

export interface TransactionData {
    id: string;
    amount: number;
    description: string | null;
    date: Date;
    type: string;
    takeFromSavings: boolean;
    fromAccountId: string | null;
    toAccountId: string | null;
    createdAt: Date;
}

function serializeDecimal(value: Decimal | null): number {
    if (!value) return 0;
    return parseFloat(value.toString());
}

export default async function DashboardPage() {
    const { user } = await validateRequest();

    if (!user) {
        return null;
    }

    // Fetch accounts and transactions
    const [accounts, transactions] = await Promise.all([
        prisma.account.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        }),
        prisma.transaction.findMany({
            where: {
                OR: [{ fromAccount: { userId: user.id } }, { toAccount: { userId: user.id } }],
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    // Serialize the data
    const serializedAccounts: AccountWithBalance[] = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: serializeDecimal(account.balance),
    }));

    const serializedTransactions: TransactionData[] = transactions.map((t) => ({
        id: t.id,
        amount: serializeDecimal(t.amount),
        description: t.description,
        date: t.date,
        type: t.type,
        takeFromSavings: t.takeFromSavings,
        fromAccountId: t.fromAccountId,
        toAccountId: t.toAccountId,
        createdAt: t.createdAt,
    }));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-display text-3xl font-bold text-sage-900">
                    Welcome back{user.name ? `, ${user.name}` : ""}!
                </h1>
                <p className="text-sage-600 mt-1">Here&apos;s how your garden is growing 🌱</p>
            </div>

            <DashboardContent accounts={serializedAccounts} transactions={serializedTransactions} />
        </div>
    );
}
