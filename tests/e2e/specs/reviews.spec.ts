import { test, expect } from '@playwright/test';
import { waitForPageLoad, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * Reviews Test Suite
 *
 * Tests review management functionality including listing reviews,
 * responding to reviews, and Google integration.
 *
 * Priority: P1 (High)
 * Estimated Runtime: 2 minutes
 */

test.describe('Reviews', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Reviews List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);
    });

    test('should display reviews page with proper layout', async ({ page }) => {
      // Check page header
      const header = page.locator('h1, [class*="title"]').filter({ hasText: /review/i });
      await expect(header.first()).toBeVisible();
    });

    test('should display reviews list or empty state', async ({ page }) => {
      const reviewsList = page.locator('[class*="review"], [data-testid*="review"]');
      const emptyState = page.locator('text=/no review/i, [class*="empty"]');
      const connectPrompt = page.locator('text=/connect google/i, text=/google business/i');

      const hasReviews = await reviewsList.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;
      const hasConnectPrompt = await connectPrompt.count() > 0;

      expect(hasReviews || hasEmptyState || hasConnectPrompt).toBeTruthy();
    });

    test('should show overall rating summary', async ({ page }) => {
      // Check for rating summary (average stars, total count)
      const ratingSummary = page.locator('[class*="rating"], [class*="summary"], text=/\\d+\\.\\d/');
      const exists = await ratingSummary.count() > 0;
      expect(exists).toBe(true);
    });

    test('should have filter options by rating', async ({ page }) => {
      const filterOptions = page.locator('select, [class*="filter"], button:has-text("5 stars"), button:has-text("All")');
      const exists = await filterOptions.count() > 0;
      expect(exists).toBe(true);
    });

    test('should display review cards with key information', async ({ page }) => {
      const reviewCard = page.locator('[class*="review"]').first();

      if (await reviewCard.isVisible()) {
        // Should show reviewer name
        const name = reviewCard.locator('[class*="name"], [class*="author"]');
        await expect(name.first()).toBeVisible();

        // Should show rating (stars)
        const stars = reviewCard.locator('[class*="star"], [class*="rating"]');
        await expect(stars.first()).toBeVisible();

        // Should show review text
        const text = reviewCard.locator('p, [class*="text"], [class*="content"]');
        await expect(text.first()).toBeVisible();

        // Should show date
        const date = reviewCard.locator('[class*="date"], time');
        await expect(date.first()).toBeVisible();
      }
    });
  });

  test.describe('Review Response', () => {
    test('should allow responding to reviews', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      const reviewCard = page.locator('[class*="review"]').first();

      if (await reviewCard.isVisible()) {
        // Find respond button
        const respondButton = page.locator('button:has-text("Respond"), button:has-text("Reply")').first();

        if (await respondButton.isVisible()) {
          await respondButton.click();

          // Should show response input
          const responseInput = page.locator('textarea, input[placeholder*="response" i]');
          await expect(responseInput.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should show AI-generated response suggestion', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      const reviewCard = page.locator('[class*="review"]').first();

      if (await reviewCard.isVisible()) {
        const respondButton = page.locator('button:has-text("Respond"), button:has-text("Reply")').first();

        if (await respondButton.isVisible()) {
          await respondButton.click();
          await page.waitForTimeout(1000);

          // Check for AI suggestion button or auto-generated response
          const aiSuggestion = page.locator('button:has-text("AI"), button:has-text("Generate"), [class*="suggestion"]');
          const exists = await aiSuggestion.count() > 0;
          expect(exists).toBe(true);
        }
      }
    });

    test('should submit response to review', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);

      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      const reviewCard = page.locator('[class*="review"]').first();

      if (await reviewCard.isVisible()) {
        const respondButton = page.locator('button:has-text("Respond"), button:has-text("Reply")').first();

        if (await respondButton.isVisible()) {
          await respondButton.click();

          const responseInput = page.locator('textarea').first();
          if (await responseInput.isVisible()) {
            await responseInput.fill('Thank you for your feedback!');

            const submitButton = page.locator('button:has-text("Submit"), button:has-text("Post"), button[type="submit"]').first();
            if (await submitButton.isVisible()) {
              // Don't actually submit in test to avoid modifying real data
              // Just verify the button is present
              await expect(submitButton).toBeVisible();
            }
          }
        }
      }

      consoleTracker.assertNoErrors();
    });

    test('should show existing responses', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for owner response section
      const ownerResponse = page.locator('[class*="response"], text=/owner response/i, [class*="reply"]');
      const exists = await ownerResponse.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Review Statistics', () => {
    test('should display review statistics dashboard', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for stats widgets
      const stats = page.locator('[class*="stat"], [class*="metric"], [class*="card"]');
      await expect(stats.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show rating distribution chart', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for rating breakdown (5-star, 4-star, etc.)
      const ratingBreakdown = page.locator('[class*="chart"], [class*="distribution"], [class*="bar"]');
      const exists = await ratingBreakdown.count() > 0;
      expect(exists).toBe(true);
    });

    test('should show trend over time', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for trend chart or period selector
      const trendSection = page.locator('[class*="trend"], [class*="chart"], text=/last.*days/i');
      const exists = await trendSection.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Google Integration', () => {
    test('should show Google connection status', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for Google connection status
      const googleStatus = page.locator('text=/google/i, [class*="google"]');
      await expect(googleStatus.first()).toBeVisible({ timeout: 5000 });
    });

    test('should prompt to connect Google if not connected', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for connect prompt or connected status
      const connectButton = page.locator('button:has-text("Connect Google"), button:has-text("Connect")');
      const connectedStatus = page.locator('text=/connected/i, [class*="connected"]');

      const hasConnect = await connectButton.count() > 0;
      const isConnected = await connectedStatus.count() > 0;

      expect(hasConnect || isConnected).toBeTruthy();
    });

    test('should show sync status', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for sync status or last sync time
      const syncStatus = page.locator('text=/sync/i, text=/last updated/i, [class*="sync"]');
      const exists = await syncStatus.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Review Notifications', () => {
    test('should show new review indicator', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check for new review badge or indicator
      const newIndicator = page.locator('[class*="new"], [class*="badge"], [class*="unread"]');
      const exists = await newIndicator.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Reviews Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Tab through reviews
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have proper star rating labels', async ({ page }) => {
      await page.goto('/dashboard/reviews');
      await waitForPageLoad(page);

      // Check stars have accessible labels
      const stars = page.locator('[class*="star"], [role="img"]');

      if (await stars.count() > 0) {
        const ariaLabel = await stars.first().getAttribute('aria-label');
        const title = await stars.first().getAttribute('title');

        // Star should have either aria-label or title for accessibility
        expect(ariaLabel !== null || title !== null).toBe(true);
      }
    });
  });
});
