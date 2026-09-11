import { Suspense } from "react";
import { validateRequest } from "@/lib/auth";
import { listTransactions, type TransactionFilters } from "@/lib/data/transactions";
import { ActivityManager } from "@/components/dashboard/ActivityManager";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: { envelopeId?: string; focus?: string };
}) {
  const { user } = await validateRequest();
  if (!user) return null;

  const filters: TransactionFilters = {
    envelopeId: searchParams?.envelopeId || "ALL",
  };
  const initial = await listTransactions(user.id, filters);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActivityManager initial={initial} initialFilters={filters} />
    </Suspense>
  );
}
