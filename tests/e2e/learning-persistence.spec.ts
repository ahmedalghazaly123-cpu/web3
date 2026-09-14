import { test, expect, type Page } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';

async function createTestUser(
  role: 'student' | 'teacher' | 'admin' | 'owner',
  password = 'TestPass123!',
) {
  const email = `learn-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: `Learn E2E ${role}`, role }),
  });
  if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
  const data = await res.json();
  return { email, password, token: data.token, userId: data.user.id };
}

async function clickRoleCard(page: Page, role: string) {
  const roleBtn = page.locator('button').filter({ hasText: new RegExp(role, 'i') }).first();
  await roleBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await roleBtn.click({ force: true });
}

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/account-type');
  await page.waitForLoadState('networkidle');

  await clickRoleCard(page, 'Student');
  await page.waitForURL('**/login/student', { timeout: 10000 });

  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel(/Password/i).first().fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function selectFirstOption(page: Page) {
  await page.evaluate(() => {
    const input = document.querySelector('input[name="quiz-answer"]');
    const label = input ? (input as HTMLElement).closest('label') : null;
    if (label) (label as HTMLElement).click();
  });
}

async function runQuizToSubmission(page: Page) {
  await page.getByRole('button', { name: /Start Quiz/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: /Start Quiz/i }).click();

  for (let round = 0; round < 15; round++) {
    if (page.url().includes('/results/')) break;

    const optionInput = page.locator('input[name="quiz-answer"]').first();
    try {
      await optionInput.waitFor({ state: 'attached', timeout: 5000 });
    } catch {
      if (page.url().includes('/results/')) break;
      throw new Error('Quiz options not found and not on results page');
    }

    await selectFirstOption(page);
    await page.waitForTimeout(300);

    if (page.url().includes('/results/')) break;

    const submitBtn = page.getByRole('button', { name: /submit/i, exact: false }).last();
    const nextBtn = page.getByRole('button', { name: /next/i, exact: false }).last();

    const [hasSubmit, hasNext] = await Promise.all([
      submitBtn.isVisible().catch(() => false),
      nextBtn.isVisible().catch(() => false),
    ]);

    if (hasSubmit) {
      await submitBtn.evaluate((el) => (el as HTMLElement).click());
    } else if (hasNext) {
      await nextBtn.evaluate((el) => (el as HTMLElement).click());
    }
    await page.waitForTimeout(500);
  }

  await page.waitForURL(/\/results\//, { timeout: 10000 });
}

async function waitForEvents(
  token: string,
  predicate: (events: Array<{ kind: string; clientKey?: string; payload?: unknown }>) => boolean,
  maxWait = 10000,
): Promise<Array<{ kind: string; clientKey?: string; payload?: unknown }>> {
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_URL}/learning/events?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { events } = await res.json() as {
        events: Array<{ kind: string; clientKey?: string; payload?: unknown }>;
      };
      if (predicate(events)) return events;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for events after ${maxWait}ms`);
}

test.describe('Learning Persistence', () => {
  let userData: { email: string; password: string; token: string; userId: string };

  test.beforeEach(async ({ page }) => {
    userData = await createTestUser('student');
  });

  test('quiz submission persists to backend and survives reload', async ({ page }) => {
    test.setTimeout(90000);
    await loginViaUI(page, userData.email, userData.password);

    await page.goto('/assessment/calculus-1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/assessment\/calculus-1$/, { timeout: 10000 });

    await runQuizToSubmission(page);

    const events = await waitForEvents(
      userData.token,
      (evs) => evs.some((e) => e.kind === 'QUIZ_SUBMITTED'),
    );
    const submittedEvent = events.find((e) => e.kind === 'QUIZ_SUBMITTED');
    expect(submittedEvent, 'Quiz-submitted event should be persisted in the backend').toBeTruthy();

    const progressRes = await fetch(`${API_URL}/learning/progress`, {
      headers: { Authorization: `Bearer ${userData.token}` },
    });
    expect(progressRes.ok).toBe(true);
    const progress = await progressRes.json() as { eventCount: number; masteryPercent?: number };
    expect(progress.eventCount).toBeGreaterThanOrEqual(1);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/results\//, { timeout: 10000 });

    const scoreEl = page.locator('text=/[0-9]+%/').first();
    await expect(scoreEl).toBeVisible({ timeout: 10000 });
    const displayedScore = await scoreEl.textContent();
    expect(displayedScore).toMatch(/[0-9]+%/);
  });

  test('learning events are idempotent — POST twice returns same event', async () => {
    test.setTimeout(90000);
    const event = {
      kind: 'QUIZ_SUBMITTED',
      source: 'STUDENT',
      happenedAt: new Date().toISOString(),
      nodeId: 'concept-limits',
      nodeType: 'CONCEPT',
      assessmentId: 'calculus-1',
      payload: { score: 75, total: 4, correct: 3 },
      clientKey: `idempotency-test-${Date.now()}`,
    };

    const first = await fetch(`${API_URL}/learning/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userData.token}` },
      body: JSON.stringify(event),
    });
    expect(first.status).toBe(201);
    const firstData = await first.json() as { event: { id: string }; duplicate: boolean };
    expect(firstData.duplicate).toBe(false);

    const second = await fetch(`${API_URL}/learning/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userData.token}` },
      body: JSON.stringify(event),
    });
    expect(second.status).toBe(200);
    const secondData = await second.json() as { event: { id: string }; duplicate: boolean };
    expect(secondData.duplicate).toBe(true);
    expect(secondData.event.id).toBe(firstData.event.id);
  });

  test('planner persists toggled completion and survives reload', async ({ page }) => {
    test.setTimeout(90000);
    await loginViaUI(page, userData.email, userData.password);

    await fetch(`${API_URL}/learning/mastery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userData.token}` },
      body: JSON.stringify({
        nodeId: 'concept-limits',
        nodeType: 'CONCEPT',
        mastery: 30,
        dimensions: {},
        attempts: 3,
        lastPracticedAt: new Date().toISOString(),
        confidence: 20,
        weak: true,
      }),
    });

    await page.goto('/planner');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/planner$/, { timeout: 10000 });

    await page.waitForSelector('input[type="checkbox"]', { timeout: 15000 });
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    expect(checkboxes.length).toBeGreaterThan(0);

    await checkboxes[0].click({ force: true });
    await page.waitForTimeout(1000);

    const plansBefore = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('lp-store-plans') ?? '[]'); }
      catch { return []; }
    });
    const completedBefore = plansBefore.some((p: any) => p.status === 'completed');
    expect(completedBefore, 'A plan item should be marked completed in localStorage').toBe(true);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/planner$/, { timeout: 10000 });

    const plansAfter = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('lp-store-plans') ?? '[]'); }
      catch { return []; }
    });
    const completedAfter = plansAfter.some((p: any) => p.status === 'completed');
    expect(completedAfter, 'Completion status should persist across reload').toBe(true);

    const masteryRes = await fetch(`${API_URL}/learning/mastery`, {
      headers: { Authorization: `Bearer ${userData.token}` },
    });
    expect(masteryRes.ok).toBe(true);
  });
});
