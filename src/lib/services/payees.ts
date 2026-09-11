import type { Prisma } from "@prisma/client";

export function normalizePayeeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Remember a payee so the next entry can auto-fill the envelope and account.
 * Runs inside the caller's transaction. Returns the payee id or null when the
 * description is empty.
 */
export async function touchPayee(
  tx: Prisma.TransactionClient,
  ownerId: string,
  name: string,
  context: { envelopeId?: string | null; accountId?: string | null },
) {
  const normalizedName = normalizePayeeName(name);
  if (!normalizedName) return null;
  const display = name.trim().replace(/\s+/g, " ").slice(0, 80);
  const payee = await tx.payee.upsert({
    where: { userId_normalizedName: { userId: ownerId, normalizedName } },
    create: {
      userId: ownerId,
      name: display,
      normalizedName,
      useCount: 1,
      lastUsedAt: new Date(),
      lastEnvelopeId: context.envelopeId ?? null,
      lastAccountId: context.accountId ?? null,
    },
    update: {
      name: display,
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
      ...(context.envelopeId !== undefined ? { lastEnvelopeId: context.envelopeId } : {}),
      ...(context.accountId ? { lastAccountId: context.accountId } : {}),
    },
    select: { id: true },
  });
  return payee.id;
}
