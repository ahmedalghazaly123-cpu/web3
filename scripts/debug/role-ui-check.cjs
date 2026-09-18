// E2E diagnostic: full click-path (account-type -> role card -> login) for every role.
// Prints the landing URL and the rendered page heading so we can tell whether the
// role dashboard really opens (not just the URL).
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.SEED_PASSWORD || 'learnpilot';
const ROLES = ['student', 'teacher', 'admin', 'owner'];
const ELEVATED = ['admin', 'owner'];

const navTargets = {
  student: '/dashboard',
  teacher: '/teacher',
  admin: '/admin',
  owner: '/owner',
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('   [pageerror]', e.message));

  for (const role of ROLES) {
    await page.context().clearCookies();
    await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });

    if (ELEVATED.includes(role)) {
      const toggle = page.getByRole('button', { name: /more account types|المزيد من أنواع الحسابات/i });
      if (await toggle.count()) {
        await toggle.first().click();
        await page.waitForTimeout(400);
      }
    }
    const card = page.locator('button').filter({ hasText: new RegExp(role, 'i') }).first();
    await card.scrollIntoViewIfNeeded();
    await card.click();

    const waitForUrl = await page
      .waitForURL(new RegExp(`/login/${role}$`), { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!waitForUrl) {
      console.log(`${role.padEnd(8)} card -> did not reach /login/${role} (now ${page.url()})`);
      continue;
    }

    await page.locator('input[type=email]').first().fill(`${role}@learnpilot.dev`);
    await page.locator('input[type=password]').first().fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    await page.waitForTimeout(3000);

    const heading = await page
      .locator('h1, h2')
      .first()
      .textContent()
      .catch(() => '(no heading)');
    console.log(`${role.padEnd(8)} card -> ${page.url()}  heading="${(heading || '').trim().slice(0, 60)}"`);
  }

  // Direct route checks with the last session (owner).
  for (const [role, target] of Object.entries(navTargets)) {
    await page.goto(`${BASE}${target}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const heading = await page
      .locator('h1, h2')
      .first()
      .textContent()
      .catch(() => '(no heading)');
    console.log(`direct ${target.padEnd(11)} (as ${role}) -> ${page.url()}  heading="${(heading || '').trim().slice(0, 60)}"`);
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});