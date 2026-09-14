CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum: XpEventKind
CREATE TYPE "XpEventKind" AS ENUM ('CORRECT_ANSWER', 'REVIEW', 'STREAK', 'MASTERY', 'ACHIEVEMENT', 'DEMO', 'BONUS');

-- Create table: xp_events
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "studentId" TEXT NOT NULL,
    "kind" "XpEventKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "clientKey" TEXT,
    "metadata" jsonb,
    "happenedAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- Create index: xp_events_studentId_createdAt
CREATE INDEX "xp_events_studentId_createdAt_idx" ON "xp_events" ("studentId", "createdAt");

-- Create index: xp_events_studentId_kind
CREATE INDEX "xp_events_studentId_kind_idx" ON "xp_events" ("studentId", "kind");

-- Create unique constraint: xp_events_studentId_clientKey
CREATE UNIQUE INDEX "xp_events_studentId_clientKey_key" ON "xp_events" ("studentId", "clientKey");

-- Create table: consent_records
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "revokedAt" TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "policyVersion" TEXT,
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint: consent_records_userId_category
CREATE UNIQUE INDEX "consent_records_userId_category_key" ON "consent_records" ("userId", "category");

-- Create table: privacy_preferences
CREATE TABLE "privacy_preferences" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "dataExportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dataDeletionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "analyticsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "aiProcessingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "privacy_preferences_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint: privacy_preferences_userId
CREATE UNIQUE INDEX "privacy_preferences_userId_key" ON "privacy_preferences" ("userId");

-- Add foreign keys
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "privacy_preferences" ADD CONSTRAINT "privacy_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;