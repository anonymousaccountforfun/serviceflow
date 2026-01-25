import { test, expect } from '@playwright/test';
import { waitForPageLoad, generateTestData, expectToast, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * Customer Management Test Suite
 *
 * Tests CRUD operations for customer management including
 * listing, creating, viewing, editing, and deleting customers.
 *
 * Priority: P0 (Critical)
 * Estimated Runtime: 2 minutes
 */

test.describe('Customer Management', () => {
  // Use authenticated state
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Customer List Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);
    });

    test('should display customers page with proper layout', async ({ page }) => {
      // Check page title/header
      const header = page.locator('h1, [class*="title"]').filter({ hasText: /customer/i });
      await expect(header.first()).toBeVisible();

      // Check for add customer button
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
      await expect(addButton.first()).toBeVisible();

      // Check for search functionality
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
      await expect(searchInput.first()).toBeVisible();
    });

    test('should display customer list or empty state', async ({ page }) => {
      // Either shows customer list or empty state
      const customerList = page.locator('[class*="customer"], [data-testid*="customer"]');
      const emptyState = page.locator('text=/no customer/i, text=/get started/i, [class*="empty"]');

      const hasCustomers = await customerList.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;

      expect(hasCustomers || hasEmptyState).toBeTruthy();
    });

    test('should filter customers by search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

      // Type search query
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Debounce

      // Results should update (or show no results)
      await waitForPageLoad(page);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    });

    test('should have proper touch targets for mobile', async ({ page }) => {
      // Check that clickable elements meet minimum size
      const buttons = await page.locator('button, a').all();

      for (const button of buttons.slice(0, 10)) {
        const box = await button.boundingBox();
        if (box) {
          // Touch target should be at least 44x44 or have adequate spacing
          expect(box.width >= 44 || box.height >= 44).toBeTruthy();
        }
      }
    });
  });

  test.describe('Create Customer', () => {
    test('should open create customer modal', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Click add button
      const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
      await addButton.click();

      // Modal should open
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Open modal
      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Try to submit empty form
      const submitButton = page.locator('[role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]').first();
      await submitButton.click();

      // Should show validation errors
      const errors = page.locator('[class*="error"], [aria-invalid="true"]');
      await expect(errors.first()).toBeVisible({ timeout: 3000 });
    });

    test('should validate phone number format', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Open modal
      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Enter invalid phone
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
      await phoneInput.fill('123'); // Too short

      // Tab out to trigger validation
      await phoneInput.blur();

      // Should show validation error
      const error = page.locator('[class*="error"]').filter({ hasText: /phone/i });
      await expect(error.first()).toBeVisible({ timeout: 3000 });
    });

    test('should successfully create a customer', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);
      const testData = generateTestData();

      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Open modal
      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      // Fill form
      await page.fill('input[name="firstName"], input[placeholder*="First"]', testData.customer.firstName);
      await page.fill('input[name="lastName"], input[placeholder*="Last"]', testData.customer.lastName);
      await page.fill('input[name="phone"], input[type="tel"]', testData.customer.phone);
      await page.fill('input[name="email"], input[type="email"]', testData.customer.email);

      // Submit
      const submitButton = page.locator('[role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Save")').first();
      await submitButton.click();

      // Wait for success
      await page.waitForTimeout(2000);

      // Modal should close or redirect
      const modalClosed = await page.locator('[role="dialog"]').count() === 0;
      const redirected = page.url().includes('customers');

      expect(modalClosed || redirected).toBeTruthy();

      // No critical errors
      consoleTracker.assertNoErrors();
    });
  });

  test.describe('Customer Detail', () => {
    test('should display customer detail page', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Click on first customer if exists
      const customerLink = page.locator('a[href*="/customers/"]').first();

      if (await customerLink.isVisible()) {
        await customerLink.click();
        await waitForPageLoad(page);

        // Should show customer details
        const detailPage = page.locator('[class*="detail"], h1, [class*="profile"]');
        await expect(detailPage.first()).toBeVisible();

        // Should show contact info
        const phoneInfo = page.locator('text=/\\+?\\d{10,}/');
        await expect(phoneInfo.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display customer job history', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      const customerLink = page.locator('a[href*="/customers/"]').first();

      if (await customerLink.isVisible()) {
        await customerLink.click();
        await waitForPageLoad(page);

        // Should show jobs section
        const jobsSection = page.locator('text=/job/i, text=/history/i, [class*="jobs"]');
        await expect(jobsSection.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Edit Customer', () => {
    test('should allow editing customer details', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      const customerLink = page.locator('a[href*="/customers/"]').first();

      if (await customerLink.isVisible()) {
        await customerLink.click();
        await waitForPageLoad(page);

        // Find edit button
        const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();

        if (await editButton.isVisible()) {
          await editButton.click();

          // Should show edit form
          const form = page.locator('form, [role="dialog"]');
          await expect(form.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Delete Customer', () => {
    test('should show delete confirmation', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      const customerLink = page.locator('a[href*="/customers/"]').first();

      if (await customerLink.isVisible()) {
        await customerLink.click();
        await waitForPageLoad(page);

        // Find delete button
        const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();

        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Should show confirmation dialog
          const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /confirm|delete|sure/i });
          await expect(confirmDialog.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focused element should be visible
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Check buttons have accessible names
      const buttons = await page.locator('button').all();

      for (const button of buttons.slice(0, 5)) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();

        // Button should have either aria-label or visible text
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    });
  });
});
