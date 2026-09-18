-- Inspect invite codes in the live database
\echo === invite_codes ===
SELECT code, role, "maxUses", uses, active, label, "createdAt" FROM invite_codes ORDER BY "createdAt";
\echo === admins with codes ===
SELECT u.email, u.role, u."inviteCodeId", (u."securityCodeHash" IS NOT NULL) AS has_security_hash
FROM users u WHERE u.role = 'ADMIN' ORDER BY u."createdAt";
