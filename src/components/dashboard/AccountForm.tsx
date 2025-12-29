"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AccountFormProps {
  onSuccess: () => void;
}

const accountTypes = [
  { value: "SAVINGS", label: "Savings" },
  { value: "BUDGET", label: "Budget" },
  { value: "ALLOWANCE", label: "Allowance" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "STOCK", label: "Stock" },
];

export function AccountForm({ onSuccess }: AccountFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("SAVINGS");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) {
      setError("Please enter an account name");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      setName("");
      setType("SAVINGS");
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
        <CardTitle>Add New Account</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Account Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Emergency Fund"
        />

        <Select
          label="Account Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={accountTypes}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          <PlusCircle className="w-4 h-4" />
          Add Account
        </Button>
      </form>
    </Card>
  );
}

