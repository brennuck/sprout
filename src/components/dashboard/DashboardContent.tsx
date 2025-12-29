"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountsOverview } from "./AccountsOverview";
import { TransactionList } from "./TransactionList";
import { TransactionForm } from "./TransactionForm";
import { AccountForm } from "./AccountForm";
import { Summary } from "./Summary";
import { DataActions } from "./DataActions";
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

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <>
      <AccountsOverview
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
      />

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {selectedAccountId && (
              <Summary
                transactions={transactions}
                selectedAccountId={selectedAccountId}
              />
            )}
            <TransactionList
              transactions={transactions}
              selectedAccountId={selectedAccountId}
            />
          </div>

          <div className="space-y-6">
            {selectedAccountId && selectedAccount && (
              <TransactionForm
                selectedAccountId={selectedAccountId}
                selectedAccountName={selectedAccount.name}
                selectedAccountType={selectedAccount.type}
                onSuccess={refreshData}
              />
            )}
            <AccountForm onSuccess={refreshData} />
            <DataActions onSuccess={refreshData} />
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AccountForm onSuccess={refreshData} />
          <DataActions onSuccess={refreshData} />
        </div>
      )}
    </>
  );
}

