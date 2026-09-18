SELECT email, role,
       (security_code_hash IS NOT NULL) AS has_hash,
       (invite_code_id IS NOT NULL) AS has_invite
FROM users
WHERE role IN ('ADMIN','OWNER')
ORDER BY role, email;
