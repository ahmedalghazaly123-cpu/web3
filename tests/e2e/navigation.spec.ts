import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    // Landing header brand (a real link back to `/`).
    await expect(page.getByRole('link', { name: /LearnPilot/ }).first()).toBeVisible();
  });

  test('account type page loads', async ({ page }) => {
    await page.goto('/account-type');
    await expect(page.getByText(/choose your account type/i)).toBeVisible();
  });
});
