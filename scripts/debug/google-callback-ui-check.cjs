// End-to-end check of the Google OAuth landing page (/auth/google/callback):
// fetch a real token per role, open the callback URL the way Google would, and
// confirm the app lands on that role's dashboard.
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API = process.env.API_URL || 'http://localhost:4000';
const PASSWORD = process.env.SEED_PASSWORD || 'learnpilot';
const EXPECT = { student: '/dashboard', teacher: '/teacher', admin: '/admin', owner: '/owner' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [role, path] of Object.entries(EXPECT)) {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${role}@learnpilot.dev`, password: PASSWORD }),
    });
    const { token } = await res.json();
    await page.goto(`${BASE}/account-type`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/auth/google/callback?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const heading = await page.locator('h1, h2').first().textContent().catch(() => '');
    console.log(`callback[${role.padEnd(7)}] expected=${path.padEnd(10)} got=${page.url()} heading="${(heading || '').trim().slice(0, 40)}"`);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});