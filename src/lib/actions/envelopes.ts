"use server";

import { z } from "zod";
import { requireUser, runAction } from "@/lib/actions/shared";
import {
  fundEnvelope,
  moveEnvelopeMoney,
  quickAssign,
  unassignEnvelopeMoney,
  undoEnvelopeGroup,
} from "@/lib/services/ledger";
import {
  archiveEnvelope,
  createEnvelope,
  getEnvelopeHistory,
  reorderEnvelopes,
  setFocusGoal,
  updateEnvelope,
} from "@/lib/services/envelopes";
import { createEnvelopeSchema, moneySchema, updateEnvelopeSchema } from "@/lib/validation";
import { processDueRecurringContributions } from "@/lib/services/recurring-funding";

export async function createEnvelopeAction(input: z.input<typeof createEnvelopeSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = createEnvelopeSchema.parse(input);
    const envelope = await createEnvelope({ actorId: user.id, ...data });
    return { id: envelope.id };
  });
}

export async function updateEnvelopeAction(input: z.input<typeof updateEnvelopeSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = updateEnvelopeSchema.parse(input);
    const envelope = await updateEnvelope({ actorId: user.id, ...data });
    return { id: envelope.id };
  });
}

export async function archiveEnvelopeAction(id: string, archived = true) {
  return runAction(async () => {
    const user = await requireUser();
    await archiveEnvelope(user.id, id, archived);
    return { id, archived };
  });
}

export async function reorderEnvelopesAction(orderedIds: string[]) {
  return runAction(async () => {
    const user = await requireUser();
    await reorderEnvelopes(user.id, z.array(z.string()).max(200).parse(orderedIds));
    return null;
  });
}

export async function fundEnvelopeAction(envelopeId: string, amount: number) {
  return runAction(async () => {
    const user = await requireUser();
    const { entry } = await fundEnvelope(user.id, envelopeId, moneySchema.parse(amount));
    return { groupId: entry.groupId };
  });
}

export async function unassignEnvelopeAction(envelopeId: string, amount: number) {
  return runAction(async () => {
    const user = await requireUser();
    const { entry } = await unassignEnvelopeMoney(user.id, envelopeId, moneySchema.parse(amount));
    return { groupId: entry.groupId };
  });
}

export async function moveMoneyAction(fromEnvelopeId: string, toEnvelopeId: string, amount: number) {
  return runAction(async () => {
    const user = await requireUser();
    const { groupId } = await moveEnvelopeMoney(
      user.id,
      fromEnvelopeId,
      toEnvelopeId,
      moneySchema.parse(amount),
    );
    return { groupId };
  });
}

const quickAssignSchema = z.object({
  accountId: z.string().min(1),
  lines: z
    .array(z.object({ envelopeId: z.string().min(1), amount: z.number().positive() }))
    .min(1)
    .max(200),
  note: z.string().max(80).optional(),
});

export async function quickAssignAction(input: z.input<typeof quickAssignSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    const data = quickAssignSchema.parse(input);
    const { groupId, total } = await quickAssign(user.id, data.accountId, data.lines, data.note);
    return { groupId, total };
  });
}

export async function undoEnvelopeGroupAction(groupId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await undoEnvelopeGroup(user.id, groupId);
    return null;
  });
}

export async function setFocusGoalAction(goalEnvelopeId: string | null) {
  return runAction(async () => {
    const user = await requireUser();
    await setFocusGoal(user.id, goalEnvelopeId);
    return { goalEnvelopeId };
  });
}

export async function loadEnvelopeHistoryAction(envelopeId: string, cursor?: string | null) {
  return runAction(async () => {
    const user = await requireUser();
    return getEnvelopeHistory(user.id, envelopeId, cursor);
  });
}

/** Catch up any automatic contributions that came due since the last visit. */
export async function runDueRecurringAction() {
  return runAction(async () => {
    const user = await requireUser();
    return processDueRecurringContributions({ userId: user.id });
  });
}
