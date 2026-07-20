import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Decimal } from "@prisma/client/runtime/library";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Target, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TransactionComposer } from "@/components/dashboard/TransactionComposer";
import { formatCurrency, formatDate } from "@/lib/utils";

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

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [accounts, transactions, envelopes, preference] = await Promise.all([
        prisma.account.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        }),
        prisma.transaction.findMany({
            where: {
                account: { userId: user.id },
            },
            orderBy: { date: "desc" },
            take: 50,
            include: {
                goalImpactEnvelope: { select: { id: true, name: true } },
                envelopeEntries: { include: { envelope: { select: { id: true, name: true } } } },
            },
        }),
        prisma.envelope.findMany({
            where: { userId: user.id, archivedAt: null },
            include: { entries: { select: { amount: true } } },
            orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
        }),
        prisma.goalPreference.findUnique({ where: { userId: user.id } }),
    ]);

    const serializedAccounts = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: serializeDecimal(account.balance),
    }));
    const serializedEnvelopes = envelopes.map((envelope) => ({
        id: envelope.id,
        name: envelope.name,
        kind: envelope.kind,
        accountId: envelope.accountId,
        balance: envelope.entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
        targetAmount: envelope.targetAmount == null ? null : Number(envelope.targetAmount),
        monthlyTarget: envelope.monthlyTarget == null ? null : Number(envelope.monthlyTarget),
        targetDate: envelope.targetDate?.toISOString() || null,
    }));
    const totalCash = serializedAccounts.reduce((sum, account) => sum + account.balance, 0);
    const totalAssigned = serializedEnvelopes.reduce((sum, envelope) => sum + envelope.balance, 0);
    const monthTransactions = transactions.filter((transaction) => transaction.date >= monthStart);
    const income = monthTransactions.filter((transaction) => transaction.type === "INCOME").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const spending = monthTransactions.filter((transaction) => transaction.type === "EXPENSE").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const goals = serializedEnvelopes.filter((envelope) => envelope.kind === "GOAL");
    const overspent = serializedEnvelopes.filter((envelope) => envelope.balance < 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand">This month</p>
                    <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
                        Welcome back{user.name ? `, ${user.name}` : ""}
                    </h1>
                    <p className="mt-2 text-ink-secondary">One clear view of what is safe to spend and what is growing.</p>
                </div>
                <TransactionComposer accounts={serializedAccounts} envelopes={serializedEnvelopes} focusGoalId={preference?.goalEnvelopeId} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5"><p className="text-sm text-ink-muted">Real cash</p><p className="mt-1 text-2xl font-bold text-ink">{formatCurrency(totalCash)}</p><p className="mt-2 text-xs text-ink-muted">Across {accounts.length} account{accounts.length === 1 ? "" : "s"}</p></Card>
                <Card className="p-5"><p className="text-sm text-ink-muted">Ready to assign</p><p className="mt-1 text-2xl font-bold text-brand-strong">{formatCurrency(totalCash - totalAssigned)}</p><Link href="/income" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">Manage plan <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link></Card>
                <Card className="p-5"><p className="flex items-center gap-1 text-sm text-ink-muted"><ArrowUpRight className="h-4 w-4 text-positive" aria-hidden="true" /> Income</p><p className="mt-1 text-2xl font-bold text-positive">{formatCurrency(income)}</p><p className="mt-2 text-xs text-ink-muted">Since {monthStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p></Card>
                <Card className="p-5"><p className="flex items-center gap-1 text-sm text-ink-muted"><ArrowDownRight className="h-4 w-4 text-danger" aria-hidden="true" /> Spending</p><p className="mt-1 text-2xl font-bold text-ink">{formatCurrency(spending)}</p><Link href="/reports" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">See report <ArrowRight className="h-3 w-3" aria-hidden="true" /></Link></Card>
            </div>

            {overspent.length > 0 && (
                <div role="status" className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="font-semibold text-danger">{overspent.length} envelope{overspent.length === 1 ? " is" : "s are"} overspent</p>
                    <p className="mt-1 text-sm text-ink-secondary">Move money to cover {overspent.map((item) => item.name).join(", ")}.</p>
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
                <Card>
                    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">Goals in motion</h2><p className="text-sm text-ink-muted">Actual funded progress</p></div><Link href="/budgets" className="text-sm font-semibold text-brand">View all</Link></div>
                    <div className="mt-5 space-y-5">
                        {goals.slice(0, 3).map((goal) => {
                            const percent = goal.targetAmount ? Math.min(100, Math.max(0, goal.balance / goal.targetAmount * 100)) : 0;
                            return <div key={goal.id}><div className="flex justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-semibold text-ink"><Target className="h-4 w-4 text-brand" aria-hidden="true" />{goal.name}</span><span className="text-ink-muted">{formatCurrency(goal.balance)}{goal.targetAmount ? ` / ${formatCurrency(goal.targetAmount)}` : ""}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div></div>;
                        })}
                        {!goals.length && <div className="py-8 text-center"><Target className="mx-auto h-8 w-8 text-brand" aria-hidden="true" /><p className="mt-3 text-sm text-ink-muted">Create a goal to see your progress here.</p><Link href="/budgets" className="mt-2 inline-block text-sm font-semibold text-brand">Create a goal</Link></div>}
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">Recent activity</h2><p className="text-sm text-ink-muted">Your latest money moves</p></div><Link href="/activity" className="text-sm font-semibold text-brand">View all</Link></div>
                    <div className="mt-4 divide-y divide-line">
                        {transactions.slice(0, 5).map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{transaction.description}</p><p className="text-xs text-ink-muted">{formatDate(transaction.date)}{transaction.envelopeEntries[0] ? ` · ${transaction.envelopeEntries[0].envelope.name}` : ""}</p></div>
                                <span className={`text-sm font-bold ${transaction.type === "INCOME" ? "text-positive" : transaction.type === "EXPENSE" ? "text-ink" : "text-brand"}`}>{transaction.type === "INCOME" ? "+" : transaction.type === "EXPENSE" ? "−" : ""}{formatCurrency(Number(transaction.amount))}</span>
                            </div>
                        ))}
                        {!transactions.length && <div className="py-8 text-center"><WalletCards className="mx-auto h-8 w-8 text-brand" aria-hidden="true" /><p className="mt-3 text-sm text-ink-muted">Your transactions will appear here.</p></div>}
                    </div>
                </Card>
            </div>
        </div>
    );
}
