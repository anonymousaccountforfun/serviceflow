import { test, expect } from '@playwright/test';
import { waitForPageLoad, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * Settings Test Suite
 *
 * Tests all settings pages including profile, business,
 * notifications, billing, and integrations.
 *
 * Priority: P1 (High)
 * Estimated Runtime: 2 minutes
 */

test.describe('Settings', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Settings Navigation', () => {
    test('should display settings page with navigation', async ({ page }) => {
      await page.goto('/dashboard/settings');
      await waitForPageLoad(page);

      // Should show settings navigation
      const settingsNav = page.locator('[class*="nav"], [class*="sidebar"], [class*="menu"]');
      await expect(settingsNav.first()).toBeVisible();

      // Should have setting sections
      const sections = ['Profile', 'Business', 'Notifications', 'Billing', 'Integrations'];

      for (const section of sections.slice(0, 3)) {
        const link = page.locator(`a:has-text("${section}"), button:has-text("${section}")`);
        await expect(link.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should navigate between settings sections', async ({ page }) => {
      await page.goto('/dashboard/settings');
      await waitForPageLoad(page);

      // Click on different sections
      const profileLink = page.locator('a:has-text("Profile"), button:has-text("Profile")').first();
      if (await profileLink.isVisible()) {
        await profileLink.click();
        await expect(page).toHaveURL(/settings\/profile/);
      }

      const businessLink = page.locator('a:has-text("Business"), button:has-text("Business")').first();
      if (await businessLink.isVisible()) {
        await businessLink.click();
        await expect(page).toHaveURL(/settings\/business/);
      }
    });
  });

  test.describe('Profile Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      await waitForPageLoad(page);
    });

    test('should display profile information', async ({ page }) => {
      // Should show user info
      const profileInfo = page.locator('text=/name|email/i, input[name*="name" i]');
      await expect(profileInfo.first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow editing profile', async ({ page }) => {
      // Find edit button or editable fields
      const editButton = page.locator('button:has-text("Edit"), button:has-text("Save")').first();
      const editableField = page.locator('input[name*="name" i], input[name*="firstName" i]').first();

      expect(await editButton.isVisible() || await editableField.isVisible()).toBeTruthy();
    });

    test('should allow uploading avatar', async ({ page }) => {
      // Find avatar upload
      const avatarUpload = page.locator('input[type="file"], button:has-text("Upload"), [class*="avatar"]');
      await expect(avatarUpload.first()).toBeVisible({ timeout: 5000 });
    });

    test('should have sign out button', async ({ page }) => {
      const signOutButton = page.locator('button:has-text("Sign out"), button:has-text("Log out")');
      await expect(signOutButton.first()).toBeVisible();
    });

    test('should have delete account option', async ({ page }) => {
      // Scroll to find delete option (usually at bottom)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove account")');
      const deleteSection = page.locator('text=/delete|remove.*account/i');

      expect(await deleteButton.count() > 0 || await deleteSection.count() > 0).toBeTruthy();
    });
  });

  test.describe('Business Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/settings/business');
      await waitForPageLoad(page);
    });

    test('should display business information', async ({ page }) => {
      // Should show business name
      const businessName = page.locator('input[name*="business" i], text=/business name/i');
      await expect(businessName.first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow editing business hours', async ({ page }) => {
      // Find business hours section
      const hoursSection = page.locator('text=/hours|schedule/i, [class*="hours"]');
      await expect(hoursSection.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display timezone setting', async ({ page }) => {
      const timezoneSelect = page.locator('select[name*="timezone" i], text=/timezone/i');
      await expect(timezoneSelect.first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow editing AI settings', async ({ page }) => {
      // Find AI settings
      const aiSection = page.locator('text=/ai|voice|automated/i, [class*="ai"]');
      await expect(aiSection.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Notification Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/settings/notifications');
      await waitForPageLoad(page);
    });

    test('should display notification preferences', async ({ page }) => {
      // Should show notification options
      const notificationOptions = page.locator('input[type="checkbox"], [class*="toggle"], [class*="switch"]');
      await expect(notificationOptions.first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow toggling notification channels', async ({ page }) => {
      // Find channel toggles (email, SMS, push)
      const channels = page.locator('text=/email|sms|push/i');
      await expect(channels.first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow setting quiet hours', async ({ page }) => {
      const quietHours = page.locator('text=/quiet|do not disturb/i');
      const exists = await quietHours.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Billing Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/settings/billing');
      await waitForPageLoad(page);
    });

    test('should display current plan', async ({ page }) => {
      // Should show plan info
      const planInfo = page.locator('text=/plan|subscription|starter|professional/i');
      await expect(planInfo.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show upgrade options', async ({ page }) => {
      // May show upgrade button if on lower tier
      const upgradeButton = page.locator('button:has-text("Upgrade"), a:has-text("Upgrade")');
      const planOptions = page.locator('[class*="plan"], [class*="tier"]');

      const hasUpgrade = await upgradeButton.count() > 0;
      const hasPlans = await planOptions.count() > 0;

      expect(hasUpgrade || hasPlans).toBe(true);
    });

    test('should display billing history', async ({ page }) => {
      const billingHistory = page.locator('text=/invoice|history|payment/i');
      const exists = await billingHistory.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Integrations Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/settings/integrations');
      await waitForPageLoad(page);
    });

    test('should display available integrations', async ({ page }) => {
      // Should show integrations list
      const integrations = page.locator('text=/google|twilio|stripe|integration/i');
      await expect(integrations.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show Google integration status', async ({ page }) => {
      const googleIntegration = page.locator('text=/google/i');
      await expect(googleIntegration.first()).toBeVisible({ timeout: 5000 });

      // Should show connect/disconnect status
      const statusButton = page.locator('button:has-text("Connect"), button:has-text("Disconnect"), text=/connected/i');
      await expect(statusButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show Twilio phone status', async ({ page }) => {
      const twilioSection = page.locator('text=/twilio|phone/i');
      await expect(twilioSection.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Settings Form Behavior', () => {
    test('should show save confirmation', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);

      await page.goto('/dashboard/settings/profile');
      await waitForPageLoad(page);

      // Find and modify a field
      const nameInput = page.locator('input[name*="name" i]').first();
      if (await nameInput.isVisible() && await nameInput.isEditable()) {
        const currentValue = await nameInput.inputValue();
        await nameInput.fill(currentValue + ' test');

        // Find save button
        const saveButton = page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Should show success message
          const successMessage = page.locator('[class*="success"], [role="alert"]');
          await expect(successMessage.first()).toBeVisible({ timeout: 5000 });
        }

        // Revert change
        await nameInput.fill(currentValue);
      }

      consoleTracker.assertNoErrors();
    });

    test('should validate form inputs', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      await waitForPageLoad(page);

      // Find email input
      const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();

      if (await emailInput.isVisible() && await emailInput.isEditable()) {
        // Enter invalid email
        await emailInput.fill('invalid-email');
        await emailInput.blur();

        // Should show validation error
        const error = page.locator('[class*="error"]');
        await expect(error.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Settings Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/dashboard/settings/profile');
      await waitForPageLoad(page);

      // Check inputs have labels
      const inputs = await page.locator('input:not([type="hidden"])').all();

      for (const input of inputs.slice(0, 5)) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || placeholder).toBeTruthy();
        }
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard/settings');
      await waitForPageLoad(page);

      // Tab through elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });
  });
});
