\pset pager off
SELECT email, role, "passwordHash" IS NULL AS no_password, left("passwordHash",7) AS hash_prefix, "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10;
SELECT email, role, "createdAt" FROM users WHERE email LIKE '%learnpilot.dev' ORDER BY email;