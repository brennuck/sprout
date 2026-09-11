import { validateRequest } from "@/lib/auth";
import { currentMonthKey, isValidMonthKey } from "@/lib/budget-math";
import { getMonthPlan } from "@/lib/data/month";
import { PlanView } from "@/components/plan/PlanView";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const { user } = await validateRequest();
  if (!user) return null;

  const requested = searchParams?.month ?? "";
  const month = isValidMonthKey(requested) ? requested : currentMonthKey();
  const monthPlan = await getMonthPlan(user.id, month);

  return <PlanView month={month} monthPlan={monthPlan} />;
}
