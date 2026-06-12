import { test, expect } from '@playwright/test';
import { uniqueUser, register, login } from './helpers';

/**
 * Creates a published MCQ test + a student via the API.
 * Also pre-starts the attempt so the TestRoom can load without dashboard interaction.
 */
async function seedPublishedMcqTest(baseURL: string, label = '') {
  const ts = Date.now();
  const lEmail = `seed-lect-${label}-${ts}@test.com`;
  const sEmail = `seed-stud-${label}-${ts}@test.com`;
  const password = 'password123';
  const testTitle = `E2E Student Test ${label} ${ts}`;

  async function post(path: string, body: unknown, token?: string) {
    const res = await fetch(`${baseURL}/api${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }
  async function put(path: string, body: unknown, token: string) {
    const res = await fetch(`${baseURL}/api${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  const { token: lToken } = await post('/auth/register', {
    email: lEmail, name: 'Seed Lecturer', password, role: 'lecturer',
  });
  const { token: sToken } = await post('/auth/register', {
    email: sEmail, name: 'Seed Student', password, role: 'student',
  });

  const { id: testId } = await post('/tests', { title: testTitle }, lToken);

  await post('/questions', {
    test_id: testId, type: 'mcq', order_index: 0,
    title: 'Sky color question', description: 'What color is the sky?',
    starter_html: '', starter_css: '', reference_html: '', reference_css: '',
    total_points: 5,
    // Pass the raw array — the server will JSON.stringify it
    mcq_options: ['Blue', 'Green', 'Red', 'Yellow'],
    mcq_correct_index: 0,
  }, lToken);

  await put(`/tests/${testId}`, { status: 'published' }, lToken);

  // Pre-start the attempt so the TestRoom can load cleanly
  const { attempt } = await post('/attempts/start', { test_id: testId }, sToken);

  return {
    student: { email: sEmail, password },
    testId: Number(testId),
    attemptId: Number(attempt.id),
    testTitle,
  };
}

/** Navigate to the TestRoom and wait for it to finish loading. */
async function openTestRoom(page: import('@playwright/test').Page, testId: number) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`/student/tests/${testId}`);
  await expect(page).toHaveURL(`/student/tests/${testId}`);

  // Wait for the loading spinner to disappear and the question list to appear
  await expect(page.getByText('Loading test…')).toBeHidden({ timeout: 15000 });

  if (errors.length) throw new Error(`Browser JS error in TestRoom: ${errors.join('; ')}`);
}

test.describe('Student flow', () => {
  test('student dashboard loads after login', async ({ page }) => {
    const student = uniqueUser('student', 'dash');
    await register(page, student);
    await expect(page).toHaveURL('/student');
    await expect(page.locator('h2').filter({ hasText: 'Available Tests' })).toBeVisible();
  });

  test('published test appears on student dashboard', async ({ page, baseURL }) => {
    const data = await seedPublishedMcqTest(baseURL!, 'appears');
    await login(page, data.student);

    await expect(page.getByText(data.testTitle)).toBeVisible();
    // The attempt is already started, so button shows "Continue" not "Start Test"
    await expect(
      page.locator('.card', { hasText: data.testTitle }).getByRole('button')
    ).toBeVisible();
  });

  test('student can navigate to test and sees question', async ({ page, baseURL }) => {
    const data = await seedPublishedMcqTest(baseURL!, 'start');
    await login(page, data.student);
    await openTestRoom(page, data.testId);

    await expect(page.getByRole('heading', { name: 'Sky color question' })).toBeVisible();
  });

  test('student answers MCQ correctly and sees results', async ({ page, baseURL }) => {
    const data = await seedPublishedMcqTest(baseURL!, 'submit');
    await login(page, data.student);
    await openTestRoom(page, data.testId);

    await expect(page.getByRole('heading', { name: 'Sky color question' })).toBeVisible();

    // Select the first MCQ option (Blue — the correct one)
    await page.getByRole('radio').first().click();

    // Submit the test
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Submit Test' }).click();

    await expect(page).toHaveURL(/\/student\/attempts\/\d+\/results/);
    await expect(page.getByText('Your Results')).toBeVisible();
  });

  test('blank submission scores 0%', async ({ page, baseURL }) => {
    const data = await seedPublishedMcqTest(baseURL!, 'blank');
    await login(page, data.student);
    await openTestRoom(page, data.testId);

    // Submit without answering
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Submit Test' }).click();

    await expect(page).toHaveURL(/\/student\/attempts\/\d+\/results/);
    await expect(page.getByText('0%')).toBeVisible();
  });

  test('submitted test shows "View Results" link on dashboard', async ({ page, baseURL }) => {
    const data = await seedPublishedMcqTest(baseURL!, 'viewres');
    await login(page, data.student);
    await openTestRoom(page, data.testId);

    // Submit
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Submit Test' }).click();
    await expect(page).toHaveURL(/\/student\/attempts\/\d+\/results/);

    // Go back to student dashboard
    await page.getByRole('link', { name: '← Back to Tests' }).click();
    await expect(page).toHaveURL('/student');

    // The card now shows "View Results" instead of "Start Test"
    await expect(
      page.locator('.card', { hasText: data.testTitle }).getByRole('link', { name: 'View Results' })
    ).toBeVisible();
  });

  test('student cannot access lecturer dashboard', async ({ page }) => {
    const student = uniqueUser('student', 'forbidden');
    await register(page, student);
    await page.goto('/lecturer');
    await expect(page).toHaveURL('/student');
  });
});
