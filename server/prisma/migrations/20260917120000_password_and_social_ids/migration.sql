-- One database account per person: the verified provider email is the shared
-- identity, and the site password is set by the user exactly once.
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "passwordSetAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN "githubId" TEXT;
ALTER TABLE "users" ADD COLUMN "appleId" TEXT;
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");
CREATE UNIQUE INDEX "users_appleId_key" ON "users"("appleId");
