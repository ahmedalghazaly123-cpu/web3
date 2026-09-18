/**
 * Live end-to-end check for the Admin invite ("security code") gate.
 * Runs against the deployed API (default http://localhost:4000/api/v1).
 *
 *   node scripts/debug/invite-e2e-check.cjs
 */
const BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';
const OWNER = { email: 'owner@learnpilot.dev', password: 'learnpilot' };
const LEGACY_ADMIN = { email: 'admin@learnpilot.dev', password: 'learnpilot' };
let pass = 0, fail = 0;

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* 204 */ }
  return { status: res.status, json };
}

(async () => {
  // 1. Owner signs in and sees the code inventory
  const ownerLogin = await call('/auth/login', { method: 'POST', body: OWNER });
  check('owner password login', ownerLogin.status === 200, JSON.stringify(ownerLogin.json));
  const ownerToken = ownerLogin.json?.token;

  const list = await call('/owner/invite-codes', { token: ownerToken });
  check('owner lists invite codes', list.status === 200, JSON.stringify(list.json));
  const codes = list.json?.codes || [];
  check('fixed bootstrap code "Ahmed" exists', codes.some((c) => c.code === 'Ahmed'),
    JSON.stringify(codes.map((c) => c.code)));

  // 2. Owner issues a single-use code
  const newCode = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const created = await call('/owner/invite-codes', {
    method: 'POST', token: ownerToken,
    body: { code: newCode, label: 'e2e single use', maxUses: 1 },
  });
  check('owner creates a code', created.status === 201 && created.json?.invite?.code === newCode,
    JSON.stringify(created.json));

  // 3. Admin signup with the fixed code
  const adminEmail = `adm-invite-${Date.now()}@example.com`;
  const signup = await call('/auth/signup', {
    method: 'POST',
    body: { email: adminEmail, password: 'learnpilot', name: 'Invited Admin', role: 'admin', inviteCode: 'Ahmed' },
  });
  check('admin signup with code "Ahmed"', signup.status === 201 && String(signup.json?.user?.role) === 'ADMIN',
    JSON.stringify(signup.json));

  // 4. The same admin cannot sign in without the code
  const noCode = await call('/auth/login', { method: 'POST', body: { email: adminEmail, password: 'learnpilot' } });
  check('admin login WITHOUT code is refused', noCode.status === 400 && noCode.json?.error === 'invite-code-required',
    JSON.stringify(noCode.json));

  // 5. Wrong code is refused
  const wrong = await call('/auth/login', {
    method: 'POST', body: { email: adminEmail, password: 'learnpilot', inviteCode: 'NOT-THE-CODE' },
  });
  check('admin login with WRONG code is refused', wrong.status === 403 && wrong.json?.error === 'invalid-invite-code',
    JSON.stringify(wrong.json));

  // 6. Correct code signs in
  const withCode = await call('/auth/login', {
    method: 'POST', body: { email: adminEmail, password: 'learnpilot', inviteCode: 'Ahmed' },
  });
  check('admin login WITH code succeeds as ADMIN',
    withCode.status === 200 && String(withCode.json?.user?.role) === 'ADMIN' && !!withCode.json?.token,
    JSON.stringify(withCode.json));
  const adminToken = withCode.json?.token;

  // 7. A random code cannot onboard an admin
  const badSignup = await call('/auth/signup', {
    method: 'POST',
    body: {
      email: `adm-bad-${Date.now()}@example.com`, password: 'learnpilot',
      name: 'Bad Admin', role: 'admin', inviteCode: 'TOTALLY-WRONG',
    },
  });
  check('admin signup with a bogus code is refused', badSignup.status === 403, JSON.stringify(badSignup.json));

  // 8. Student / teacher logins are NOT invite-gated
  const studentLogin = await call('/auth/login', {
    method: 'POST', body: { email: 'student@learnpilot.dev', password: 'learnpilot' },
  });
  check('student login needs no code', studentLogin.status === 200, JSON.stringify(studentLogin.json));
  const teacherLogin = await call('/auth/login', {
    method: 'POST', body: { email: 'teacher@learnpilot.dev', password: 'learnpilot' },
  });
  check('teacher login needs no code', teacherLogin.status === 200, JSON.stringify(teacherLogin.json));

  // 9. Legacy seeded admin binds on first login with a usable code
  const legacyNoCode = await call('/auth/login', { method: 'POST', body: LEGACY_ADMIN });
  check('seeded admin login without code is refused', legacyNoCode.status === 400, JSON.stringify(legacyNoCode.json));
  const legacyWithCode = await call('/auth/login', {
    method: 'POST', body: { ...LEGACY_ADMIN, inviteCode: 'Ahmed' },
  });
  check('seeded admin binds with code "Ahmed" and signs in', legacyWithCode.status === 200,
    JSON.stringify(legacyWithCode.json));

  // 10. Admins cannot manage codes (owner-only)
  const adminList = await call('/owner/invite-codes', { token: adminToken });
  check('admin cannot list invite codes (403)', adminList.status === 403, JSON.stringify(adminList.json));

  // 11. A single-use code admits exactly one admin
  const second = await call('/auth/signup', {
    method: 'POST',
    body: {
      email: `adm-second-${Date.now()}@example.com`, password: 'learnpilot',
      name: 'Second Admin', role: 'admin', inviteCode: newCode,
    },
  });
  check('single-use code admits one admin', second.status === 201, JSON.stringify(second.json));
  const third = await call('/auth/signup', {
    method: 'POST',
    body: {
      email: `adm-third-${Date.now()}@example.com`, password: 'learnpilot',
      name: 'Third Admin', role: 'admin', inviteCode: newCode,
    },
  });
  check('exhausted single-use code is refused', third.status === 403, JSON.stringify(third.json));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
