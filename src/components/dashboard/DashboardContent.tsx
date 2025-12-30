"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { AccountsOverview } from "./AccountsOverview";
import { TransactionList } from "./TransactionList";
import { QuickActions } from "./QuickActions";
import { Summary } from "./Summary";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { AccountWithBalance, TransactionData } from "@/app/(dashboard)/dashboard/page";

interface DashboardContentProps {
  accounts: AccountWithBalance[];
  transactions: TransactionData[];
}

export function DashboardContent({ accounts, transactions }: DashboardContentProps) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ""
  );

  const refreshData = () => {
    router.refresh();
  };

  // Empty state - no accounts yet
  if (accounts.length === 0) {
    return (
      <Card variant="glass" className="p-12 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-sage-100 rounded-2xl">
            <Wallet className="h-10 w-10 text-sage-500" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-sage-900 mb-2">
              Welcome to Sprout! 🌱
            </h2>
            <p className="text-sage-600 max-w-md mx-auto">
              Let&apos;s get started by creating your first account. You can create accounts for savings, budgets, allowances, and more.
            </p>
          </div>
          <QuickActions 
            accounts={accounts} 
            selectedAccountId="" 
            onSuccess={refreshData} 
          />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <QuickActions
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSuccess={refreshData}
        />
      </div>

      {/* Accounts Overview */}
      <AccountsOverview
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        onDelete={refreshData}
      />

      {/* Summary + Transactions */}
      <div className="space-y-6">
        {selectedAccountId && (
          <Summary
            transactions={transactions}
            selectedAccountId={selectedAccountId}
          />
        )}
        <TransactionList
          transactions={transactions}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onDelete={refreshData}
        />
      </div>
    </div>
  );
}
