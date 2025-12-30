"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Users, ChevronDown, Eye } from "lucide-react";
import { AccountsOverview } from "./AccountsOverview";
import { TransactionList } from "./TransactionList";
import { QuickActions } from "./QuickActions";
import { Summary } from "./Summary";
import { Card } from "@/components/ui/Card";
import type { AccountWithBalance, TransactionData, SharedDashboard } from "@/app/(dashboard)/dashboard/page";

interface DashboardContentProps {
  accounts: AccountWithBalance[];
  transactions: TransactionData[];
  sharedDashboards?: SharedDashboard[];
}

export function DashboardContent({ accounts, transactions, sharedDashboards = [] }: DashboardContentProps) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ""
  );
  const [viewingDashboard, setViewingDashboard] = useState<string>("mine");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get current dashboard data
  const currentShared = sharedDashboards.find(s => s.id === viewingDashboard);
  const currentAccounts = viewingDashboard === "mine" ? accounts : (currentShared?.accounts || []);
  const currentTransactions = viewingDashboard === "mine" ? transactions : (currentShared?.transactions || []);
  const isViewingShared = viewingDashboard !== "mine";
  const canEdit = !isViewingShared || currentShared?.permission === "EDIT";

  // Reset selected account when switching dashboards
  useEffect(() => {
    setSelectedAccountId(currentAccounts[0]?.id || "");
  }, [viewingDashboard, currentAccounts]);

  const refreshData = () => {
    router.refresh();
  };

  // Empty state - no accounts yet (only for own dashboard)
  if (!isViewingShared && accounts.length === 0) {
    return (
      <div className="space-y-6">
        {sharedDashboards.length > 0 && (
          <DashboardSwitcher 
            sharedDashboards={sharedDashboards}
            viewingDashboard={viewingDashboard}
            setViewingDashboard={setViewingDashboard}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
          />
        )}
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Switcher - only show if there are shared dashboards */}
      {sharedDashboards.length > 0 && (
        <DashboardSwitcher 
          sharedDashboards={sharedDashboards}
          viewingDashboard={viewingDashboard}
          setViewingDashboard={setViewingDashboard}
          isDropdownOpen={isDropdownOpen}
          setIsDropdownOpen={setIsDropdownOpen}
        />
      )}

      {/* Viewing shared dashboard banner */}
      {isViewingShared && currentShared && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <Eye className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Viewing {currentShared.ownerName}&apos;s Dashboard
            </p>
            <p className="text-xs text-blue-600">
              {currentShared.permission === "EDIT" ? "You can add transactions" : "View only access"}
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions Bar - only for own dashboard or if has edit permission */}
      {canEdit && (
        <div className="flex items-center justify-between">
          <QuickActions
            accounts={currentAccounts}
            selectedAccountId={selectedAccountId}
            onSuccess={refreshData}
          />
        </div>
      )}

      {/* Accounts Overview */}
      <AccountsOverview
        accounts={currentAccounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        onDelete={canEdit ? refreshData : undefined}
      />

      {/* Summary + Transactions */}
      <div className="space-y-6">
        {selectedAccountId && (
          <Summary
            transactions={currentTransactions}
            selectedAccountId={selectedAccountId}
          />
        )}
        <TransactionList
          transactions={currentTransactions}
          accounts={currentAccounts}
          selectedAccountId={selectedAccountId}
          onDelete={canEdit ? refreshData : undefined}
        />
      </div>
    </div>
  );
}

// Dashboard Switcher Component
function DashboardSwitcher({
  sharedDashboards,
  viewingDashboard,
  setViewingDashboard,
  isDropdownOpen,
  setIsDropdownOpen,
}: {
  sharedDashboards: SharedDashboard[];
  viewingDashboard: string;
  setViewingDashboard: (id: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
}) {
  const currentLabel = viewingDashboard === "mine" 
    ? "My Dashboard" 
    : sharedDashboards.find(s => s.id === viewingDashboard)?.ownerName + "'s Dashboard";

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-sage-200 hover:border-sage-300 transition-colors"
      >
        <Users className="w-4 h-4 text-sage-500" />
        <span className="text-sm font-medium text-sage-700">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 text-sage-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {isDropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl border border-sage-200 shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => {
                setViewingDashboard("mine");
                setIsDropdownOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-sage-50 transition-colors ${
                viewingDashboard === "mine" ? "bg-sage-50" : ""
              }`}
            >
              <div className="p-1.5 bg-sage-100 rounded-lg">
                <Wallet className="w-4 h-4 text-sage-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-sage-900">My Dashboard</p>
                <p className="text-xs text-sage-500">Your accounts & transactions</p>
              </div>
            </button>

            {sharedDashboards.length > 0 && (
              <>
                <div className="px-4 py-2 bg-sage-50 border-t border-sage-100">
                  <p className="text-xs font-medium text-sage-500 uppercase tracking-wide">
                    Shared with you
                  </p>
                </div>
                {sharedDashboards.map((shared) => (
                  <button
                    key={shared.id}
                    onClick={() => {
                      setViewingDashboard(shared.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-sage-50 transition-colors ${
                      viewingDashboard === shared.id ? "bg-sage-50" : ""
                    }`}
                  >
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-sage-900">{shared.ownerName}</p>
                      <p className="text-xs text-sage-500">
                        {shared.permission === "EDIT" ? "Can edit" : "View only"}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
