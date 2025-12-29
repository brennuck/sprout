"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Checkbox } from "@/components/ui/Checkbox";

interface TransactionFormProps {
  selectedAccountId: string;
  selectedAccountName: string;
  selectedAccountType: string;
  onSuccess: () => void;
}

export function TransactionForm({
  selectedAccountId,
  selectedAccountName,
  selectedAccountType,
  onSuccess,
}: TransactionFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [takeFromSavings, setTakeFromSavings] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description || !amount) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount) * (type === "EXPENSE" ? -1 : 1),
          type,
          accountId: selectedAccountId,
          takeFromSavings: selectedAccountType !== "SAVINGS" && takeFromSavings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create transaction");
      }

      setDescription("");
      setAmount("");
      setTakeFromSavings(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="mb-0">
        <CardTitle>Add Transaction</CardTitle>
        <p className="text-sm text-sage-500 mt-1">
          for {selectedAccountName}
        </p>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <RadioGroup
          label="Type"
          name="type"
          value={type}
          onValueChange={(v) => setType(v as "EXPENSE" | "INCOME")}
          options={[
            { value: "EXPENSE", label: "Expense" },
            { value: "INCOME", label: "Income" },
          ]}
        />

        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
        />

        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
        />

        {selectedAccountType !== "SAVINGS" && (
          <Checkbox
            label="Take from savings"
            checked={takeFromSavings}
            onChange={(e) => setTakeFromSavings(e.target.checked)}
          />
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          <PlusCircle className="w-4 h-4" />
          Add Transaction
        </Button>
      </form>
    </Card>
  );
}

