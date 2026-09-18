// Read-only UI regression apart from ordinary demo sign-in sessions.
const { chromium, expect } = require('@playwright/test');
const base = process.env.BASE_URL || 'http://localhost:3000';
const homes = { student: '/dashboard', teacher: '/teacher', admin: '/admin', owner: '/owner' };
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const [role, home] of Object.entries(homes)) {
      // Keep the prior session to catch the original unwanted student redirect.
      await page.goto(`${base}/account-type`);
      if (['admin', 'owner'].includes(role)) {
        // Elevated roles are hidden now — reveal via the Win+Shift+Q shortcut
        // (dispatched directly, since the OS can swallow a real Meta press)
        // or by typing the secret keyword.
        await page.evaluate(() =>
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'q', metaKey: true, shiftKey: true, bubbles: true }),
          ),
        );
        // Owner iteration: use the secret keyword path this time to cover it.
        if (role === 'owner') {
          await page.keyboard.type('admin', { delay: 30 });
        }
      }
      const selector = 'button[role="listitem"], #elevated-roles button';
      const index = Object.keys(homes).indexOf(role);
      console.log(`CLICK role=${role} selector=${selector} index=${index}`);
      await page.locator(selector).nth(index).click({ timeout: 60000 });
      await expect(page).toHaveURL(`${base}/login/${role}`);
      await page.getByRole('button', { name: /sign in instantly|دخول فوري/i }).click();
      await expect(page).toHaveURL(`${base}${home}`, { timeout: 20000 });
      await expect(page.locator('h1').first()).toBeVisible();
      console.log(`PASS ${role}: ${home}, heading=${await page.locator('h1').first().innerText()}`);
      await page.reload();
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page).toHaveURL(`${base}${home}`);
      console.log(`PASS ${role}: session restored after reload`);
    }
    await page.goto(`${base}/auth/set-password`);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(2);
    console.log('PASS password setup page renders');
    expect(errors).toEqual([]);
    console.log('ROLE_UI_CHECKS_PASSED');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
