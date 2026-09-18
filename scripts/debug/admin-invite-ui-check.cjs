// Live UI check for the Admin invite / security code gate (deployed bundle).
//   node scripts/debug/admin-invite-ui-check.cjs
const { chromium } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = process.env.SEED_PASSWORD || 'learnpilot';
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

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('   [pageerror]', e.message));
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      console.log('   [api-error]', res.status(), new URL(res.url()).pathname);
    }
  });

  // ── /login/admin: invite field present, Google hidden, Autofill fills the code
  await fresh(page, '/login/admin');
  const inviteField = page.locator('input[type="text"]').first();
  check('admin page shows the invite field', await inviteField.count() > 0);
  check('admin page hides "Continue with Google"',
    (await page.getByRole('button', { name: /continue with google/i }).count()) === 0);

  await page.getByRole('button', { name: /autofill|تعبئة تلقائية/i }).first().click();
  await page.waitForTimeout(300);
  check('autofill sets the admin email',
    (await page.locator('input[type=email]').first().inputValue()) === 'admin@learnpilot.dev');
  check('autofill sets the demo invite code to "Ahmed"',
    (await inviteField.inputValue()) === 'Ahmed', await inviteField.inputValue());

  // ── Sign in with the code lands on the admin dashboard
  await page.getByRole('button', { name: /^sign in$|تسجيل الدخول/i }).first().click();
  await page.waitForURL((url) => url.pathname === '/admin', { timeout: 15000 });
  check('admin signs in with the code and lands on /admin', new URL(page.url()).pathname === '/admin', page.url());

  // ── Missing code is refused in the UI
  await fresh(page, '/login/admin');
  await page.locator('input[type=email]').first().fill('admin@learnpilot.dev');
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /^sign in$|تسجيل الدخول/i }).first().click();
  await page.waitForTimeout(2500);
  const alertText = (await page.locator('[role=alert]').first().textContent().catch(() => '')) || '';
  check('submitting without a code is blocked in the UI',
    page.url().includes('/login/admin') && alertText.trim().length > 0, `${page.url()} "${alertText.trim()}"`);

  // ── Wrong code is refused by the API and surfaced
  await inviteField.fill('WRONG-CODE');
  await page.getByRole('button', { name: /^sign in$|تسجيل الدخول/i }).first().click();
  await page.waitForTimeout(3000);
  const alertText2 = (await page.locator('[role=alert]').first().textContent().catch(() => '')) || '';
  check('wrong code is refused with a message',
    page.url().includes('/login/admin') && alertText2.trim().length > 0, `"${alertText2.trim()}"`);

  // ── Teacher / owner pages are not invite-gated and keep Google
  await fresh(page, '/login/teacher');
  check('teacher page has no invite field', (await page.locator('input[type="text"]').count()) === 0);
  check('teacher page keeps "Continue with Google"',
    (await page.getByRole('button', { name: /continue with google/i }).count()) > 0);
  await fresh(page, '/login/owner');
  check('owner page has no invite field', (await page.locator('input[type="text"]').count()) === 0);

  // ─ Owner dashboard lists the invite codes (real API)
  await fresh(page, '/login/owner');
  await page.getByRole('button', { name: /sign in instantly|دخول فوري/i }).first().click();
  await page.waitForURL((url) => url.pathname === '/owner', { timeout: 15000 });
  check('owner signs in', new URL(page.url()).pathname === '/owner', page.url());
  await page.goto(`${BASE}/owner/access`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = (await page.locator('body').textContent()) || '';
  check('owner access page shows the invite-code card', /invite \/ security codes|رموز دعوة/i.test(body));
  check('the fixed code "Ahmed" is listed for the owner', body.includes('Ahmed'));
  check('admin↔code binding table is shown', /Admins and their security codes|المديرون ورموز الأمان/i.test(body));

  // ── The Owner can mint a new code from the UI (POST through nginx → API)
  const brandNew = `UI-${Date.now().toString(36).toUpperCase()}`;
  await page.getByPlaceholder('Ahmed').first().fill(brandNew);
  await page.getByRole('button', { name: /create code|إنشاء رمز/i }).first().click();
  await page.waitForTimeout(3000);
  const after = (await page.locator('body').textContent()) || '';
  check('owner creates a new code from the UI and it appears in the list',
    after.includes(brandNew), brandNew);

  // Register through the actual UI using the newly issued single-use code.
  const ownerToken = await page.evaluate(() => localStorage.getItem('lp-auth-token'));
  await fresh(page, '/login/admin');
  await page.getByRole('tab').nth(1).click();
  const signupForm = page.locator('form').filter({ has: page.locator('input[autocomplete="name"]') });
  const email = `ui-invite-${Date.now()}@example.com`;
  await signupForm.locator('input[autocomplete="name"]').fill('UI Invited Admin');
  await signupForm.locator('input[type=email]').fill(email);
  await signupForm.locator('input[type=password]').fill(PASSWORD);
  await signupForm.locator('input[autocomplete="off"]').fill(brandNew);
  const signupResponse = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/auth/signup');
  await signupForm.locator('button[type=submit]').click();
  const response = await signupResponse;
  const payload = response.request().postDataJSON();
  const result = await response.json();
  check('signup request forwards the issued code and admin role', payload.inviteCode === brandNew && payload.role === 'admin');
  check('signup creates an ADMIN account', response.status() === 201 && result.user?.role === 'ADMIN');
  await page.waitForURL((url) => url.pathname === '/admin', { timeout: 15000 });
  check('new admin reaches the exact admin dashboard', new URL(page.url()).pathname === '/admin');
  const inventory = await page.request.get(`${BASE}/api/v1/owner/invite-codes`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const stored = await inventory.json();
  check('issued code is consumed once', stored.codes?.some((c) => c.code === brandNew && c.uses === 1));
  check('new account is linked to the issued code', stored.admins?.some((a) => a.email === email && a.inviteCode?.code === brandNew));
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();