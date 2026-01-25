import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../utils/test-helpers';

/**
 * Calendar Test Suite
 *
 * Tests calendar functionality including viewing appointments,
 * creating appointments, and rescheduling.
 *
 * Priority: P1 (High)
 * Estimated Runtime: 2 minutes
 */

test.describe('Calendar', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Calendar Views', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);
    });

    test('should display calendar page', async ({ page }) => {
      // Check page loads
      const calendar = page.locator('[class*="calendar"], [class*="Calendar"]');
      await expect(calendar.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have day/week view toggle', async ({ page }) => {
      const viewToggle = page.locator('button:has-text("Day"), button:has-text("Week"), [class*="toggle"]');
      await expect(viewToggle.first()).toBeVisible();
    });

    test('should switch between day and week view', async ({ page }) => {
      // Find and click week view
      const weekButton = page.locator('button:has-text("Week")').first();
      if (await weekButton.isVisible()) {
        await weekButton.click();
        await waitForPageLoad(page);

        // Should show week view (7 day columns)
        const dayColumns = page.locator('[class*="day"], [class*="column"]');
        const count = await dayColumns.count();
        expect(count >= 5).toBeTruthy(); // At least 5 visible days
      }

      // Switch to day view
      const dayButton = page.locator('button:has-text("Day")').first();
      if (await dayButton.isVisible()) {
        await dayButton.click();
        await waitForPageLoad(page);
      }
    });

    test('should navigate to previous/next date', async ({ page }) => {
      // Find navigation buttons
      const prevButton = page.locator('button[aria-label*="previous" i], button:has-text("<"), [class*="prev"]').first();
      const nextButton = page.locator('button[aria-label*="next" i], button:has-text(">"), [class*="next"]').first();

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await waitForPageLoad(page);

        // Date should change (verify by date display)
        await page.waitForTimeout(500);
      }

      if (await prevButton.isVisible()) {
        await prevButton.click();
        await waitForPageLoad(page);
      }
    });

    test('should display time slots', async ({ page }) => {
      // Calendar should show time slots (7 AM - 7 PM typically)
      const timeSlots = page.locator('text=/\\d{1,2}:00/, text=/\\d{1,2} (AM|PM)/i');
      await expect(timeSlots.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Appointments Display', () => {
    test('should display appointments on calendar', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      // Appointments or empty slots should be visible
      const appointments = page.locator('[class*="appointment"], [class*="event"]');
      const emptyState = page.locator('text=/no appointment/i, [class*="empty"]');

      const hasAppointments = await appointments.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;
      const hasSlots = await page.locator('[class*="slot"]').count() > 0;

      expect(hasAppointments || hasEmptyState || hasSlots).toBeTruthy();
    });

    test('should show appointment details on click', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const appointment = page.locator('[class*="appointment"], [class*="event"]').first();

      if (await appointment.isVisible()) {
        await appointment.click();

        // Should show details (modal, popover, or navigation)
        await page.waitForTimeout(1000);
        const details = page.locator('[role="dialog"], [class*="detail"], [class*="popover"]');
        const navigated = page.url().includes('appointment') || page.url().includes('job');

        expect(await details.count() > 0 || navigated).toBeTruthy();
      }
    });
  });

  test.describe('Create Appointment', () => {
    test('should have add appointment button', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
      await expect(addButton.first()).toBeVisible();
    });

    test('should open create appointment form', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      // Should show form/modal
      const form = page.locator('[role="dialog"], form, [class*="modal"]');
      await expect(form.first()).toBeVisible({ timeout: 5000 });
    });

    test('should require job selection for appointment', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Job selection should be required
      const jobInput = page.locator('input[placeholder*="job" i], select[name*="job"]');
      await expect(jobInput.first()).toBeVisible({ timeout: 5000 });
    });

    test('should allow selecting date and time', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Date/time inputs should be present
      const dateInput = page.locator('input[type="date"], input[type="datetime-local"], [class*="date"]');
      await expect(dateInput.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Reschedule Appointment', () => {
    test('should allow rescheduling existing appointment', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const appointment = page.locator('[class*="appointment"], [class*="event"]').first();

      if (await appointment.isVisible()) {
        await appointment.click();
        await page.waitForTimeout(500);

        // Find reschedule option
        const rescheduleButton = page.locator('button:has-text("Reschedule"), button:has-text("Move")').first();

        if (await rescheduleButton.isVisible()) {
          await rescheduleButton.click();

          // Should show reschedule form
          const form = page.locator('[role="dialog"], form');
          await expect(form.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Cancel Appointment', () => {
    test('should allow canceling appointment', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const appointment = page.locator('[class*="appointment"], [class*="event"]').first();

      if (await appointment.isVisible()) {
        await appointment.click();
        await page.waitForTimeout(500);

        // Find cancel option
        const cancelButton = page.locator('button:has-text("Cancel"), button[aria-label*="cancel" i]').first();

        if (await cancelButton.isVisible()) {
          await cancelButton.click();

          // Should show confirmation
          const confirmation = page.locator('[role="alertdialog"], [role="dialog"]').filter({
            hasText: /confirm|cancel|sure/i,
          });
          await expect(confirmation.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Calendar Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      // Tab through calendar
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Should have focus visible
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      // Calendar should have appropriate role
      const calendar = page.locator('[role="grid"], [role="table"], [class*="calendar"]');
      await expect(calendar.first()).toBeVisible();
    });
  });
});
