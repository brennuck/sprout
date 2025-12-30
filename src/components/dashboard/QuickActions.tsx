"use client";

import { useState } from "react";
import { Plus, ArrowRightLeft, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RadioGroup } from "@/components/ui/RadioGroup";
import type { AccountWithBalance } from "@/app/(dashboard)/dashboard/page";

interface QuickActionsProps {
    accounts: AccountWithBalance[];
    selectedAccountId: string;
    onSuccess: () => void;
}

export function QuickActions({ accounts, selectedAccountId, onSuccess }: QuickActionsProps) {
    const [activeModal, setActiveModal] = useState<"transaction" | "transfer" | "account" | null>(null);

    // Transaction form state
    const [txDescription, setTxDescription] = useState("");
    const [txAmount, setTxAmount] = useState("");
    const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
    const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
    const [txLoading, setTxLoading] = useState(false);
    const [txError, setTxError] = useState("");

    // Transfer form state
    const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || "");
    const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || "");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferNote, setTransferNote] = useState("");
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferError, setTransferError] = useState("");

    // Account form state
    const [accountName, setAccountName] = useState("");
    const [accountType, setAccountType] = useState("SAVINGS");
    const [startingBalance, setStartingBalance] = useState("");
    const [fundFromAccount, setFundFromAccount] = useState("");
    const [fundAmount, setFundAmount] = useState("");
    const [accountLoading, setAccountLoading] = useState(false);
    const [accountError, setAccountError] = useState("");

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const accountOptions = accounts.map((a) => ({
        value: a.id,
        label: `${a.name} ($${a.balance.toFixed(2)})`,
    }));

    const accountTypeOptions = [
        { value: "SAVINGS", label: "Savings" },
        { value: "BUDGET", label: "Budget" },
        { value: "ALLOWANCE", label: "Allowance" },
        { value: "RETIREMENT", label: "Retirement" },
        { value: "STOCK", label: "Stock" },
    ];

    const closeModal = () => {
        setActiveModal(null);
        // Reset forms
        setTxDescription("");
        setTxAmount("");
        setTxType("EXPENSE");
        setTxDate(new Date().toISOString().split("T")[0]);
        setTxError("");
        setTransferAmount("");
        setTransferNote("");
        setTransferError("");
        setAccountName("");
        setAccountType("SAVINGS");
        setStartingBalance("");
        setFundFromAccount("");
        setFundAmount("");
        setAccountError("");
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txDescription || !txAmount) {
            setTxError("Please fill in all fields");
            return;
        }

        setTxLoading(true);
        setTxError("");

        try {
            const res = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: txDescription,
                    amount: parseFloat(txAmount),
                    type: txType,
                    accountId: selectedAccountId,
                    date: txDate,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add transaction");
            }

            closeModal();
            onSuccess();
        } catch (err) {
            setTxError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setTxLoading(false);
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromAccountId || !toAccountId || !transferAmount) {
            setTransferError("Please fill in all fields");
            return;
        }
        if (fromAccountId === toAccountId) {
            setTransferError("Cannot transfer to the same account");
            return;
        }

        setTransferLoading(true);
        setTransferError("");

        try {
            const res = await fetch("/api/transfers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fromAccountId,
                    toAccountId,
                    amount: parseFloat(transferAmount),
                    description: transferNote || "Transfer",
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to transfer");
            }

            closeModal();
            onSuccess();
        } catch (err) {
            setTransferError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setTransferLoading(false);
        }
    };

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountName) {
            setAccountError("Please enter an account name");
            return;
        }

        // Validate fund amount if funding from account
        if (fundFromAccount && fundAmount) {
            const sourceAccount = accounts.find((a) => a.id === fundFromAccount);
            if (sourceAccount && parseFloat(fundAmount) > sourceAccount.balance) {
                setAccountError("Insufficient funds in source account");
                return;
            }
        }

        setAccountLoading(true);
        setAccountError("");

        try {
            const res = await fetch("/api/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: accountName,
                    type: accountType,
                    startingBalance: startingBalance ? parseFloat(startingBalance) : 0,
                    fundFromAccountId: fundFromAccount || undefined,
                    fundAmount: fundAmount ? parseFloat(fundAmount) : undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create account");
            }

            closeModal();
            onSuccess();
        } catch (err) {
            setAccountError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setAccountLoading(false);
        }
    };

    return (
        <>
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3">
                {selectedAccount && (
                    <Button onClick={() => setActiveModal("transaction")} size="sm">
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </Button>
                )}
                {accounts.length >= 2 && (
                    <Button onClick={() => setActiveModal("transfer")} variant="secondary" size="sm">
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer
                    </Button>
                )}
                <Button onClick={() => setActiveModal("account")} variant="outline" size="sm">
                    <Wallet className="w-4 h-4" />
                    New Account
                </Button>
            </div>

            {/* Transaction Modal */}
            <Modal
                isOpen={activeModal === "transaction"}
                onClose={closeModal}
                title={`Add Transaction to ${selectedAccount?.name || "Account"}`}
            >
                <form onSubmit={handleAddTransaction} className="space-y-4">
                    {txError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {txError}
                        </div>
                    )}

                    {/* Quick type toggle */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setTxType("EXPENSE")}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                txType === "EXPENSE"
                                    ? "border-red-400 bg-red-50 text-red-700"
                                    : "border-sage-200 text-sage-600 hover:border-sage-300"
                            }`}
                        >
                            <ArrowDownCircle className="w-5 h-5" />
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setTxType("INCOME")}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                txType === "INCOME"
                                    ? "border-sage-400 bg-sage-50 text-sage-700"
                                    : "border-sage-200 text-sage-600 hover:border-sage-300"
                            }`}
                        >
                            <ArrowUpCircle className="w-5 h-5" />
                            Income
                        </button>
                    </div>

                    <Input
                        label="Description"
                        value={txDescription}
                        onChange={(e) => setTxDescription(e.target.value)}
                        placeholder="e.g., Groceries, Paycheck"
                        autoFocus
                    />

                    <Input
                        label="Amount"
                        type="number"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                    />

                    <Input label="Date" type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />

                    <Button type="submit" className="w-full" isLoading={txLoading}>
                        Add {txType === "EXPENSE" ? "Expense" : "Income"}
                    </Button>
                </form>
            </Modal>

            {/* Transfer Modal */}
            <Modal isOpen={activeModal === "transfer"} onClose={closeModal} title="Transfer Between Accounts">
                <form onSubmit={handleTransfer} className="space-y-4">
                    {transferError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {transferError}
                        </div>
                    )}

                    <Select
                        label="From Account"
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        options={accountOptions}
                    />

                    <div className="flex justify-center">
                        <div className="p-2 bg-sage-100 rounded-lg">
                            <ArrowRightLeft className="w-4 h-4 text-sage-600 rotate-90" />
                        </div>
                    </div>

                    <Select
                        label="To Account"
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        options={accountOptions}
                    />

                    <Input
                        label="Amount"
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                    />

                    <Input
                        label="Note (optional)"
                        value={transferNote}
                        onChange={(e) => setTransferNote(e.target.value)}
                        placeholder="e.g., Moving to savings"
                    />

                    <Button type="submit" className="w-full" isLoading={transferLoading}>
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer -
                    </Button>
                </form>
            </Modal>

            {/* New Account Modal */}
            <Modal isOpen={activeModal === "account"} onClose={closeModal} title="Create New Account">
                <form onSubmit={handleAddAccount} className="space-y-4">
                    {accountError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {accountError}
                        </div>
                    )}

                    <Input
                        label="Account Name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="e.g., Emergency Fund"
                        autoFocus
                    />

                    <Select
                        label="Account Type"
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        options={accountTypeOptions}
                    />

                    <Input
                        label="Starting Balance"
                        type="number"
                        value={startingBalance}
                        onChange={(e) => setStartingBalance(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        hint="Optional: Set an initial balance"
                    />

                    {/* Fund from existing account - only show if there are existing accounts */}
                    {accounts.length > 0 && (
                        <div className="pt-2 border-t border-sage-100">
                            <p className="text-sm text-sage-600 mb-3">Or transfer from an existing account:</p>

                            <Select
                                label="Fund From"
                                value={fundFromAccount}
                                onChange={(e) => setFundFromAccount(e.target.value)}
                                options={[{ value: "", label: "None (don't transfer)" }, ...accountOptions]}
                            />

                            {fundFromAccount && (
                                <div className="mt-3">
                                    <Input
                                        label="Amount to Transfer"
                                        type="number"
                                        value={fundAmount}
                                        onChange={(e) => setFundAmount(e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        hint={`Available: $${
                                            accounts.find((a) => a.id === fundFromAccount)?.balance.toFixed(2) || "0.00"
                                        }`}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <Button type="submit" className="w-full" isLoading={accountLoading}>
                        <Wallet className="w-4 h-4" />
                        Create Account
                    </Button>
                </form>
            </Modal>
        </>
    );
}
