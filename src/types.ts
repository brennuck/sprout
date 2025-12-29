export type AccountType = "SAVINGS" | "BUDGET" | "ALLOWANCE" | "RETIREMENT" | "STOCK";

export type TransactionType = "INCOME" | "EXPENSE";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  date: Date;
  type: TransactionType;
  takeFromSavings: boolean;
  createdAt: Date;
  fromAccountId: string | null;
  toAccountId: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

