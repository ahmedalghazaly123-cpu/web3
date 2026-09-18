SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('passwordHash', 'passwordSetAt', 'googleId', 'githubId', 'appleId')
ORDER BY column_name;

SELECT migration_name, finished_at IS NOT NULL AS applied
FROM _prisma_migrations
ORDER BY started_at DESC
LIMIT 3;