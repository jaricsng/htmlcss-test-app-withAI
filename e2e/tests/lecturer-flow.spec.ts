import { test, expect } from '@playwright/test';
import { uniqueUser, register } from './helpers';

// The sidebar has a small '+ Add' button for adding questions.
// Use getByRole('button') scoped to avoid matching the placeholder text
// "Select a question or click "+ Add" to create one" which also contains the substring.
const addQuestionButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: '+ Add' });

test.describe('Lecturer flow', () => {
  test('empty dashboard shows prompt to create first test', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'empty');
    await register(page, lecturer);
    await expect(page.getByText('No tests yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create your first test' })).toBeVisible();
  });

  test('creates a new test and navigates to test builder', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'create');
    await register(page, lecturer);

    await page.getByRole('button', { name: '+ New Test' }).click();
    await expect(page).toHaveURL(/\/lecturer\/tests\/\d+\/edit/);
    await expect(page.getByLabel('Test Title')).toBeVisible();
  });

  test('can update test title and description', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'meta');
    await register(page, lecturer);

    await page.getByRole('button', { name: '+ New Test' }).click();

    const titleInput = page.getByLabel('Test Title');
    await titleInput.fill('My Renamed Quiz');
    await titleInput.blur();

    // Go back to dashboard and confirm title was saved
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL('/lecturer');
    await expect(page.locator('.card', { hasText: 'My Renamed Quiz' })).toBeVisible();
  });

  test('full flow: create test, add MCQ question, publish', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'full');
    await register(page, lecturer);

    await page.getByRole('button', { name: '+ New Test' }).click();
    await expect(page).toHaveURL(/\/lecturer\/tests\/\d+\/edit/);

    // Update test title
    const testTitleInput = page.getByLabel('Test Title');
    await testTitleInput.fill('E2E MCQ Test');
    await testTitleInput.blur();

    // Add a question
    await addQuestionButton(page).click();
    await expect(page.getByLabel('Title')).toBeVisible();

    // Change to MCQ type
    await page.getByLabel('Type').selectOption('mcq');

    // Update question title (exact: true to avoid matching "Test Title" in the sidebar)
    const qTitleInput = page.getByLabel('Title', { exact: true });
    await qTitleInput.fill('What color is the sky?');
    await qTitleInput.blur();

    // Fill MCQ options
    await page.getByPlaceholder('Option 1').fill('Blue');
    await page.getByPlaceholder('Option 1').blur();
    await page.getByPlaceholder('Option 2').fill('Green');
    await page.getByPlaceholder('Option 2').blur();

    // Mark first option as correct
    await page.getByTitle('Mark as correct answer').first().click();

    // Publish
    await page.getByRole('button', { name: 'Publish Test' }).click();
    await expect(page.locator('.badge', { hasText: 'published' })).toBeVisible();

    // Return to dashboard and verify
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL('/lecturer');
    await expect(page.locator('.card', { hasText: 'E2E MCQ Test' })).toBeVisible();
    await expect(page.locator('.badge', { hasText: 'published' })).toBeVisible();
  });

  test('can delete a question from the test builder', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'delq');
    await register(page, lecturer);

    await page.getByRole('button', { name: '+ New Test' }).click();

    // Add a question
    await addQuestionButton(page).click();
    await expect(page.getByLabel('Title')).toBeVisible();

    // Delete the question
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete Question' }).click();

    // Placeholder text reappears
    await expect(page.getByText('Select a question or click "+ Add" to create one')).toBeVisible();
  });

  test('can delete a test from the dashboard', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'del');
    await register(page, lecturer);

    await page.getByRole('button', { name: '+ New Test' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Untitled Test')).toBeVisible();

    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText('No tests yet')).toBeVisible();
  });

  test('can add a grading criterion to a code question', async ({ page }) => {
    const lecturer = uniqueUser('lecturer', 'criteria');
    await register(page, lecturer);

    await page.getByRole('button', { name: '+ New Test' }).click();
    await addQuestionButton(page).click();
    await expect(page.getByLabel('Title')).toBeVisible();

    // Switch to Criteria tab
    await page.getByRole('button', { name: 'Criteria' }).click();

    // Fill in the criterion form
    await page.getByPlaceholder('e.g. Has a nav element').fill('Has an h1 element');
    await page.getByPlaceholder('e.g. nav, h1.title, #main').fill('h1');
    await page.getByRole('button', { name: 'Add Criterion' }).click();

    await expect(page.getByText('Has an h1 element')).toBeVisible();
  });
});
