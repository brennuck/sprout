"use server";

import { requireUser, runAction } from "@/lib/actions/shared";
import { prisma } from "@/lib/prisma";
import { normalizePayeeName } from "@/lib/services/payees";

export async function searchPayeesAction(query: string) {
  return runAction(async () => {
    const user = await requireUser();
    const trimmed = query.trim();
    if (!trimmed) return [];
    return prisma.payee.findMany({
      where: {
        userId: user.id,
        normalizedName: { contains: normalizePayeeName(trimmed) },
      },
      orderBy: [{ useCount: "desc" }, { lastUsedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        useCount: true,
        lastUsedAt: true,
        lastEnvelopeId: true,
        lastAccountId: true,
      },
    });
  });
}
