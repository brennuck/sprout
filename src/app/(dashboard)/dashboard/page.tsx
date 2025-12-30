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
    description: string;
    date: Date;
    type: string;
    accountId: string;
    transferToAccountId: string | null;
    createdAt: Date;
}

export interface SharedDashboard {
    id: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    permission: string;
    accounts: AccountWithBalance[];
    transactions: TransactionData[];
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

    // Fetch user's own accounts and transactions
    const [accounts, transactions, sharedWithMe] = await Promise.all([
        prisma.account.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        }),
        prisma.transaction.findMany({
            where: {
                account: { userId: user.id },
            },
            orderBy: { date: "desc" },
        }),
        // Get dashboards shared with me
        prisma.dashboardShare.findMany({
            where: { viewerId: user.id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        accounts: {
                            orderBy: { createdAt: "asc" },
                        },
                    },
                },
            },
        }),
    ]);

    // Serialize my data
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
        accountId: t.accountId,
        transferToAccountId: t.transferToAccountId,
        createdAt: t.createdAt,
    }));

    // Serialize shared dashboards
    const sharedDashboards: SharedDashboard[] = await Promise.all(
        sharedWithMe.map(async (share) => {
            const ownerTransactions = await prisma.transaction.findMany({
                where: { account: { userId: share.ownerId } },
                orderBy: { date: "desc" },
            });

            return {
                id: share.id,
                ownerId: share.ownerId,
                ownerName: share.owner.name || share.owner.email,
                ownerEmail: share.owner.email,
                permission: share.permission,
                accounts: share.owner.accounts.map((account) => ({
                    id: account.id,
                    name: account.name,
                    type: account.type,
                    balance: serializeDecimal(account.balance),
                })),
                transactions: ownerTransactions.map((t) => ({
                    id: t.id,
                    amount: serializeDecimal(t.amount),
                    description: t.description,
                    date: t.date,
                    type: t.type,
                    accountId: t.accountId,
                    transferToAccountId: t.transferToAccountId,
                    createdAt: t.createdAt,
                })),
            };
        })
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-display text-3xl font-bold text-sage-900">
                    Welcome back{user.name ? `, ${user.name}` : ""}!
                </h1>
                <p className="text-sage-600 mt-1">Here&apos;s how your garden is growing 🌱</p>
            </div>

            <DashboardContent
                accounts={serializedAccounts}
                transactions={serializedTransactions}
                sharedDashboards={sharedDashboards}
            />
        </div>
    );
}
