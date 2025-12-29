"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { TransactionData } from "@/app/(dashboard)/dashboard/page";

interface TransactionListProps {
  transactions: TransactionData[];
  selectedAccountId?: string;
}

export function TransactionList({ transactions, selectedAccountId }: TransactionListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  const filteredTransactions = selectedAccountId
    ? transactions.filter(
        (t) =>
          t.fromAccountId === selectedAccountId ||
          t.toAccountId === selectedAccountId
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
            const isExpense = transaction.type === "EXPENSE" || 
              (transaction.fromAccountId === selectedAccountId);
            
            return (
              <li key={transaction.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {isExpense ? (
                      <div className="p-2 bg-red-100 rounded-lg">
                        <ArrowDownCircle className="h-5 w-5 text-red-500" />
                      </div>
                    ) : (
                      <div className="p-2 bg-sage-100 rounded-lg">
                        <ArrowUpCircle className="h-5 w-5 text-sage-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sage-900 truncate">
                      {transaction.description || "No description"}
                    </p>
                    <p className="text-sm text-sage-500">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        isExpense
                          ? "bg-red-100 text-red-700"
                          : "bg-sage-100 text-sage-700"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
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

