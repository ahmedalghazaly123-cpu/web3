// Live end-to-end check of "one account per person" on the deployed site:
//
//   social first sign-in ─▶ /auth/set-password ─▶ password stored once in the DB
//                                              ─▶ manual e-mail + password sign-in
//                                              ─▶ the setup link can never be replayed
//
// The Google/GitHub/Apple → set-password redirect itself is covered by
// server/tests/google-oauth.test.ts (real provider callbacks, mocked HTTP).
// Here we mint the *exact same* scoped token the server mints (HMAC over
// `scope:payload` with SESSION_SECRET taken from the running container) so the
// deployed browser bundle, the deployed API and the live database are exercised
// together — no real Google consent screen required.
//
//   node scripts/debug/social-onboarding-live-check.cjs
const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API = process.env.API_URL || 'http://localhost:3000/api/v1';
const SERVER_CONTAINER = 'learnpilot-server';
const DB_CONTAINER = 'learnpilot-postgres';
const SCOPE = 'set-password';
const PASSWORD = process.env.CHECK_PASSWORD || 'ChosenOnce123';

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};

const docker = (args) => {
  const res = spawnSync('docker', args, { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr || `docker ${args.join(' ')} failed`);
  return (res.stdout || '').trim();
};

/** The secret the deployed API actually signs with. */
const sessionSecret = () =>
  process.env.SESSION_SECRET
  || docker(['exec', SERVER_CONTAINER, 'printenv', 'SESSION_SECRET'])
  || 'dev-secret';

const sql = (statement) =>
  docker(['exec', '-i', DB_CONTAINER, 'psql', '-U', 'learnpilot', '-d', 'learnpilot', '-tAc', statement]);

const mintScopeToken = (userId) => {
  const payload = Buffer.from(JSON.stringify({
    userId, scope: SCOPE, exp: Date.now() + 15 * 60 * 1000,
  })).toString('base64');
  const sig = crypto.createHmac('sha256', sessionSecret())
    .update(`${SCOPE}:${payload}`).digest('base64');
  return `${payload}.${sig}`;
};

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, json, text };
}

const getMe = async (token) => {
  const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => null);
  return { status: res.status, user: body?.user ?? body };
};

(async () => {
  const stamp = Date.now();
  const email = `social-first-${stamp}@example.com`;
  const name = 'Social First Probe';
  console.log(`secret from container: ${sessionSecret().slice(0, 12)}…`);

  // ── 0. Seed a "signed up with Google" account: no password yet ─────────────
  const userIdRaw = sql(
    `INSERT INTO users (id, email, name, role, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), '${email}', '${name}', 'STUDENT', now(), now())
     RETURNING id`,
  );
  const userId = (userIdRaw.match(/[0-9a-f-]{36}/i) || [])[0] || '';
  check('seeded a social-first account with no password', /^[0-9a-f-]{36}$/i.test(userId), userIdRaw);
  const beforeHash = sql(`SELECT coalesce("passwordHash", '<null>') FROM users WHERE id = '${userId}'`);
  check('the account starts without a stored password', beforeHash === '<null>', beforeHash);

  // ── 1. The setup token is scoped: it can never act as a session ────────────
  const setupToken = mintScopeToken(userId);
  const scoped = await getMe(setupToken);
  check('the setup token is refused as a session token', scoped.status === 401, `${scoped.status}`);

  // ── 2. The deployed setup page renders for a passwordless account ──────────
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/auth/set-password?token=${encodeURIComponent(setupToken)}&provider=google`,
    { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form', { timeout: 20000 });
  const pwFields = await page.locator('input[type="password"]').count();
  check('the setup page asks for the new password twice', pwFields === 2, `found ${pwFields}`);

  // ── 3. Saving stores the chosen password once and opens a real session ─────
  const inputs = page.locator('input[type="password"]');
  await inputs.nth(0).fill(PASSWORD);
  await inputs.nth(1).fill(PASSWORD);
  const setResponse = page.waitForResponse(
    (r) => r.url().includes('/auth/set-password') && r.request().method() === 'POST',
    { timeout: 20000 },
  );
  await page.locator('form').first().locator('button[type=submit]').click();
  const saved = await setResponse;
  check('POST /auth/set-password succeeds', saved.status() === 200, `${saved.status()}`);
  // The browser navigates away to the dashboard right after the save, so the
  // request body must be captured before its response body.
  const savedBody = await saved.request().response().then((r) => r.json()).catch(() => null);
  const savedToken = savedBody?.token;
  check('the setup response grants a dashboard session token', typeof savedToken === 'string',
    JSON.stringify(savedBody)?.slice(0, 80));


  const hash = sql(`SELECT "passwordHash" FROM users WHERE id = '${userId}'`);
  check('the chosen password is hashed in the database', /^\$2[aby]\$/.test(hash), hash.slice(0, 10));
  const setAt = sql(`SELECT "passwordSetAt" IS NOT NULL FROM users WHERE id = '${userId}'`);
  check('passwordSetAt records that setup happened', setAt === 't', setAt);

  const session = await getMe(savedToken);
  check('the account can now open a dashboard session',
    session.status === 200 && session.user?.email === email, `${session.status}`);

  // ── 4. Google really is wired up on this deployment ───────────────────────
  const providersRes = await fetch(`${API}/auth/providers`);
  const providers = await providersRes.json();
  console.log(`   providers: ${JSON.stringify(providers)}`);
  check('the deployed API reports Google OAuth as configured', providers.google === true,
    JSON.stringify(providers));

  // ── 5. Manual e-mail + password sign-in on the real login page ────────────
  await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/login/student`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form', { timeout: 20000 });
  await page.locator('input[type=email]').first().fill(email);
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.locator('form').first().locator('button[type=submit]').click();
  await page.waitForURL((u) => u.pathname === '/dashboard', { timeout: 20000 });
  check('manual sign-in with the chosen password reaches /dashboard',
    new URL(page.url()).pathname === '/dashboard', page.url());

  const apiLogin = await postJson(`${API}/auth/login`, { email, password: PASSWORD });
  check('the API accepts the same e-mail + password', apiLogin.status === 200, `${apiLogin.status}`);
  const apiWrong = await postJson(`${API}/auth/login`, { email, password: 'definitely-wrong' });
  check('a wrong password is refused with 401', apiWrong.status === 401, `${apiWrong.status}`);

  // ── 6. The password is set exactly once ───────────────────────────────────
  const replay = await postJson(`${API}/auth/set-password`, { token: setupToken, password: 'AnotherPass123' });
  check('a second setup attempt is refused (password-already-set)',
    replay.status === 409, `${replay.status} ${JSON.stringify(replay.json)}`);
  const stillWorks = await postJson(`${API}/auth/login`, { email, password: PASSWORD });
  check('the password chosen on the setup page is still the valid one',
    stillWorks.status === 200, `${stillWorks.status}`);

  check('no page errors during onboarding', pageErrors.length === 0, pageErrors.join(' | '));
  await browser.close();

  // ── cleanup the probe account so the database stays tidy ──────────────────
  sql(`DELETE FROM sessions WHERE "userId" = '${userId}'`);
  sql(`DELETE FROM audit_logs WHERE "targetId" = '${userId}'`);
  sql(`DELETE FROM users WHERE id = '${userId}'`);
  console.log(`   cleaned up probe account ${email}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
