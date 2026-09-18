const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  for (const role of ['teacher', 'admin', 'owner']) {
    await page.context().clearCookies();
    await page.goto(`http://localhost:3000/login/${role}`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type=email]', `${role}@learnpilot.dev`);
    await page.fill('input[type=password]', 'learnpilot');
    await page.click('button[type=submit]');
    await page.waitForTimeout(3500);
    console.log(role, '=>', page.url());
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
