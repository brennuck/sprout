"use client";

import { DollarSign, TrendingDown, TrendingUp, ArrowRightLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { TransactionData } from "@/app/(dashboard)/dashboard/page";

interface SummaryProps {
  transactions: TransactionData[];
  selectedAccountId: string;
}

export function Summary({ transactions, selectedAccountId }: SummaryProps) {
  // Get all transactions affecting this account
  const accountTransactions = transactions.filter(
    (t) => t.accountId === selectedAccountId || t.transferToAccountId === selectedAccountId
  );

  // Calculate income (including incoming transfers)
  const income = accountTransactions
    .filter((t) => t.type === "INCOME" || t.transferToAccountId === selectedAccountId)
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate expenses (including outgoing transfers)
  const expenses = accountTransactions
    .filter((t) => t.type === "EXPENSE" || (t.type === "TRANSFER" && t.accountId === selectedAccountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const net = income - expenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-sage-50 to-sage-100/50 border-0">
        <div className="flex items-center">
          <div className="p-2 bg-sage-200 rounded-xl">
            <TrendingUp className="h-6 w-6 text-sage-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-sage-600">Money In</p>
            <p className="text-xl font-bold text-sage-900">
              {formatCurrency(income)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-0">
        <div className="flex items-center">
          <div className="p-2 bg-red-200 rounded-xl">
            <TrendingDown className="h-6 w-6 text-red-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-red-600">Money Out</p>
            <p className="text-xl font-bold text-red-900">
              {formatCurrency(expenses)}
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-cream-50 to-cream-100/50 border-0">
        <div className="flex items-center">
          <div className="p-2 bg-cream-200 rounded-xl">
            <DollarSign className="h-6 w-6 text-cream-700" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-cream-700">Net Change</p>
            <p className={`text-xl font-bold ${net >= 0 ? "text-sage-900" : "text-red-900"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
