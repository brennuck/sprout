import type { Prisma, PrismaClient, SharePermission } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
type AccessLevel = "VIEW" | "EDIT";

export interface AccountAccess {
  accountId: string;
  ownerId: string;
  permission: "OWNER" | SharePermission;
}

export async function requireDashboardAccess(
  userId: string,
  ownerId: string,
  level: AccessLevel = "VIEW",
  db: DatabaseClient = prisma,
) {
  if (userId === ownerId) {
    return { ownerId, permission: "OWNER" as const };
  }

  const share = await db.dashboardShare.findUnique({
    where: { ownerId_viewerId: { ownerId, viewerId: userId } },
    select: { permission: true },
  });
  if (!share || (level === "EDIT" && share.permission !== "EDIT")) {
    throw new AppError("Dashboard not found or unavailable", 403, "FORBIDDEN");
  }
  return { ownerId, permission: share.permission };
}

export async function requireAccountAccess(
  userId: string,
  accountId: string,
  level: AccessLevel = "VIEW",
  db: DatabaseClient = prisma,
): Promise<AccountAccess> {
  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true },
  });

  if (!account) {
    throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }

  if (account.userId === userId) {
    return { accountId, ownerId: account.userId, permission: "OWNER" };
  }

  const share = await db.dashboardShare.findUnique({
    where: {
      ownerId_viewerId: {
        ownerId: account.userId,
        viewerId: userId,
      },
    },
    select: { permission: true },
  });

  if (!share || (level === "EDIT" && share.permission !== "EDIT")) {
    throw new AppError(
      level === "EDIT" ? "You do not have permission to edit this dashboard" : "Dashboard not found",
      403,
      "FORBIDDEN",
    );
  }

  return { accountId, ownerId: account.userId, permission: share.permission };
}

export async function requireEnvelopeAccess(
  userId: string,
  envelopeId: string,
  level: AccessLevel = "VIEW",
  db: DatabaseClient = prisma,
) {
  const envelope = await db.envelope.findUnique({
    where: { id: envelopeId },
    select: { id: true, name: true, accountId: true, userId: true, kind: true },
  });

  if (!envelope) {
    throw new AppError("Envelope not found", 404, "ENVELOPE_NOT_FOUND");
  }

  const access = await requireAccountAccess(userId, envelope.accountId, level, db);
  if (access.ownerId !== envelope.userId) {
    throw new AppError("Envelope does not belong to this account", 400, "ACCOUNT_MISMATCH");
  }

  return { envelope, access };
}
