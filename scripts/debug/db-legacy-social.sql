-- Accounts that the OLD Google flow created got a random, unknown password hash.
-- They are the ones the audit log recorded as `user.signup.google`; every other
-- password account was created manually and therefore already knows its password.
SELECT
  count(*) FILTER (WHERE u."passwordSetAt" IS NULL)                        AS needs_backfill_check,
  count(*) FILTER (WHERE u."passwordHash" IS NOT NULL)                    AS with_password,
  count(*) FILTER (WHERE a."targetId" IS NOT NULL)                        AS social_created
FROM "users" u
LEFT JOIN "audit_logs" a ON a."targetId" = u.id AND a.action = 'user.signup.google';

-- How were the real (non-seeded, non-test) accounts created, and which provider
-- actions did they use? This decides whether `passwordSetAt` can be backfilled.
SELECT u.email, a.action, a."createdAt"
FROM "users" u
JOIN "audit_logs" a ON a."targetId" = u.id
WHERE a.action LIKE 'user.%'
ORDER BY a."createdAt" DESC
LIMIT 25;

SELECT email, role, "createdAt" FROM "users"
WHERE email LIKE '%gmail%' OR email LIKE '%outlook%' OR email LIKE '%yahoo%';