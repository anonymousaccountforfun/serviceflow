import { defineConfig, devices } from '@playwright/test';

/**
 * ServiceFlow E2E Test Configuration
 *
 * Run all tests: npx playwright test
 * Run specific suite: npx playwright test auth
 * Run with UI: npx playwright test --ui
 * Debug mode: npx playwright test --debug
 */

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  // Global timeout settings
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  projects: [
    // Setup project for authentication state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      testDir: '.',
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      dependencies: ['setup'],
    },
  ],

  // Local dev server (optional)
  // Skip webServer if CI or if TEST_BASE_URL is set (testing against external deployment)
  webServer: (process.env.CI || process.env.TEST_BASE_URL) ? undefined : {
    command: 'pnpm --filter @serviceflow/web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
