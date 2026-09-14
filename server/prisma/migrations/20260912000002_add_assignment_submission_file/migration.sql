-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'EXAM', 'QUIZ', 'PROJECT', 'READING');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'GRADED', 'RETURNED', 'RESUBMITTED');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('IMAGE', 'PDF', 'DOC', 'PPT', 'TXT', 'AUDIO', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'CLASSROOM', 'PUBLIC');

CREATE TABLE IF NOT EXISTS "assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classroomId" TEXT,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "descriptionAr" TEXT,
    "type" "AssignmentType" NOT NULL DEFAULT 'HOMEWORK',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "dueAt" TIMESTAMP,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "allowResubmission" BOOLEAN NOT NULL DEFAULT false,
    "lessonId" TEXT,
    "courseId" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT,
    "fileIds" TEXT[] DEFAULT '{}',
    "answers" JSONB,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "score" INTEGER,
    "feedback" TEXT,
    "feedbackAr" TEXT,
    "gradedAt" TIMESTAMP,
    "gradedBy" TEXT,
    "submittedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resubmittedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "files" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "category" "FileCategory" NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT '{}',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "classroomId" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "submissions_assignmentId_studentId_key" ON "submissions"("assignmentId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "files_storageKey_key" ON "files"("storageKey");

CREATE INDEX IF NOT EXISTS "assignments_teacherId_idx" ON "assignments"("teacherId");
CREATE INDEX IF NOT EXISTS "assignments_classroomId_idx" ON "assignments"("classroomId");
CREATE INDEX IF NOT EXISTS "assignments_status_idx" ON "assignments"("status");
CREATE INDEX IF NOT EXISTS "submissions_assignmentId_idx" ON "submissions"("assignmentId");
CREATE INDEX IF NOT EXISTS "submissions_studentId_idx" ON "submissions"("studentId");
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions"("status");
CREATE INDEX IF NOT EXISTS "files_uploaderId_idx" ON "files"("uploaderId");
CREATE INDEX IF NOT EXISTS "files_classroomId_idx" ON "files"("classroomId");
CREATE INDEX IF NOT EXISTS "files_category_idx" ON "files"("category");
CREATE INDEX IF NOT EXISTS "files_deletedAt_idx" ON "files"("deletedAt");

ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_gradedBy_fkey" FOREIGN KEY ("gradedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;