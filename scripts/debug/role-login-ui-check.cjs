// Verifies the role-login fixes against the deployed bundle:
//  1. "Continue with Google" carries the selected role (?role=teacher|admin|owner)
//  2. "Autofill" fills the seeded demo credentials (…@learnpilot.dev / learnpilot)
//  3. "Sign in instantly" works from an empty form for every role
//  4. A mismatched account (student creds on /login/teacher) says so instead of
//     silently dumping the user on the student dashboard
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.SEED_PASSWORD || 'learnpilot';

async function fresh(page, path) {
  await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('   [pageerror]', e.message));

  // 1) Google OAuth start URL must be role-aware.
  for (const role of ['teacher', 'admin', 'owner', 'student']) {
    const seen = [];
    const handler = (route) => {
      seen.push(route.request().url());
      route.abort();
    };
    await page.route('**/api/v1/auth/google**', handler);
    await fresh(page, `/login/${role}`);
    await page.getByRole('button', { name: /continue with google/i }).first().click();
    await page.waitForTimeout(1200);
    console.log(`google[${role.padEnd(7)}] -> ${seen[0] || '(no request captured)'}`);
    await page.unroute('**/api/v1/auth/google**', handler);
  }

  // 2) Autofill must load the seeded demo account.
  for (const role of ['teacher', 'admin', 'owner']) {
    await fresh(page, `/login/${role}`);
    await page.getByRole('button', { name: /autofill/i }).first().click();
    await page.waitForTimeout(300);
    const email = await page.locator('input[type=email]').first().inputValue();
    const pw = await page.locator('input[type=password]').first().inputValue();
    console.log(`autofill[${role.padEnd(7)}] -> ${email} / ${pw}`);
  }

  // 3) Instant sign-in from an empty form, per role.
  for (const role of ['teacher', 'admin', 'owner', 'student']) {
    await fresh(page, `/login/${role}`);
    await page.getByRole('button', { name: /sign in instantly|دخول فوري/i }).first().click();
    await page.waitForTimeout(3500);
    const heading = await page.locator('h1, h2').first().textContent().catch(() => '');
    console.log(`instant[${role.padEnd(7)}] -> ${page.url()} heading="${(heading || '').trim().slice(0, 40)}"`);
  }

  // 4) Mismatched account: student credentials typed on the teacher page.
  await fresh(page, '/login/teacher');
  await page.locator('input[type=email]').first().fill('student@learnpilot.dev');
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.locator('button[type=submit]').first().click();
  await page.waitForTimeout(1500);
  const alert = await page.locator('[role=alert]').first().textContent().catch(() => '(none)');
  console.log(`mismatch alert  -> ${(alert || '').trim()}`);
  await page.waitForTimeout(3000);
  console.log(`mismatch end    -> ${page.url()}`);

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});