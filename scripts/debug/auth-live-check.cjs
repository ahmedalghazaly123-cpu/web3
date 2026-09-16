/**
 * Live end-to-end check of the auth flow against the running API.
 * Verifies: signup -> token -> /me -> login -> logout -> guards (dup e-mail,
 * weak password, wrong password) and that Google OAuth is actually configured
 * (the /auth/google start route must hand back a real accounts.google.com URL).
 * Usage: node scripts/debug/auth-live-check.cjs [baseUrl]
 */
'use strict';
const BASE = (process.argv[2] || 'http://localhost:4000').replace(/\/$/, '');
const API = `${BASE}/api/v1/auth`;

let pass = 0;
let fail = 0;
const check = (ok, label, extra = '') => {
  if (ok) {
    pass++;
    console.log(`PASS  ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
  }
};

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

(async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `axcheck-student-${stamp}@example.com`;
  const password = 'StudentPass123!';

  // 1) signup
  const su = await req('/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Auth Check', role: 'student' }),
  });
  check(su.status === 201 && !!su.body?.token, 'signup returns 201 + token', `status=${su.status}`);
  check(String(su.body?.user?.role).toUpperCase() === 'STUDENT', 'signup persists role=STUDENT', `role=${su.body?.user?.role}`);
  const token = su.body?.token;

  // 2) /me with the issued token
  const me = await req('/me', { headers: { Authorization: `Bearer ${token}` } });
  check(me.status === 200 && me.body?.user?.email === email, 'GET /me resolves the session', `status=${me.status} email=${me.body?.user?.email}`);

  // 3) duplicate e-mail is rejected
  const dup = await req('/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Auth Check', role: 'student' }),
  });
  check(dup.status === 409, 'duplicate signup -> 409 email-taken', `status=${dup.status} error=${dup.body?.error}`);

  // 4) weak password is rejected
  const weak = await req('/signup', {
    method: 'POST',
    body: JSON.stringify({ email: `weak-${stamp}@example.com`, password: 'short', name: 'Weak', role: 'student' }),
  });
  check(weak.status === 400, 'weak password -> 400 password-too-weak', `status=${weak.status} error=${weak.body?.error}`);

  // 5) login with the same credentials
  const li = await req('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  check(li.status === 200 && !!li.body?.token, 'login returns 200 + token', `status=${li.status}`);

  // 6) wrong password is rejected
  const bad = await req('/login', { method: 'POST', body: JSON.stringify({ email, password: 'WrongPass123!' }) });
  check(bad.status === 401, 'wrong password -> 401', `status=${bad.status} error=${bad.body?.error}`);

  // 7) unauthenticated /me is rejected
  const anon = await req('/me');
  check(anon.status === 401 || anon.status === 403, 'GET /me without token -> 401/403', `status=${anon.status}`);

  // 8) logout invalidates the session server-side
  const lo = await req('/logout', { method: 'POST', headers: { Authorization: `Bearer ${li.body?.token}` } });
  check(lo.status === 200 || lo.status === 204, 'logout succeeds', `status=${lo.status}`);
  const meAfter = await req('/me', { headers: { Authorization: `Bearer ${li.body?.token}` } });
  check(meAfter.status === 401 || meAfter.status === 403, 'token is dead after logout', `status=${meAfter.status}`);

  // 9) Google OAuth is configured (start route must build a real Google URL)
  const g = await fetch(`${API}/google`, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  const loc = g.headers.get('location') || '';
  const googleOk = (g.status === 302 || g.status === 301) && loc.includes('accounts.google.com');
  if (googleOk) {
    const u = new URL(loc);
    check(true, 'Google OAuth configured -> redirect to accounts.google.com', `client_id=${u.searchParams.get('client_id')}`);
    check(u.searchParams.get('redirect_uri') === `${BASE}/api/v1/auth/google/callback`, 'OAuth redirect_uri points back at the API', u.searchParams.get('redirect_uri'));
  } else {
    check(false, 'Google OAuth start redirects to accounts.google.com', `status=${g.status} location=${loc.slice(0, 90)}`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('auth-live-check error:', e.message);
  process.exit(1);
});