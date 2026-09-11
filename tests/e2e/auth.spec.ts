import { test, expect } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000';

async function createTestUser(role: 'student' | 'teacher' | 'admin' | 'owner', password = 'TestPass123!') {
  const email = `e2e-${role}-${Date.now()}@example.com`;
  const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: `E2E ${role}`, role }),
  });
  if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
  const data = await res.json();
  return { email, password, token: data.token, userId: data.user.id };
}

async function clickRoleCard(page: any, role: string) {
  const roleBtn = page.locator(`button`).filter({ hasText: new RegExp(role, 'i') }).first();
  await roleBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await roleBtn.click({ force: true });
}

test.describe('Registration', () => {
  test('student can register through UI and is authenticated', async ({ page }) => {
    const email = `reg-student-${Date.now()}@example.com`;
    const password = 'TestPass123!';
    const name = `Student ${Date.now()}`;

    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');

    await clickRoleCard(page, 'Student');
    await page.waitForURL('**/login/student');

    await page.getByRole('tab', { name: /Create account/i }).click();
    await page.getByLabel(/name/i).fill(name);
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('Login', () => {
  test('student can login through UI', async ({ page }) => {
    const { email, password } = await createTestUser('student');

    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await clickRoleCard(page, 'Student');
    await page.waitForURL('**/login/student');

    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('admin can login through UI', async ({ page }) => {
    const { email, password } = await createTestUser('admin');

    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /More account types/i }).click();
    await clickRoleCard(page, 'Admin');
    await page.waitForURL('**/login/admin');

    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe('Logout', () => {
  test('user can logout through UI', async ({ page }) => {
    const { email, password } = await createTestUser('student');

    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await clickRoleCard(page, 'Student');
    await page.waitForURL('**/login/student');
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    await page.locator('button[aria-label="Profile"]').click();
    await page.getByRole('menuitem', { name: /Log out/i }).click();
    await page.waitForURL('**/account-type', { timeout: 10000 });
    await expect(page).toHaveURL(/\/account-type$/);
  });
});

test.describe('Navigation', () => {
  test('major navigation links work', async ({ page }) => {
    const { email, password } = await createTestUser('student');

    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await clickRoleCard(page, 'Student');
    await page.waitForURL('**/login/student');
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    const links = [
      { name: /Courses/i, url: '**/courses' },
      { name: /Progress/i, url: '**/progress' },
      { name: /Search/i, url: '**/search' },
      { name: /Settings/i, url: '**/settings' },
      { name: /Profile/i, url: '**/profile' },
    ];

    const sidebar = page.locator('aside[aria-label="LearnPilot"]');
    for (const link of links) {
      await sidebar.getByRole('link', { name: link.name }).click();
      await page.waitForURL(link.url, { timeout: 10000 });
      await expect(page).toHaveURL(new RegExp(`${link.url.replace(/\*\*/g, '.*')}$`));
    }
  });
});
