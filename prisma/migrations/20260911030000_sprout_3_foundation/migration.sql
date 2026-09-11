-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'ADJUSTMENT';

-- AlterTable
ALTER TABLE "envelopes" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payeeId" TEXT,
ADD COLUMN     "scheduledTransactionId" TEXT;

-- CreateTable
CREATE TABLE "payees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEnvelopeId" TEXT,
    "lastAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "payees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_transactions" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "weekday" INTEGER,
    "dayOfMonth" INTEGER,
    "month" INTEGER,
    "timezone" TEXT NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "lastPostedAt" TIMESTAMP(3),
    "autoPost" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "transferToAccountId" TEXT,
    "envelopeId" TEXT,
    "payeeId" TEXT,

    CONSTRAINT "scheduled_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payees_userId_useCount_idx" ON "payees"("userId", "useCount");

-- CreateIndex
CREATE UNIQUE INDEX "payees_userId_normalizedName_key" ON "payees"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "scheduled_transactions_userId_enabled_nextDueAt_idx" ON "scheduled_transactions"("userId", "enabled", "nextDueAt");

-- CreateIndex
CREATE INDEX "scheduled_transactions_accountId_idx" ON "scheduled_transactions"("accountId");

-- CreateIndex
CREATE INDEX "scheduled_transactions_envelopeId_idx" ON "scheduled_transactions"("envelopeId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "invitations_recipientId_status_idx" ON "invitations"("recipientId", "status");

-- CreateIndex
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");

-- CreateIndex
CREATE INDEX "transactions_accountId_date_idx" ON "transactions"("accountId", "date");

-- CreateIndex
CREATE INDEX "transactions_type_date_idx" ON "transactions"("type", "date");

-- CreateIndex
CREATE INDEX "transactions_payeeId_idx" ON "transactions"("payeeId");

-- CreateIndex
CREATE INDEX "transactions_scheduledTransactionId_idx" ON "transactions"("scheduledTransactionId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "payees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheduledTransactionId_fkey" FOREIGN KEY ("scheduledTransactionId") REFERENCES "scheduled_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payees" ADD CONSTRAINT "payees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_transferToAccountId_fkey" FOREIGN KEY ("transferToAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "envelopes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "payees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

