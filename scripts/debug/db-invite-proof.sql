-- Proof that an invited admin is stored WITH the security code + the code it came from
\echo === newest admins (invite binding) ===
SELECT u.email, u.name,
       u."inviteCodeId" IS NOT NULL AS has_invite_link,
       (u."securityCodeHash" IS NOT NULL) AS has_security_hash,
       i.code AS bound_code, i.uses, i."maxUses"
FROM users u LEFT JOIN invite_codes i ON i.id = u."inviteCodeId"
WHERE u.role = 'ADMIN'
ORDER BY u."createdAt" DESC
LIMIT 5;

\echo === all invite codes ===
SELECT code, "maxUses", uses, active, label FROM invite_codes ORDER BY "createdAt" DESC;
