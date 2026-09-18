-- Data backfill for the one-account-per-person model.
--
-- An account that already had a password and never used a social provider knows
-- its own password, so mark it as set. Accounts with a Google sign-in history may
-- still hold the random hash the old social flow wrote (nobody knows it), so they
-- stay NULL and get the one-time "set your password" page on their next social
-- sign-in instead.
UPDATE "users" u
SET "passwordSetAt" = u."createdAt"
WHERE u."passwordHash" IS NOT NULL
  AND u."passwordSetAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "audit_logs" a
    WHERE a."targetId" = u.id
      AND a.action IN ('user.signup.google', 'user.login.google')
  );