-- Voice tutor sessions, code-sandbox runs and live-room chat messages.
--
-- These models existed in schema.prisma (and were referenced by the User
-- relations) but had no migration, so the tables were missing at runtime:
-- /api/v1/voice/*, /api/v1/sandbox/* and the room chat would fail with
-- "relation does not exist". This migration brings the database back in sync
-- with the schema (schema drift fix).

-- CreateEnum
CREATE TYPE "RoomMessageKind" AS ENUM ('CHAT', 'SYSTEM', 'SCORE');

-- CreateEnum
CREATE TYPE "VoiceSessionStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SandboxLanguage" AS ENUM ('JS', 'PYTHON');

-- CreateEnum
CREATE TYPE "SandboxStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR', 'TIMEOUT', 'BLOCKED');

-- CreateTable
CREATE TABLE "voice_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "status" "VoiceSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "transcript" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sandbox_runs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "language" "SandboxLanguage" NOT NULL,
    "code" TEXT NOT NULL,
    "stdin" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "exitCode" INTEGER,
    "timedOut" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "status" "SandboxStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sandbox_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RoomMessageKind" NOT NULL DEFAULT 'CHAT',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_sessions_studentId_createdAt_idx" ON "voice_sessions"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "voice_messages_sessionId_createdAt_idx" ON "voice_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "sandbox_runs_studentId_createdAt_idx" ON "sandbox_runs"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "room_messages_roomId_createdAt_idx" ON "room_messages"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_messages" ADD CONSTRAINT "voice_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "voice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sandbox_runs" ADD CONSTRAINT "sandbox_runs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "live_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
