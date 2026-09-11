"use server";

import { z } from "zod";
import { requireUser, runAction } from "@/lib/actions/shared";
import {
  convertLegacyAccount,
  createLedgerAccount,
  deleteLedgerAccount,
  reconcileLedgerAccount,
  renameLedgerAccount,
} from "@/lib/services/ledger";
import { saveAllocationPlan } from "@/lib/services/plans";
import { savePlanSchema } from "@/lib/validation";

const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(80),
  type: z.enum(["SAVINGS", "RETIREMENT", "STOCK"]).default("SAVINGS"),
  startingBalance: z.number().min(0, "Balance cannot be negative").default(0),
});

export async function createAccountAction(input: z.input<typeof createAccountSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = createAccountSchema.parse(input);
    const account = await createLedgerAccount({ actorId: user.id, ...data });
    return { id: account.id };
  });
}

export async function renameAccountAction(accountId: string, name: string) {
  return runAction(async () => {
    const user = await requireUser();
    await renameLedgerAccount(user.id, accountId, name);
    return null;
  });
}

export async function reconcileAccountAction(accountId: string, actualBalance: number) {
  return runAction(async () => {
    const user = await requireUser();
    const result = await reconcileLedgerAccount(
      user.id,
      accountId,
      z.number().finite().parse(actualBalance),
    );
    return { difference: result.difference, transactionId: result.transaction?.id ?? null };
  });
}

export async function deleteAccountAction(accountId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteLedgerAccount(user.id, accountId);
    return null;
  });
}

const convertSchema = z.object({
  sourceAccountId: z.string(),
  destinationAccountId: z.string(),
  envelopeName: z.string().trim().min(1).max(80),
  kind: z.enum(["BUDGET", "SINKING_FUND", "GOAL"]),
});

export async function convertLegacyAccountAction(input: z.input<typeof convertSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = convertSchema.parse(input);
    const envelope = await convertLegacyAccount(
      user.id,
      data.sourceAccountId,
      data.destinationAccountId,
      data.envelopeName,
      data.kind,
    );
    return { id: envelope.id };
  });
}

export async function savePlanAction(input: z.input<typeof savePlanSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = savePlanSchema.parse(input);
    const plan = await saveAllocationPlan({ actorId: user.id, ...data });
    return { id: plan.id };
  });
}
