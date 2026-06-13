import { Page } from '@playwright/test';

/** Generate unique credentials to avoid conflicts across test runs */
export function uniqueUser(role: 'lecturer' | 'student', label = '') {
  const ts = Date.now();
  const suffix = label ? `${label}-${ts}` : String(ts);
  return {
    email: `${role}-${suffix}@test.com`,
    name: `${role === 'lecturer' ? 'Dr' : 'Student'} ${suffix}`,
    password: 'password123',
    role,
  };
}

export async function register(page: Page, user: ReturnType<typeof uniqueUser>) {
  await page.goto('/register');
  await page.getByLabel('Full Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page
    .getByRole('button', { name: user.role === 'lecturer' ? 'Lecturer' : 'Student' })
    .click();
  await page.getByRole('button', { name: 'Create Account' }).click();
  // Wait for redirect away from /register
  await page.waitForURL(url => !url.pathname.startsWith('/register'));
}

export async function login(
  page: Page,
  user: Pick<ReturnType<typeof uniqueUser>, 'email' | 'password'>
) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'));
}
