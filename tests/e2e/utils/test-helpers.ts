import { Page, expect } from '@playwright/test';

/**
 * Test Helpers for ServiceFlow E2E Tests
 */

// Test user credentials (use test/staging accounts only)
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@serviceflow.test',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

export const TEST_BUSINESS = {
  name: 'Test Plumbing Co',
  serviceType: 'plumbing',
  phone: '+15551234567',
  areaCode: '555',
};

/**
 * Wait for page to be fully loaded (network idle + no loading spinners)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  const spinners = page.locator('[class*="loading"], [class*="spinner"], [class*="Loader"]');
  if (await spinners.count() > 0) {
    await spinners.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

/**
 * Wait for Clerk components to load
 */
export async function waitForClerk(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for Clerk root element
  await page.waitForSelector('[class*="cl-"], .cl-rootBox', { timeout: 10000 }).catch(() => {});
  // Additional wait for dynamic content
  await page.waitForTimeout(1000);
}

/**
 * Fill Clerk sign-in form
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await waitForClerk(page);

  // Clerk v4 uses identifier field
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.fill(email);

  // Click continue or submit
  const continueButton = page.locator('button:has-text("Continue"), button[type="submit"]').first();
  await continueButton.click();

  // Wait for password field
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // Submit
  const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Continue"), button[type="submit"]').first();
  await signInButton.click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
}

/**
 * Sign out from the application
 */
export async function signOut(page: Page) {
  // Navigate to settings and sign out, or use Clerk's sign out
  await page.goto('/dashboard/settings/profile');
  await waitForPageLoad(page);

  const signOutButton = page.locator('button:has-text("Sign out"), button:has-text("Log out")').first();
  if (await signOutButton.isVisible()) {
    await signOutButton.click();
    await page.waitForURL(/\/(sign-in|\/)?$/, { timeout: 10000 });
  }
}

/**
 * Create a test customer via UI
 */
export async function createTestCustomer(page: Page, customer: {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}) {
  await page.goto('/dashboard/customers');
  await waitForPageLoad(page);

  // Click add customer button
  await page.click('button:has-text("Add Customer"), button:has-text("New Customer")');

  // Fill form
  await page.fill('input[name="firstName"], input[placeholder*="First"]', customer.firstName);
  await page.fill('input[name="lastName"], input[placeholder*="Last"]', customer.lastName);
  await page.fill('input[name="phone"], input[type="tel"]', customer.phone);

  if (customer.email) {
    await page.fill('input[name="email"], input[type="email"]', customer.email);
  }

  // Submit
  await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

  // Wait for success
  await page.waitForSelector('[class*="success"], [role="alert"]', { timeout: 5000 }).catch(() => {});
}

/**
 * Create a test job via UI
 */
export async function createTestJob(page: Page, job: {
  title: string;
  customerName: string;
  type?: string;
}) {
  await page.goto('/dashboard/jobs');
  await waitForPageLoad(page);

  // Click add job button
  await page.click('button:has-text("Add Job"), button:has-text("New Job"), button:has-text("Create Job")');

  // Fill form
  await page.fill('input[name="title"], input[placeholder*="Title"]', job.title);

  // Select customer
  const customerInput = page.locator('input[placeholder*="customer"], input[placeholder*="Customer"]');
  if (await customerInput.isVisible()) {
    await customerInput.fill(job.customerName);
    await page.waitForTimeout(500);
    await page.click(`text=${job.customerName}`).catch(() => {});
  }

  // Submit
  await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

  // Wait for success
  await page.waitForSelector('[class*="success"], [role="alert"]', { timeout: 5000 }).catch(() => {});
}

/**
 * Navigate to dashboard section
 */
export async function navigateTo(page: Page, section: 'dashboard' | 'customers' | 'jobs' | 'calendar' | 'inbox' | 'reviews' | 'settings') {
  const paths: Record<string, string> = {
    dashboard: '/dashboard',
    customers: '/dashboard/customers',
    jobs: '/dashboard/jobs',
    calendar: '/dashboard/calendar',
    inbox: '/dashboard/inbox',
    reviews: '/dashboard/reviews',
    settings: '/dashboard/settings',
  };

  await page.goto(paths[section]);
  await waitForPageLoad(page);
}

/**
 * Check for accessibility violations using axe-core
 */
export async function checkAccessibility(page: Page) {
  // Inject axe-core
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js',
  });

  // Run axe
  const violations = await page.evaluate(async () => {
    // @ts-ignore
    const results = await window.axe.run();
    return results.violations;
  });

  return violations;
}

/**
 * Take a full-page screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    customer: {
      firstName: `Test${timestamp}`,
      lastName: 'Customer',
      phone: `+1555${String(timestamp).slice(-7)}`,
      email: `test${timestamp}@example.com`,
    },
    job: {
      title: `Test Job ${timestamp}`,
      description: 'Automated test job',
    },
  };
}

/**
 * Assert toast/notification appears
 */
export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator('[role="alert"], [class*="toast"], [class*="notification"]');
  await expect(toast.filter({ hasText: text })).toBeVisible({ timeout: 5000 });
}

/**
 * Assert no console errors
 */
export function setupConsoleErrorTracking(page: Page) {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  return {
    getErrors: () => errors,
    assertNoErrors: () => {
      const criticalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Failed to load resource')
      );
      expect(criticalErrors).toHaveLength(0);
    },
  };
}
