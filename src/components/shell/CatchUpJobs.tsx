"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { countDueRecurring, dueBills } from "@/lib/data/snapshot";
import { useSnapshot } from "@/components/shell/SnapshotProvider";
import { runDueRecurringAction } from "@/lib/actions/envelopes";
import { processDueBillsAction } from "@/lib/actions/bills";

/** Apply due automatic contributions and auto-post bills once per visit. */
export function CatchUpJobs() {
  const snapshot = useSnapshot();
  const router = useRouter();
  const recurringDue = countDueRecurring(snapshot);
  const autoBills = dueBills(snapshot).filter((bill) => bill.autoPost).length;

  useEffect(() => {
    let active = true;
    const run = async () => {
      let refresh = false;
      if (recurringDue > 0) {
        const result = await runDueRecurringAction();
        if (result.ok && result.data.applied > 0) refresh = true;
      }
      if (autoBills > 0) {
        const result = await processDueBillsAction();
        if (result.ok && result.data.posted > 0) refresh = true;
      }
      if (active && refresh) router.refresh();
    };
    void run();
    return () => {
      active = false;
    };
  }, [recurringDue, autoBills, router]);

  return null;
}
