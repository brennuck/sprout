import { validateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsManager } from "@/components/dashboard/SettingsManager";

export default async function SettingsPage() {
  const { user } = await validateRequest();
  if (!user) return null;
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <SettingsManager
      user={{ name: user.name, email: user.email }}
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: Number(account.balance),
      }))}
    />
  );
}
