import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './global-setup.ts',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'node --experimental-sqlite --import tsx/esm src/index.ts',
      cwd: '../server',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: false,
      env: { DB_PATH: '../e2e/test.db' },
    },
    {
      command: 'npm run dev',
      cwd: '../client',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
