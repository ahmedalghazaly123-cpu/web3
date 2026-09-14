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

async function expandElevatedRoles(page: any) {
  // Admin / Owner cards live inside a collapsed "More account types" section.
  const toggle = page.getByRole('button', { name: /more account types/i });
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForTimeout(300);
  }
}

async function clickRoleCard(page: any, role: string) {
  // Role cards are <button role="listitem">, so match by tag + text, not role=button.
  const roleBtn = page.locator('button').filter({ hasText: new RegExp(role, 'i') }).first();
  await roleBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await roleBtn.click({ force: true });
}

test.describe('Role Enforcement', () => {
  test('student cannot access admin page', async ({ page }) => {
    const { email, password } = await createTestUser('student');
    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await clickRoleCard(page, 'Student');
    await page.waitForURL(/\/login\/student$/, { timeout: 10000 });
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('admin can access admin page', async ({ page }) => {
    const { email, password } = await createTestUser('admin');
    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await expandElevatedRoles(page);
    await clickRoleCard(page, 'Admin');
    await page.waitForURL(/\/login\/admin$/, { timeout: 10000 });
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('student cannot access teacher page', async ({ page }) => {
    const { email, password } = await createTestUser('student');
    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await clickRoleCard(page, 'Student');
    await page.waitForURL(/\/login\/student$/, { timeout: 10000 });
    await page.getByLabel(/Email address/).fill(email);
    await page.getByLabel(/Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/teacher');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});