import { validateRequest } from "@/lib/auth";
import { listTransactions } from "@/lib/data/transactions";
import { IncomeManager } from "@/components/dashboard/IncomeManager";

export default async function IncomePage() {
  const { user } = await validateRequest();
  if (!user) return null;

  const income = await listTransactions(user.id, { type: "INCOME" }, null, 12);

  return (
    <IncomeManager
      income={income.rows.map((row) => ({
        id: row.id,
        amount: row.amount,
        description: row.description,
        date: row.date,
        accountName: row.accountName,
      }))}
    />
  );
}
