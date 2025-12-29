"use client";

import { 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  LineChart, 
  Palmtree, 
  Folder 
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { AccountWithBalance } from "@/app/(dashboard)/dashboard/page";

interface AccountsOverviewProps {
  accounts: AccountWithBalance[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
}

const getAccountIcon = (type: string) => {
  switch (type) {
    case "SAVINGS":
      return <PiggyBank className="h-5 w-5" />;
    case "BUDGET":
      return <Wallet className="h-5 w-5" />;
    case "ALLOWANCE":
      return <CreditCard className="h-5 w-5" />;
    case "RETIREMENT":
      return <Palmtree className="h-5 w-5" />;
    case "STOCK":
      return <LineChart className="h-5 w-5" />;
    default:
      return <Folder className="h-5 w-5" />;
  }
};

const getAccountTypeLabel = (type: string) => {
  return type.charAt(0) + type.slice(1).toLowerCase();
};

export function AccountsOverview({ 
  accounts, 
  selectedAccountId, 
  onSelectAccount 
}: AccountsOverviewProps) {
  const totalBalance = accounts
    .filter((account) => ["SAVINGS", "RETIREMENT", "STOCK"].includes(account.type))
    .reduce((sum, account) => sum + account.balance, 0);

  if (accounts.length === 0) {
    return (
      <Card variant="glass" className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-sage-100 rounded-2xl">
            <Wallet className="h-8 w-8 text-sage-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-sage-900">No accounts yet</h3>
            <p className="text-sage-600 mt-1">
              Create your first account to start tracking your finances
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-sage-900">Accounts Overview</h2>
        <div className="text-sm text-sage-600">
          Total Balance:{" "}
          <span className="font-semibold text-sage-900">
            {formatCurrency(totalBalance)}
          </span>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <button
            key={account.id}
            className={`flex items-center p-4 rounded-xl transition-all duration-200 ${
              selectedAccountId === account.id
                ? "bg-sage-100 ring-2 ring-sage-400"
                : "bg-white/60 hover:bg-white hover:shadow-md"
            }`}
            onClick={() => onSelectAccount?.(account.id)}
          >
            <div
              className={`p-2 rounded-lg mr-3 ${
                account.balance >= 0 
                  ? "bg-sage-100 text-sage-600" 
                  : "bg-red-100 text-red-600"
              }`}
            >
              {getAccountIcon(account.type)}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-sage-900">{account.name}</h3>
              <p className="text-sm text-sage-500">
                {getAccountTypeLabel(account.type)}
              </p>
            </div>
            <div className={`text-right ${
              account.balance >= 0 ? "text-sage-700" : "text-red-600"
            }`}>
              <p className="font-semibold">{formatCurrency(account.balance)}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

