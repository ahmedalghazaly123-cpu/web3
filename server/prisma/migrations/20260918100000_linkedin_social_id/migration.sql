-- Replace Apple identity binding with LinkedIn.
DROP INDEX IF EXISTS "users_appleId_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "appleId";
ALTER TABLE "users" ADD COLUMN "linkedinId" TEXT;
CREATE UNIQUE INDEX "users_linkedinId_key" ON "users"("linkedinId");
