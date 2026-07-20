import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityManager } from "@/components/dashboard/ActivityManager";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: { envelopeId?: string };
}) {
  const { user } = await validateRequest();
  if (!user) return null;

  const [accounts, envelopes, transactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, balance: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.envelope.findMany({
      where: { userId: user.id, archivedAt: null },
      include: { entries: { select: { amount: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.transaction.findMany({
      where: { account: { userId: user.id } },
      include: {
        account: { select: { name: true } },
        envelopeEntries: { include: { envelope: { select: { id: true, name: true } } } },
        goalImpactEnvelope: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  return (
    <ActivityManager
      accounts={accounts.map((account) => ({ ...account, balance: Number(account.balance) }))}
      envelopes={envelopes.map((envelope) => ({
        id: envelope.id,
        name: envelope.name,
        kind: envelope.kind,
        accountId: envelope.accountId,
        balance: envelope.entries.reduce((sum, entry) => sum + Number(entry.amount), 0),
        targetAmount: envelope.targetAmount == null ? null : Number(envelope.targetAmount),
        monthlyTarget: envelope.monthlyTarget == null ? null : Number(envelope.monthlyTarget),
        targetDate: envelope.targetDate?.toISOString() || null,
      }))}
      transactions={transactions.map((transaction) => ({
        id: transaction.id,
        amount: Number(transaction.amount),
        description: transaction.description,
        type: transaction.type,
        date: transaction.date.toISOString(),
        accountId: transaction.accountId,
        accountName: transaction.account.name,
        transferToAccountId: transaction.transferToAccountId,
        envelopeId: transaction.envelopeEntries[0]?.envelope.id || null,
        envelopeName: transaction.envelopeEntries[0]?.envelope.name || null,
        goalImpactEnvelopeId: transaction.goalImpactEnvelope?.id || null,
        goalImpactName: transaction.goalImpactEnvelope?.name || null,
      }))}
      initialEnvelopeId={searchParams?.envelopeId}
    />
  );
}
