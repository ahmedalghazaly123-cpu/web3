// Live UI check: create an account, then sign in manually with email + password.
// Runs against the deployed site (nginx on :3000) so it exercises the real path
// the browser uses.
//   node scripts/debug/signup-login-ui-check.cjs
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.CHECK_PASSWORD || 'ProbePass123';
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};

async function fresh(page, path) {
  await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
}

async function openSignup(page) {
  const tab = page.getByRole('tab').nth(1);
  if (await tab.count()) await tab.click();
  await page.waitForTimeout(200);
}

async function createAccount(page, { name, email, password, code }) {
  await openSignup(page);
  const form = page.locator('form').filter({ has: page.locator('input[autocomplete="name"]') });
  await form.locator('input[autocomplete="name"]').fill(name);
  await form.locator('input[type=email]').fill(email);
  await form.locator('input[type=password]').fill(password);
  if (code) await form.locator('input[autocomplete="off"]').fill(code);
  await form.locator('button[type=submit]').click();
}

async function manualSignIn(page, { email, password, code }) {
  const form = page.locator('form').filter({ has: page.locator('input[type=email]') }).first();
  await form.locator('input[type=email]').fill(email);
  await form.locator('input[type=password]').fill(password);
  if (code) await form.locator('input[autocomplete="off"]').fill(code);
  await form.locator('button[type=submit]').click();
}

const alertText = async (page) =>
  (await page.locator('[role=alert]').first().textContent().catch(() => '')) || '';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const stamp = Date.now();
  page.on('pageerror', (e) => console.log('   [pageerror]', e.message));
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      console.log('   [api-error]', res.status(), new URL(res.url()).pathname);
    }
  });

  // ── 1. Student: create the account in the UI, then sign in manually ────────
  const student = `ui-student-${stamp}@example.com`;
  await fresh(page, '/login/student');
  await createAccount(page, { name: 'UI Student', email: student, password: PASSWORD });
  await page.waitForURL((u) => u.pathname === '/dashboard', { timeout: 20000 });
  check('student account created from the UI lands on /dashboard',
    new URL(page.url()).pathname === '/dashboard', page.url());

  await fresh(page, '/login/student');
  await manualSignIn(page, { email: student, password: PASSWORD });
  await page.waitForURL((u) => u.pathname === '/dashboard', { timeout: 20000 });
  check('student signs in manually with email + password',
    new URL(page.url()).pathname === '/dashboard', page.url());

  // ─ 2. Teacher: same story ────────────────────────────────────────────────
  const teacher = `ui-teacher-${stamp}@example.com`;
  await fresh(page, '/login/teacher');
  await createAccount(page, { name: 'UI Teacher', email: teacher, password: PASSWORD });
  await page.waitForURL((u) => u.pathname === '/teacher', { timeout: 20000 });
  check('teacher account created from the UI lands on /teacher',
    new URL(page.url()).pathname === '/teacher', page.url());

  await fresh(page, '/login/teacher');
  await manualSignIn(page, { email: teacher, password: PASSWORD });
  await page.waitForURL((u) => u.pathname === '/teacher', { timeout: 20000 });
  check('teacher signs in manually with email + password',
    new URL(page.url()).pathname === '/teacher', page.url());

  // ── 3. Admin: invite/security code required on create AND on sign-in ───────
  const admin = `ui-admin-${stamp}@example.com`;
  await fresh(page, '/login/admin');
  await createAccount(page, { name: 'UI Admin', email: admin, password: PASSWORD, code: 'Ahmed' });
  await page.waitForURL((u) => u.pathname === '/admin', { timeout: 20000 });
  check('admin account created in the UI with the code "Ahmed"',
    new URL(page.url()).pathname === '/admin', page.url());

  await fresh(page, '/login/admin');
  await manualSignIn(page, { email: admin, password: PASSWORD, code: 'Ahmed' });
  await page.waitForURL((u) => u.pathname === '/admin', { timeout: 20000 });
  check('admin signs in manually with email + password + code',
    new URL(page.url()).pathname === '/admin', page.url());

  // ── 4. Empty form is refused with a message (no silent no-op) ─────────────
  await fresh(page, '/login/student');
  await page.locator('form').first().locator('button[type=submit]').click();
  await page.waitForTimeout(1200);
  const emptyMsg = await alertText(page);
  check('empty sign-in form shows an error instead of doing nothing',
    page.url().includes('/login/student') && emptyMsg.trim().length > 0, `"${emptyMsg.trim()}"`);

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });