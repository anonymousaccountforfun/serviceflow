import { test, expect } from '@playwright/test';
import { waitForPageLoad, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * Dashboard Test Suite
 *
 * Tests the main dashboard including overview metrics,
 * quick actions, recent activity, and navigation.
 *
 * Priority: P0 (Critical)
 * Estimated Runtime: 2 minutes
 */

test.describe('Dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Dashboard Overview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);
    });

    test('should display dashboard page with proper layout', async ({ page }) => {
      // Check page loads without errors
      const consoleTracker = setupConsoleErrorTracking(page);

      // Should show main dashboard content
      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();

      consoleTracker.assertNoErrors();
    });

    test('should display key metrics', async ({ page }) => {
      // Should show metric cards (jobs, revenue, customers, etc.)
      const metricCards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
      await expect(metricCards.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display quick actions', async ({ page }) => {
      // Should have quick action buttons
      const quickActions = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
      await expect(quickActions.first()).toBeVisible();
    });

    test('should display recent activity', async ({ page }) => {
      // Should show recent jobs, calls, or activity feed
      const recentSection = page.locator('text=/recent/i, [class*="recent"], [class*="activity"]');
      await expect(recentSection.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display navigation sidebar', async ({ page }) => {
      // Should show navigation links
      const navLinks = page.locator('nav a, [role="navigation"] a');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(3);
    });
  });

  test.describe('Dashboard Metrics', () => {
    test('should show today\'s jobs count', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const jobsMetric = page.locator('text=/job/i').first();
      await expect(jobsMetric).toBeVisible({ timeout: 5000 });
    });

    test('should show revenue or earnings', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const revenueMetric = page.locator('text=/revenue|earning|\\$/i');
      const exists = await revenueMetric.count() > 0;
      expect(exists).toBe(true);
    });

    test('should show customer count', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const customerMetric = page.locator('text=/customer/i');
      const exists = await customerMetric.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Dashboard Navigation', () => {
    test('should navigate to customers', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const customersLink = page.locator('a[href*="/customers"]').first();
      await customersLink.click();

      await expect(page).toHaveURL(/customers/);
    });

    test('should navigate to jobs', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const jobsLink = page.locator('a[href*="/jobs"]').first();
      await jobsLink.click();

      await expect(page).toHaveURL(/jobs/);
    });

    test('should navigate to calendar', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const calendarLink = page.locator('a[href*="/calendar"]').first();
      await calendarLink.click();

      await expect(page).toHaveURL(/calendar/);
    });

    test('should navigate to inbox', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const inboxLink = page.locator('a[href*="/inbox"]').first();
      await inboxLink.click();

      await expect(page).toHaveURL(/inbox/);
    });

    test('should navigate to settings', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const settingsLink = page.locator('a[href*="/settings"]').first();
      await settingsLink.click();

      await expect(page).toHaveURL(/settings/);
    });
  });

  test.describe('Dashboard Quick Actions', () => {
    test('should open create job modal from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const createJobButton = page.locator('button:has-text("New Job"), button:has-text("Add Job"), a:has-text("New Job")').first();

      if (await createJobButton.isVisible()) {
        await createJobButton.click();

        // Should open modal or navigate
        await page.waitForTimeout(500);
        const modal = page.locator('[role="dialog"]');
        const navigated = page.url().includes('job');

        expect(await modal.count() > 0 || navigated).toBeTruthy();
      }
    });

    test('should open create customer modal from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const createCustomerButton = page.locator('button:has-text("New Customer"), button:has-text("Add Customer")').first();

      if (await createCustomerButton.isVisible()) {
        await createCustomerButton.click();

        await page.waitForTimeout(500);
        const modal = page.locator('[role="dialog"]');
        const navigated = page.url().includes('customer');

        expect(await modal.count() > 0 || navigated).toBeTruthy();
      }
    });
  });

  test.describe('Dashboard Responsiveness', () => {
    test('should display properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Main content should be visible
      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();

      // Mobile menu button should be visible
      const menuButton = page.locator('button[aria-label*="menu" i], [class*="hamburger"], button:has(svg)');
      await expect(menuButton.first()).toBeVisible();
    });

    test('should display properly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();
    });

    test('should display properly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();

      // Sidebar should be visible on desktop
      const sidebar = page.locator('nav, [class*="sidebar"]');
      await expect(sidebar.first()).toBeVisible();
    });
  });

  test.describe('Dashboard Data Loading', () => {
    test('should show loading state', async ({ page }) => {
      // Intercept API calls to slow them down
      await page.route('**/api/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/dashboard');

      // Should show some loading indicator or content
      const loader = page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
      const content = page.locator('main, [role="main"]');

      // Wait for either loader or content to appear
      await Promise.race([
        loader.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
        content.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
      ]);

      // Verify page is responding (not stuck)
      const pageLoaded = await loader.count() > 0 || await content.count() > 0;
      expect(pageLoaded).toBe(true);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);

      // Mock API failure for one endpoint
      await page.route('**/api/stats**', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Page should still render without crashing
      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();
    });
  });

  test.describe('Dashboard User Context', () => {
    test('should display user information', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Should show user avatar or name
      const userInfo = page.locator('[class*="avatar"], [class*="user"], img[alt*="profile" i]');
      await expect(userInfo.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display business name', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Should show business name somewhere
      const businessName = page.locator('[class*="business"], [class*="company"]');
      const exists = await businessName.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Dashboard Notifications', () => {
    test('should show notification indicator', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Check for notification bell or indicator
      const notificationIcon = page.locator('[class*="notification"], button[aria-label*="notification" i], [class*="bell"]');
      const exists = await notificationIcon.count() > 0;
      expect(exists).toBe(true);
    });
  });
});
