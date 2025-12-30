"use client";

import { useState } from "react";
import { 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  LineChart, 
  Palmtree, 
  Folder,
  Trash2,
  X
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import type { AccountWithBalance } from "@/app/(dashboard)/dashboard/page";

interface AccountsOverviewProps {
  accounts: AccountWithBalance[];
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onDelete?: () => void;
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
  onSelectAccount,
  onDelete
}: AccountsOverviewProps) {
  const [accountToDelete, setAccountToDelete] = useState<AccountWithBalance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalBalance = accounts
    .filter((account) => ["SAVINGS", "RETIREMENT", "STOCK"].includes(account.type))
    .reduce((sum, account) => sum + account.balance, 0);

  const handleDeleteClick = (e: React.MouseEvent, account: AccountWithBalance) => {
    e.stopPropagation();
    setAccountToDelete(account);
  };

  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/accounts?id=${accountToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAccountToDelete(null);
        onDelete?.();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

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
          <div
            key={account.id}
            className={`group flex items-center p-4 rounded-xl transition-all duration-200 cursor-pointer ${
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
            <div className="flex items-center gap-2">
              <div className={`text-right ${
                account.balance >= 0 ? "text-sage-700" : "text-red-600"
              }`}>
                <p className="font-semibold">{formatCurrency(account.balance)}</p>
              </div>
              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteClick(e, account)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-sage-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Delete account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-red-700">
              Are you sure you want to delete <strong>{accountToDelete?.name}</strong>?
            </p>
            <p className="text-red-600 text-sm mt-2">
              This will permanently delete the account and all {accountToDelete?.balance !== 0 ? `its transactions. Current balance: ${formatCurrency(accountToDelete?.balance || 0)}` : "its transactions"}.
            </p>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setAccountToDelete(null)}
              disabled={isDeleting}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

