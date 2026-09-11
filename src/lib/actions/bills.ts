"use server";

import { z } from "zod";
import { requireUser, runAction } from "@/lib/actions/shared";
import {
  createBill,
  deleteBill,
  markBillPaid,
  processDueBills,
  skipBillOccurrence,
  updateBill,
} from "@/lib/services/bills";
import { billSchema, moneySchema } from "@/lib/validation";

export async function createBillAction(input: z.input<typeof billSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = billSchema.parse(input);
    const bill = await createBill({ actorId: user.id, ...data });
    return { id: bill.id };
  });
}

export async function updateBillAction(id: string, input: z.input<typeof billSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = billSchema.parse(input);
    await updateBill(user.id, id, data);
    return { id };
  });
}

export async function deleteBillAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteBill(user.id, id);
    return null;
  });
}

export async function markBillPaidAction(id: string, amount?: number) {
  return runAction(async () => {
    const user = await requireUser();
    return markBillPaid(user.id, id, amount === undefined ? undefined : moneySchema.parse(amount));
  });
}

export async function skipBillAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    const result = await skipBillOccurrence(user.id, id);
    return { nextDueAt: result.nextDueAt.toISOString() };
  });
}

export async function processDueBillsAction() {
  return runAction(async () => {
    const user = await requireUser();
    return processDueBills({ userId: user.id });
  });
}
