import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IncomeManager } from "@/components/dashboard/IncomeManager";

export default async function IncomePage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const [accounts, envelopes, plans, income] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, balance: true },
    }),
    prisma.envelope.findMany({
      where: { userId: user.id, archivedAt: null },
      include: { entries: { select: { amount: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.allocationPlan.findMany({
      where: { userId: user.id },
      include: { rules: { orderBy: { priority: "asc" } } },
    }),
    prisma.transaction.findMany({
      where: { type: "INCOME", account: { userId: user.id } },
      include: { account: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 12,
    }),
  ]);

  return (
    <IncomeManager
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
      plans={plans.map((plan) => ({
        accountId: plan.accountId,
        name: plan.name,
        enabled: plan.enabled,
        rules: plan.rules.map((rule) => ({
          envelopeId: rule.envelopeId,
          method: rule.method,
          value: Number(rule.value),
          priority: rule.priority,
        })),
      }))}
      income={income.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        description: item.description,
        date: item.date.toISOString(),
        accountName: item.account.name,
      }))}
    />
  );
}
