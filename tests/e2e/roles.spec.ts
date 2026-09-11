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

test.describe('Role Enforcement', () => {
  test('student cannot access admin page', async ({ page }) => {
    const { email, password } = await createTestUser('student');
    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /student/i }).click();
    await page.waitForURL('**/login/student');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('**/dashboard');

    await page.goto('/admin');
    await expect(page).toHaveURL('**/dashboard');
  });

  test('admin can access admin page', async ({ page }) => {
    const { email, password } = await createTestUser('admin');
    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.waitForURL('**/login/admin');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('**/admin');
  });

  test('student cannot access teacher page', async ({ page }) => {
    const { email, password } = await createTestUser('student');
    await page.goto('/account-type');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /student/i }).click();
    await page.waitForURL('**/login/student');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('**/dashboard');

    await page.goto('/teacher');
    await expect(page).toHaveURL('**/dashboard');
  });
});
