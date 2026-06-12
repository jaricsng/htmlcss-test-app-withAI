import { test, expect } from '@playwright/test';
import { uniqueUser, register, login } from './helpers';

test.describe('Auth flows', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/lecturer');
    await expect(page).toHaveURL('/login');
  });

  test('register as student and land on student dashboard', async ({ page }) => {
    const user = uniqueUser('student', 'reg');
    await register(page, user);
    await expect(page).toHaveURL('/student');
    await expect(page.locator('h2').filter({ hasText: 'Available Tests' })).toBeVisible();
  });

  test('register as lecturer and land on lecturer dashboard', async ({ page }) => {
    const user = uniqueUser('lecturer', 'reg');
    await register(page, user);
    await expect(page).toHaveURL('/lecturer');
    await expect(page.locator('h2').filter({ hasText: 'My Tests' })).toBeVisible();
  });

  test('login with valid credentials', async ({ page }) => {
    const user = uniqueUser('student', 'login');
    await register(page, user);

    // Log out
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login');

    await login(page, user);
    await expect(page).toHaveURL('/student');
  });

  test('shows error on invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('duplicate email shows error on register', async ({ page }) => {
    const user = uniqueUser('student', 'dup');
    await register(page, user);
    await page.getByRole('button', { name: 'Logout' }).click();

    // Try to register again with same email
    await page.goto('/register');
    await page.getByLabel('Full Name').fill('Another Name');
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText(/already registered/i)).toBeVisible();
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    const user = uniqueUser('student', 'logout');
    await register(page, user);
    await expect(page).toHaveURL('/student');

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login');

    // Navigating to protected route redirects again
    await page.goto('/student');
    await expect(page).toHaveURL('/login');
  });
});
