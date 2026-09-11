"use server";

import { z } from "zod";
import { requireUser, runAction } from "@/lib/actions/shared";
import { AppError } from "@/lib/errors";
import { getDashboardReport } from "@/lib/services/reports";
import { dateStringSchema } from "@/lib/validation";

const rangeSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
});

export async function loadReportAction(input: z.input<typeof rangeSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const { from, to } = rangeSchema.parse(input);
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new AppError("Choose a valid report date range", 400, "INVALID_RANGE");
    }
    return getDashboardReport(user.id, { from: start, to: end });
  });
}
