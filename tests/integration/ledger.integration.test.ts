import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createLedgerTransaction,
  createLedgerTransfer,
  deleteLedgerTransaction,
  reconcileLedgerAccount,
  restoreLedgerTransaction,
} from "@/lib/services/ledger";

describe("ledger integration", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let ownerId = "";
  let editorId = "";
  let viewerId = "";
  let accountId = "";
  let destinationId = "";
  let expenseId = "";

  beforeAll(async () => {
    const [owner, editor, viewer] = await Promise.all([
      prisma.user.create({
        data: {
          email: `owner-${suffix}@example.com`,
          hashedPassword: "integration-only",
          name: "Owner",
        },
      }),
      prisma.user.create({
        data: {
          email: `editor-${suffix}@example.com`,
          hashedPassword: "integration-only",
          name: "Editor",
        },
      }),
      prisma.user.create({
        data: {
          email: `viewer-${suffix}@example.com`,
          hashedPassword: "integration-only",
          name: "Viewer",
        },
      }),
    ]);
    ownerId = owner.id;
    editorId = editor.id;
    viewerId = viewer.id;

    const [account, destination] = await Promise.all([
      prisma.account.create({
        data: { userId: ownerId, name: "Checking", type: "SAVINGS", balance: 1000 },
      }),
      prisma.account.create({
        data: { userId: ownerId, name: "Savings", type: "SAVINGS", balance: 100 },
      }),
    ]);
    accountId = account.id;
    destinationId = destination.id;

    await prisma.dashboardShare.createMany({
      data: [
        { ownerId, viewerId: editorId, permission: "EDIT" },
        { ownerId, viewerId, permission: "VIEW" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, editorId, viewerId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  it("allows shared editors and reverses the complete ledger mutation", async () => {
    const created = await createLedgerTransaction({
      actorId: editorId,
      accountId,
      amount: 125,
      description: "Shared groceries",
      type: "EXPENSE",
    });
    expenseId = created.transaction.id;

    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(875);
    await deleteLedgerTransaction(editorId, expenseId);
    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(1000);
  });

  it("rejects view-only writes without changing balances", async () => {
    await expect(
      createLedgerTransaction({
        actorId: viewerId,
        accountId,
        amount: 20,
        description: "Forbidden expense",
        type: "EXPENSE",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });

    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(1000);
  });

  it("rolls back an invalid transfer before any balance changes", async () => {
    await expect(
      createLedgerTransfer({
        actorId: editorId,
        fromAccountId: accountId,
        toAccountId: destinationId,
        amount: 5000,
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });

    const [source, destination] = await Promise.all([
      prisma.account.findUniqueOrThrow({ where: { id: accountId } }),
      prisma.account.findUniqueOrThrow({ where: { id: destinationId } }),
    ]);
    expect(Number(source.balance)).toBe(1000);
    expect(Number(destination.balance)).toBe(100);
  });

  it("reconciles with an ADJUSTMENT and restores after undo", async () => {
    const reconciled = await reconcileLedgerAccount(ownerId, accountId, 940);
    expect(reconciled.difference).toBe(-60);
    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(940);

    const payload = await deleteLedgerTransaction(ownerId, reconciled.transaction!.id);
    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(1000);

    const restored = await restoreLedgerTransaction(ownerId, payload);
    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(940);

    await deleteLedgerTransaction(ownerId, restored.transaction.id);
    expect(Number((await prisma.account.findUniqueOrThrow({ where: { id: accountId } })).balance)).toBe(1000);
  });
});
