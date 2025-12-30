"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TransactionData } from "@/app/(dashboard)/dashboard/page";

interface TransactionListProps {
  transactions: TransactionData[];
  selectedAccountId?: string;
  onDelete?: () => void;
}

export function TransactionList({ transactions, selectedAccountId, onDelete }: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const transactionsPerPage = 10;

  // Filter transactions - include transfers to/from this account
  const filteredTransactions = selectedAccountId
    ? transactions.filter(
        (t) => t.accountId === selectedAccountId || t.transferToAccountId === selectedAccountId
      )
    : transactions;

  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPerPage));

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleDelete = async (transactionId: string, isTransfer: boolean) => {
    const message = isTransfer
      ? "Are you sure you want to delete this transfer? This will reverse the balance changes on both accounts."
      : "Are you sure you want to delete this transaction?";
    
    if (!confirm(message)) {
      return;
    }

    setDeletingId(transactionId);
    try {
      const endpoint = isTransfer ? "/api/transfers" : "/api/transactions";
      const res = await fetch(`${endpoint}?id=${transactionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onDelete?.();
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getTransactionDisplay = (transaction: TransactionData) => {
    const isTransfer = transaction.type === "TRANSFER";
    const isExpense = transaction.type === "EXPENSE";
    const isIncomingTransfer = isTransfer && transaction.transferToAccountId === selectedAccountId;

    if (isTransfer) {
      return {
        icon: (
          <div className="p-2 bg-blue-100 rounded-lg">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
          </div>
        ),
        badgeClass: isIncomingTransfer 
          ? "bg-sage-100 text-sage-700" 
          : "bg-blue-100 text-blue-700",
        prefix: isIncomingTransfer ? "+" : "−",
      };
    }

    if (isExpense) {
      return {
        icon: (
          <div className="p-2 bg-red-100 rounded-lg">
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
          </div>
        ),
        badgeClass: "bg-red-100 text-red-700",
        prefix: "−",
      };
    }

    return {
      icon: (
        <div className="p-2 bg-sage-100 rounded-lg">
          <ArrowUpCircle className="h-5 w-5 text-sage-500" />
        </div>
      ),
      badgeClass: "bg-sage-100 text-sage-700",
      prefix: "+",
    };
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-sage-900 mb-4">
        Recent Transactions
      </h3>
      
      {currentTransactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sage-500">No transactions yet</p>
          <p className="text-sage-400 text-sm mt-1">
            Add your first transaction to get started
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-sage-100">
          {currentTransactions.map((transaction) => {
            const display = getTransactionDisplay(transaction);
            const isTransfer = transaction.type === "TRANSFER";
            
            return (
              <li key={transaction.id} className="py-4 first:pt-0 last:pb-0 group">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {display.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sage-900 truncate">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-sage-500">
                      {formatDate(transaction.date)}
                      {isTransfer && (
                        <span className="ml-2 text-blue-500">• Transfer</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${display.badgeClass}`}
                    >
                      {display.prefix}{formatCurrency(transaction.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(transaction.id, isTransfer)}
                      disabled={deletingId === transaction.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-sage-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filteredTransactions.length > transactionsPerPage && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-sage-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-sage-500">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
