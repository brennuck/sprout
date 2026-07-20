import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BudgetManager } from "@/components/dashboard/BudgetManager";

export default async function BudgetsPage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const [accounts, envelopes, preference] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, balance: true },
    }),
    prisma.envelope.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: { entries: { select: { amount: true } } },
    }),
    prisma.goalPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <BudgetManager
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
      focusGoalId={preference?.goalEnvelopeId || null}
    />
  );
}
