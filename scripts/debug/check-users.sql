\pset pager off
SELECT 'users_total=' || count(*) AS users FROM users;
SELECT 'sessions_total=' || count(*) AS sessions FROM sessions;
SELECT 'audit_total=' || count(*) AS audit FROM audit_logs;
\echo '--- latest users ---'
SELECT email, name, role, "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10;