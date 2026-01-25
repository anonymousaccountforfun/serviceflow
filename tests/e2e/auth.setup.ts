import { test as setup, expect } from '@playwright/test';
import { waitForClerk } from './utils/test-helpers';

/**
 * Authentication Setup
 *
 * This file handles authentication state persistence for E2E tests.
 * It runs once before all tests to create authenticated session storage.
 *
 * For CI environments, use environment variables:
 * - TEST_USER_EMAIL: Email for test user
 * - TEST_USER_PASSWORD: Password for test user
 * - TEST_NEW_USER_EMAIL: Email for new/onboarding user tests
 * - TEST_NEW_USER_PASSWORD: Password for new user tests
 */

const STORAGE_STATE_PATH = 'tests/e2e/.auth/user.json';
const NEW_USER_STORAGE_PATH = 'tests/e2e/.auth/new-user.json';

// Test user credentials from environment or defaults
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
};

const TEST_NEW_USER = {
  email: process.env.TEST_NEW_USER_EMAIL || 'newuser@example.com',
  password: process.env.TEST_NEW_USER_PASSWORD || 'NewUserPassword123!',
};

/**
 * Main user authentication setup
 * Creates authenticated state for existing user with completed onboarding
 */
setup('authenticate main user', async ({ page }) => {
  // In CI, require real credentials - fail fast instead of creating invalid mock
  if (!process.env.TEST_USER_EMAIL) {
    if (process.env.CI) {
      throw new Error(
        'TEST_USER_EMAIL not set in CI environment. ' +
        'Authenticated tests require real test credentials. ' +
        'Set TEST_USER_EMAIL and TEST_USER_PASSWORD secrets.'
      );
    }
    // In local dev, create empty auth state and skip authenticated tests
    console.log('⚠️  TEST_USER_EMAIL not set - authenticated tests will be skipped');
    await createEmptyAuthState(STORAGE_STATE_PATH);
    return;
  }

  // Navigate to sign-in page
  await page.goto('/sign-in');
  await waitForClerk(page);

  // Wait for Clerk sign-in form
  await page.waitForSelector('[data-clerk-component], form', { timeout: 10000 });

  // Fill in credentials
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.fill(TEST_USER.email);

  // Click continue (Clerk often has two-step sign-in)
  const continueButton = page.locator('button[type="submit"], button:has-text("Continue")').first();
  await continueButton.click();

  // Wait for password field
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(TEST_USER.password);

  // Submit
  const signInButton = page.locator('button[type="submit"], button:has-text("Sign in")').first();
  await signInButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 30000 });

  // Verify we're authenticated
  await expect(page.locator('body')).toContainText(/dashboard|home/i);

  // Save storage state
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  console.log('✅ Main user authenticated successfully');
});

/**
 * New user authentication setup
 * Creates authenticated state for new user who hasn't completed onboarding
 */
setup('authenticate new user', async ({ page }) => {
  // In CI, require real credentials - fail fast instead of creating invalid mock
  if (!process.env.TEST_NEW_USER_EMAIL) {
    if (process.env.CI) {
      throw new Error(
        'TEST_NEW_USER_EMAIL not set in CI environment. ' +
        'Onboarding tests require real test credentials. ' +
        'Set TEST_NEW_USER_EMAIL and TEST_NEW_USER_PASSWORD secrets.'
      );
    }
    // In local dev, create empty auth state and skip onboarding tests
    console.log('⚠️  TEST_NEW_USER_EMAIL not set - onboarding tests will be skipped');
    await createEmptyAuthState(NEW_USER_STORAGE_PATH);
    return;
  }

  // Navigate to sign-in page
  await page.goto('/sign-in');
  await waitForClerk(page);

  // Wait for Clerk sign-in form
  await page.waitForSelector('[data-clerk-component], form', { timeout: 10000 });

  // Fill in credentials
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.fill(TEST_NEW_USER.email);

  // Click continue
  const continueButton = page.locator('button[type="submit"], button:has-text("Continue")').first();
  await continueButton.click();

  // Wait for password field
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(TEST_NEW_USER.password);

  // Submit
  const signInButton = page.locator('button[type="submit"], button:has-text("Sign in")').first();
  await signInButton.click();

  // Wait for redirect (could be onboarding or dashboard)
  await page.waitForURL(/(onboarding|dashboard)/, { timeout: 30000 });

  // Save storage state
  await page.context().storageState({ path: NEW_USER_STORAGE_PATH });

  console.log('✅ New user authenticated successfully');
});

/**
 * Creates an empty authentication state file
 * Used when test credentials are not configured in local development.
 * Tests using this state will redirect to sign-in (as expected for unauthenticated state).
 */
async function createEmptyAuthState(path: string) {
  const fs = await import('fs');
  // Empty state - no cookies, no localStorage
  // This will cause tests to properly see unauthenticated behavior
  const emptyState = {
    cookies: [],
    origins: [],
  };

  // Ensure directory exists
  const dir = path.substring(0, path.lastIndexOf('/'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path, JSON.stringify(emptyState, null, 2));
  console.log(`📝 Created empty auth state at ${path} (tests requiring auth will be skipped)`);
}
