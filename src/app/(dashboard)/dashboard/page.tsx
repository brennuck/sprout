import { validateRequest } from "@/lib/auth";
import { currentMonthKey } from "@/lib/budget-math";
import { getMonthCashFlow, getMonthPlan } from "@/lib/data/month";
import { getRecentTransactions } from "@/lib/data/transactions";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export default async function DashboardPage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const month = currentMonthKey();
  const [monthPlan, cashFlow, recent] = await Promise.all([
    getMonthPlan(user.id, month),
    getMonthCashFlow(user.id, month),
    getRecentTransactions(user.id, 8),
  ]);

  const spentThisMonth: Record<string, number> = {};
  for (const stats of Object.values(monthPlan.envelopes)) {
    spentThisMonth[stats.envelopeId] = stats.spent;
  }

  return (
    <HomeDashboard
      userName={user.name}
      income={cashFlow.income}
      spending={cashFlow.spending}
      recent={recent}
      spentThisMonth={spentThisMonth}
    />
  );
}
