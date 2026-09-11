"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BudgetSnapshot } from "@/lib/data/types";

const SnapshotContext = createContext<BudgetSnapshot | null>(null);

/** Makes the owner's snapshot available to shell-level clients (Add sheet, Bud, nav). */
export function SnapshotProvider({ snapshot, children }: { snapshot: BudgetSnapshot; children: ReactNode }) {
  return <SnapshotContext.Provider value={snapshot}>{children}</SnapshotContext.Provider>;
}

export function useSnapshot() {
  const snapshot = useContext(SnapshotContext);
  if (!snapshot) throw new Error("useSnapshot must be used within <SnapshotProvider>");
  return snapshot;
}
