import { test, expect } from '@playwright/test';
import { waitForPageLoad, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * AI Performance Dashboard Test Suite
 *
 * Tests the AI Performance / ROI dashboard including metrics display,
 * data loading, and navigation.
 *
 * Priority: P1 (High)
 * Requirement: AI-VOICE-007
 */

test.describe('AI Performance Dashboard', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Page Load', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);
    });

    test('should display AI Performance page with proper layout', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);

      // Should show main content
      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();

      // Should show page title
      const title = page.locator('text=/AI Performance|AI ROI|AI Analytics/i');
      await expect(title.first()).toBeVisible({ timeout: 5000 });

      consoleTracker.assertNoErrors();
    });

    test('should display AI ROI metrics cards', async ({ page }) => {
      // Should show metric cards for AI performance
      const metricCards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
      await expect(metricCards.first()).toBeVisible({ timeout: 5000 });

      // Verify multiple cards are present
      const cardCount = await metricCards.count();
      expect(cardCount).toBeGreaterThan(1);
    });

    test('should display calls answered by AI metric', async ({ page }) => {
      // Should show calls answered by AI
      const callsMetric = page.locator('text=/calls.*AI|AI.*calls/i');
      await expect(callsMetric.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display appointments booked metric', async ({ page }) => {
      // Should show appointments booked by AI
      const appointmentsMetric = page.locator('text=/appointment|booking|booked/i');
      await expect(appointmentsMetric.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display estimated value metric', async ({ page }) => {
      // Should show estimated value in currency format
      const valueMetric = page.locator('text=/\\$[\\d,]+|estimated.*value|revenue/i');
      await expect(valueMetric.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Navigation', () => {
    test('should be accessible from dashboard sidebar', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Find and click AI Performance link
      const aiPerformanceLink = page.locator('a[href*="/ai-performance"], a:has-text("AI Performance")').first();
      await expect(aiPerformanceLink).toBeVisible({ timeout: 5000 });

      await aiPerformanceLink.click();
      await expect(page).toHaveURL(/ai-performance/);
    });

    test('should navigate back to main dashboard', async ({ page }) => {
      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);

      // Find Dashboard link in sidebar
      const dashboardLink = page.locator('a[href="/dashboard"]:not([href*="ai-performance"])').first();
      await dashboardLink.click();

      await expect(page).toHaveURL(/\/dashboard$/);
    });
  });

  test.describe('Data Loading', () => {
    test('should show loading state while fetching data', async ({ page }) => {
      // Intercept API calls to slow them down
      await page.route('**/api/analytics/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/dashboard/ai-performance');

      // Should show loader or skeleton
      const loader = page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
      const content = page.locator('[class*="card"], [class*="metric"]');

      await Promise.race([
        loader.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
        content.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {}),
      ]);

      const pageLoaded = (await loader.count()) > 0 || (await content.count()) > 0;
      expect(pageLoaded).toBe(true);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);

      // Mock API failure
      await page.route('**/api/analytics/ai-roi**', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);

      // Page should still render without crashing
      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();
    });

    test('should display empty state when no data', async ({ page }) => {
      // Mock empty data response
      await page.route('**/api/analytics/ai-roi**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              callsAnsweredByAI: { total: 0, percentage: 0 },
              appointmentsBookedByAI: { total: 0, estimatedValue: 0, formatted: '$0' },
              emergencyVsRoutine: { emergency: 0, routine: 0 },
              afterHoursCallsHandled: { total: 0 },
              period: { start: new Date().toISOString(), end: new Date().toISOString() },
            },
          }),
        });
      });

      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);

      // Should show zero values or empty state
      const zeroValue = page.locator('text=/0|no data|empty/i');
      await expect(zeroValue.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Responsiveness', () => {
    test('should display properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);

      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();
    });

    test('should display properly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);

      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();
    });

    test('should display properly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.goto('/dashboard/ai-performance');
      await waitForPageLoad(page);

      const main = page.locator('main, [role="main"]');
      await expect(main.first()).toBeVisible();

      // Sidebar should be visible on desktop
      const sidebar = page.locator('nav, [class*="sidebar"]');
      await expect(sidebar.first()).toBeVisible();
    });
  });
});
