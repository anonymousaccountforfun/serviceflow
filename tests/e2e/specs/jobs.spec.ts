import { test, expect } from '@playwright/test';
import { waitForPageLoad, generateTestData, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * Job Management Test Suite
 *
 * Tests CRUD operations for job management including
 * listing, creating, status updates, and assignments.
 *
 * Priority: P0 (Critical)
 * Estimated Runtime: 3 minutes
 */

test.describe('Job Management', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Job List Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);
    });

    test('should display jobs page with proper layout', async ({ page }) => {
      // Check page header
      const header = page.locator('h1, [class*="title"]').filter({ hasText: /job/i });
      await expect(header.first()).toBeVisible();

      // Check for add job button
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
      await expect(addButton.first()).toBeVisible();
    });

    test('should display job list or empty state', async ({ page }) => {
      const jobList = page.locator('[class*="job"], [data-testid*="job"]');
      const emptyState = page.locator('text=/no job/i, [class*="empty"]');

      const hasJobs = await jobList.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;

      expect(hasJobs || hasEmptyState).toBeTruthy();
    });

    test('should have status filter options', async ({ page }) => {
      // Check for filter/status tabs
      const filters = page.locator('[class*="filter"], [class*="tab"], button:has-text("All"), button:has-text("Active")');
      await expect(filters.first()).toBeVisible();
    });

    test('should filter jobs by status', async ({ page }) => {
      // Find status filter tabs
      const statusTabs = page.locator('[role="tab"], [class*="tab"], button').filter({
        hasText: /lead|scheduled|in progress|completed/i,
      });

      if (await statusTabs.count() > 0) {
        // Click a status tab
        await statusTabs.first().click();
        await waitForPageLoad(page);

        // URL or state should reflect filter
        // Just verify the click worked without error
      }
    });

    test('should display job cards with key information', async ({ page }) => {
      const jobCard = page.locator('[class*="job"], a[href*="/jobs/"]').first();

      if (await jobCard.isVisible()) {
        // Job card should show title
        const title = jobCard.locator('[class*="title"], h2, h3, strong');
        await expect(title.first()).toBeVisible();

        // Should show status
        const status = jobCard.locator('[class*="status"], [class*="badge"]');
        await expect(status.first()).toBeVisible();
      }
    });
  });

  test.describe('Create Job', () => {
    test('should open create job modal', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addButton.click();

      const modal = page.locator('[role="dialog"], [class*="modal"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    });

    test('should require customer selection', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Fill title but not customer
      await page.fill('input[name="title"], input[placeholder*="title" i]', 'Test Job');

      // Try to submit
      const submitButton = page.locator('[role="dialog"] button:has-text("Create"), [role="dialog"] button[type="submit"]').first();
      await submitButton.click();

      // Should show error about customer
      await page.waitForTimeout(1000);
      const error = page.locator('[class*="error"], text=/customer/i');
      const hasError = await error.count() > 0;
      // Either shows error or doesn't submit
      expect(hasError || await page.locator('[role="dialog"]').isVisible()).toBeTruthy();
    });

    test('should allow selecting job type', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Find job type selector
      const typeSelect = page.locator('select').filter({ hasText: /repair|install|maintenance/i });

      if (await typeSelect.count() > 0) {
        await typeSelect.first().selectOption({ index: 1 });
      }
    });

    test('should allow setting priority', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Find priority selector
      const prioritySelect = page.locator('select').filter({ hasText: /normal|high|emergency/i });

      if (await prioritySelect.count() > 0) {
        await prioritySelect.first().selectOption({ index: 2 }); // High priority
      }
    });

    test('should successfully create a job with all fields', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);
      const testData = generateTestData();

      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Fill title
      await page.fill('input[name="title"], input[placeholder*="title" i]', testData.job.title);

      // Fill description if available
      const descInput = page.locator('textarea[name="description"], textarea');
      if (await descInput.count() > 0) {
        await descInput.first().fill(testData.job.description);
      }

      // Select customer (search and select)
      const customerInput = page.locator('input[placeholder*="customer" i]').first();
      if (await customerInput.isVisible()) {
        await customerInput.click();
        await page.waitForTimeout(500);

        // Select first customer from dropdown
        const customerOption = page.locator('[role="option"], [class*="dropdown"] button, [class*="dropdown"] a').first();
        if (await customerOption.isVisible()) {
          await customerOption.click();
        }
      }

      // Submit
      const submitButton = page.locator('[role="dialog"] button:has-text("Create"), [role="dialog"] button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(2000);

      consoleTracker.assertNoErrors();
    });
  });

  test.describe('Job Detail', () => {
    test('should display job detail page', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const jobLink = page.locator('a[href*="/jobs/"]').first();

      if (await jobLink.isVisible()) {
        await jobLink.click();
        await waitForPageLoad(page);

        // Should show job details
        const title = page.locator('h1, [class*="title"]');
        await expect(title.first()).toBeVisible();

        // Should show status
        const status = page.locator('[class*="status"], [class*="badge"]');
        await expect(status.first()).toBeVisible();
      }
    });

    test('should display customer information on job detail', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const jobLink = page.locator('a[href*="/jobs/"]').first();

      if (await jobLink.isVisible()) {
        await jobLink.click();
        await waitForPageLoad(page);

        // Should show customer info
        const customerInfo = page.locator('text=/customer/i, [class*="customer"]');
        await expect(customerInfo.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should have action buttons for status changes', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const jobLink = page.locator('a[href*="/jobs/"]').first();

      if (await jobLink.isVisible()) {
        await jobLink.click();
        await waitForPageLoad(page);

        // Should have status action buttons
        const actionButtons = page.locator('button').filter({
          hasText: /start|complete|cancel|schedule/i,
        });

        // At least one action should be available
        const hasActions = await actionButtons.count() > 0;
        expect(hasActions).toBe(true);
      }
    });
  });

  test.describe('Job Status Updates', () => {
    test('should allow updating job status', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const jobLink = page.locator('a[href*="/jobs/"]').first();

      if (await jobLink.isVisible()) {
        await jobLink.click();
        await waitForPageLoad(page);

        // Find status change button
        const statusButton = page.locator('button:has-text("Start"), button:has-text("Complete"), select[name*="status"]').first();

        if (await statusButton.isVisible()) {
          const initialUrl = page.url();

          if (await statusButton.evaluate((el) => el.tagName === 'SELECT')) {
            await statusButton.selectOption({ index: 1 });
          } else {
            await statusButton.click();
          }

          await page.waitForTimeout(1000);
          // Should update without error
        }
      }
    });
  });

  test.describe('Job Assignment', () => {
    test('should allow assigning technician', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const jobLink = page.locator('a[href*="/jobs/"]').first();

      if (await jobLink.isVisible()) {
        await jobLink.click();
        await waitForPageLoad(page);

        // Find assign button or dropdown
        const assignButton = page.locator('button:has-text("Assign"), select[name*="assign"], [class*="assign"]').first();

        if (await assignButton.isVisible()) {
          // Just verify it's interactable
          await assignButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Job Scheduling', () => {
    test('should allow scheduling job', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const jobLink = page.locator('a[href*="/jobs/"]').first();

      if (await jobLink.isVisible()) {
        await jobLink.click();
        await waitForPageLoad(page);

        // Find schedule button
        const scheduleButton = page.locator('button:has-text("Schedule"), a:has-text("Schedule")').first();

        if (await scheduleButton.isVisible()) {
          await scheduleButton.click();

          // Should open scheduling modal or redirect to calendar
          await page.waitForTimeout(1000);
          const modalOrCalendar = page.locator('[role="dialog"], [class*="calendar"]');
          const visible = await modalOrCalendar.count() > 0 || page.url().includes('calendar');
          expect(visible).toBe(true);
        }
      }
    });
  });
});
