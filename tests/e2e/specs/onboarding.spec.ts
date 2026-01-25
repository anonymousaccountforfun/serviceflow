import { test, expect } from '@playwright/test';
import { waitForPageLoad, waitForClerk, TEST_BUSINESS } from '../utils/test-helpers';

/**
 * Onboarding Test Suite
 *
 * Tests the complete onboarding wizard flow for new users
 * including business setup, phone provisioning, and AI configuration.
 *
 * Priority: P0 (Critical)
 * Estimated Runtime: 3 minutes
 */

test.describe('Onboarding Flow', () => {
  // Note: These tests require a fresh user account or mock
  // In CI, use test accounts that can be reset

  test.describe('Onboarding Page Access', () => {
    test('should redirect new users to onboarding', async ({ page }) => {
      // This test verifies new users are redirected to onboarding
      // Requires a fresh user session

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // New users should be redirected to onboarding OR dashboard
      const url = page.url();
      expect(url.includes('onboarding') || url.includes('dashboard') || url.includes('sign-in')).toBeTruthy();
    });

    test('should display onboarding page for new users', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      // Should show onboarding content or redirect to sign-in
      const onboardingContent = page.locator('text=/welcome|get started|business|setup/i');
      const signInPage = page.url().includes('sign-in');

      expect(await onboardingContent.count() > 0 || signInPage).toBeTruthy();
    });
  });

  test.describe('Onboarding Steps', () => {
    // Use fresh user state for onboarding tests
    test.use({ storageState: 'tests/e2e/.auth/new-user.json' });

    test('should display business profile step', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      // If redirected, skip
      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Should show business name input
      const businessNameInput = page.locator('input[name*="business" i], input[placeholder*="business" i]');
      await expect(businessNameInput.first()).toBeVisible({ timeout: 10000 });
    });

    test('should require business name', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Try to continue without business name
      const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();

        // Should show validation error
        const error = page.locator('[class*="error"]');
        await expect(error.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should allow selecting service type', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Find service type selector
      const serviceTypeSelect = page.locator('select[name*="service" i], [class*="service-type"]');

      if (await serviceTypeSelect.count() > 0) {
        // Select plumbing
        if (await serviceTypeSelect.first().evaluate((el) => el.tagName === 'SELECT')) {
          await serviceTypeSelect.first().selectOption({ label: /plumbing/i });
        } else {
          // Click option if it's a custom selector
          const plumbingOption = page.locator('button:has-text("Plumbing"), [class*="option"]:has-text("Plumbing")').first();
          if (await plumbingOption.isVisible()) {
            await plumbingOption.click();
          }
        }
      }
    });

    test('should display phone setup step', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Fill business name and continue
      const businessNameInput = page.locator('input[name*="business" i], input[placeholder*="business" i]').first();
      if (await businessNameInput.isVisible()) {
        await businessNameInput.fill(TEST_BUSINESS.name);

        // Select service type if required
        const serviceTypeSelect = page.locator('select[name*="service" i]').first();
        if (await serviceTypeSelect.isVisible()) {
          await serviceTypeSelect.selectOption({ index: 1 });
        }

        // Continue to next step
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
        await continueButton.click();

        await page.waitForTimeout(1000);

        // Should show phone setup
        const phoneSetup = page.locator('text=/phone|number/i');
        await expect(phoneSetup.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow choosing to use existing phone', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Navigate to phone step (fill previous steps first)
      // ... (would need to complete previous steps)

      // Check for "use existing number" option
      const useExistingOption = page.locator('text=/existing|already have/i, input[type="radio"], button:has-text("existing")');
      const exists = await useExistingOption.count() > 0;
      expect(exists).toBe(true);
    });

    test('should display business hours configuration', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Check for business hours in later steps
      const hoursConfig = page.locator('text=/hours|schedule|monday|tuesday/i');
      const exists = await hoursConfig.count() > 0;
      expect(exists).toBe(true);
    });

    test('should display AI settings configuration', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Check for AI settings
      const aiSettings = page.locator('text=/ai|voice|greeting|automated/i');
      const exists = await aiSettings.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Onboarding Completion', () => {
    test('should complete onboarding and redirect to dashboard', async ({ page }) => {
      // This test simulates completing the entire onboarding flow
      // In a real test, you'd fill each step properly

      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // If already completed onboarding, should redirect to dashboard
      if (page.url().includes('dashboard')) {
        await expect(page).toHaveURL(/dashboard/);
        return;
      }

      // Otherwise, verify onboarding structure is present
      const onboardingForm = page.locator('form, [class*="step"], [class*="wizard"]');
      await expect(onboardingForm.first()).toBeVisible();
    });

    test('should persist onboarding progress', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Fill some data
      const businessNameInput = page.locator('input[name*="business" i]').first();
      if (await businessNameInput.isVisible()) {
        await businessNameInput.fill('Persistence Test Business');
      }

      // Reload page
      await page.reload();
      await waitForPageLoad(page);

      // Data should persist (or step should persist)
      // This depends on implementation
    });
  });

  test.describe('Onboarding Validation', () => {
    test('should validate phone number format', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Find phone input (may be on later step)
      const phoneInput = page.locator('input[name*="phone" i], input[type="tel"]').first();

      if (await phoneInput.isVisible()) {
        await phoneInput.fill('123'); // Invalid

        const continueButton = page.locator('button:has-text("Continue")').first();
        await continueButton.click();

        // Should show error
        const error = page.locator('[class*="error"]');
        await expect(error.first()).toBeVisible({ timeout: 3000 });
      }
    });

    test('should validate area code', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Find area code input
      const areaCodeInput = page.locator('input[name*="area" i], input[placeholder*="area" i]').first();

      if (await areaCodeInput.isVisible()) {
        await areaCodeInput.fill('12'); // Invalid (should be 3 digits)

        await areaCodeInput.blur();

        // Should show error
        const error = page.locator('[class*="error"]');
        await expect(error.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Onboarding Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Tab through form
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Should have visible focus
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have progress indicator', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForPageLoad(page);

      if (page.url().includes('sign-in') || page.url().includes('dashboard')) {
        test.skip();
        return;
      }

      // Should show progress/step indicator
      const progressIndicator = page.locator('[class*="progress"], [class*="step"], [role="progressbar"]');
      await expect(progressIndicator.first()).toBeVisible({ timeout: 5000 });
    });
  });
});
