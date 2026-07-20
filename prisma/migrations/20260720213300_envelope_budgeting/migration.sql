CREATE TYPE "EnvelopeKind" AS ENUM ('BUDGET', 'GOAL');
CREATE TYPE "EnvelopeEntryType" AS ENUM ('ALLOCATION', 'SPEND', 'MOVE', 'ADJUSTMENT', 'WITHDRAWAL');
CREATE TYPE "AllocationRuleMethod" AS ENUM ('FIXED', 'PERCENT', 'REMAINDER');

CREATE TABLE "envelopes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EnvelopeKind" NOT NULL DEFAULT 'BUDGET',
    "targetAmount" DECIMAL(12,2),
    "monthlyTarget" DECIMAL(12,2),
    "targetDate" TIMESTAMP(3),
    "rollover" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "envelopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "envelope_entries" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "EnvelopeEntryType" NOT NULL,
    "note" TEXT,
    "groupId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envelopeId" TEXT NOT NULL,
    "transactionId" TEXT,
    CONSTRAINT "envelope_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "allocation_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Paycheck plan',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "allocation_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "allocation_rules" (
    "id" TEXT NOT NULL,
    "method" "AllocationRuleMethod" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    CONSTRAINT "allocation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goal_preferences" (
    "userId" TEXT NOT NULL,
    "goalEnvelopeId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "goal_preferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "transactions" ADD COLUMN "goalImpactEnvelopeId" TEXT;

CREATE INDEX "envelopes_userId_archivedAt_sortOrder_idx" ON "envelopes"("userId", "archivedAt", "sortOrder");
CREATE INDEX "envelopes_accountId_idx" ON "envelopes"("accountId");
CREATE INDEX "envelope_entries_envelopeId_date_idx" ON "envelope_entries"("envelopeId", "date");
CREATE INDEX "envelope_entries_transactionId_idx" ON "envelope_entries"("transactionId");
CREATE INDEX "envelope_entries_groupId_idx" ON "envelope_entries"("groupId");
CREATE UNIQUE INDEX "allocation_plans_userId_accountId_key" ON "allocation_plans"("userId", "accountId");
CREATE UNIQUE INDEX "allocation_rules_planId_envelopeId_key" ON "allocation_rules"("planId", "envelopeId");
CREATE INDEX "allocation_rules_planId_priority_idx" ON "allocation_rules"("planId", "priority");
CREATE INDEX "goal_preferences_goalEnvelopeId_idx" ON "goal_preferences"("goalEnvelopeId");
CREATE INDEX "transactions_goalImpactEnvelopeId_idx" ON "transactions"("goalImpactEnvelopeId");

ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envelope_entries" ADD CONSTRAINT "envelope_entries_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envelope_entries" ADD CONSTRAINT "envelope_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocation_plans" ADD CONSTRAINT "allocation_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocation_plans" ADD CONSTRAINT "allocation_plans_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocation_rules" ADD CONSTRAINT "allocation_rules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "allocation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocation_rules" ADD CONSTRAINT "allocation_rules_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_preferences" ADD CONSTRAINT "goal_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_preferences" ADD CONSTRAINT "goal_preferences_goalEnvelopeId_fkey" FOREIGN KEY ("goalEnvelopeId") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_goalImpactEnvelopeId_fkey" FOREIGN KEY ("goalImpactEnvelopeId") REFERENCES "envelopes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
