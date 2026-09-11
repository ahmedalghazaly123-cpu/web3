import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'LearnPilot' })).toBeVisible();
  });

  test('account type page loads', async ({ page }) => {
    await page.goto('/account-type');
    await expect(page.getByText(/choose your account type/i)).toBeVisible();
  });
});
