import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const [users, accounts, transactions, legacyAccounts, balance] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.transaction.count(),
    prisma.account.count({ where: { type: { in: ["BUDGET", "ALLOWANCE"] } } }),
    prisma.account.aggregate({ _sum: { balance: true } }),
  ]);

  console.log(
    JSON.stringify(
      {
        users,
        accounts,
        transactions,
        legacyAccountsRequiringOptionalConversion: legacyAccounts,
        totalAccountBalance: balance._sum.balance?.toString() || "0",
        note: "The envelope migration adds nullable/new tables only and does not rewrite existing balances.",
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
