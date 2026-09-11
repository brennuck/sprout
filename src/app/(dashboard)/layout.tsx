import { redirect } from "next/navigation";
import { Suspense } from "react";
import { validateRequest } from "@/lib/auth";
import { getBudgetSnapshot } from "@/lib/data/snapshot";
import { SnapshotProvider } from "@/components/shell/SnapshotProvider";
import { AppShell } from "@/components/shell/AppShell";
import { AddSheetProvider } from "@/components/add/AddSheet";
import { BudProvider } from "@/components/dashboard/Bud";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";
import { CatchUpJobs } from "@/components/shell/CatchUpJobs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await validateRequest();
  if (!user) redirect("/signin");

  const snapshot = await getBudgetSnapshot(user.id);

  return (
    <SnapshotProvider snapshot={snapshot}>
      <BudProvider>
        <Suspense fallback={null}>
          <AddSheetProvider>
            <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>
            <KeyboardShortcuts />
            <CatchUpJobs />
          </AddSheetProvider>
        </Suspense>
      </BudProvider>
    </SnapshotProvider>
  );
}
