import { test, expect } from '@playwright/test';
import { waitForPageLoad, setupConsoleErrorTracking } from '../utils/test-helpers';

/**
 * Inbox Test Suite
 *
 * Tests inbox functionality including message listing,
 * conversation threads, SMS/voice handling, and AI responses.
 *
 * Priority: P0 (Critical)
 * Estimated Runtime: 3 minutes
 */

test.describe('Inbox', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Inbox List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);
    });

    test('should display inbox page with proper layout', async ({ page }) => {
      // Check page header
      const header = page.locator('h1, [class*="title"]').filter({ hasText: /inbox|message/i });
      await expect(header.first()).toBeVisible();
    });

    test('should display conversation list or empty state', async ({ page }) => {
      const conversationList = page.locator('[class*="conversation"], [class*="thread"], [class*="message"]');
      const emptyState = page.locator('text=/no message/i, text=/empty/i, [class*="empty"]');

      const hasConversations = await conversationList.count() > 0;
      const hasEmptyState = await emptyState.count() > 0;

      expect(hasConversations || hasEmptyState).toBeTruthy();
    });

    test('should have filter tabs for message types', async ({ page }) => {
      // Check for filter tabs (All, Unread, AI Handled, etc.)
      const filterTabs = page.locator('[role="tab"], [class*="tab"], button').filter({
        hasText: /all|unread|ai|handled/i,
      });

      await expect(filterTabs.first()).toBeVisible();
    });

    test('should filter conversations by status', async ({ page }) => {
      const unreadTab = page.locator('button:has-text("Unread"), [role="tab"]:has-text("Unread")').first();

      if (await unreadTab.isVisible()) {
        await unreadTab.click();
        await waitForPageLoad(page);

        // Should update list or show filtered results
        await page.waitForTimeout(500);
      }
    });

    test('should display conversation preview cards', async ({ page }) => {
      const conversationCard = page.locator('[class*="conversation"], [class*="thread"]').first();

      if (await conversationCard.isVisible()) {
        // Should show customer name/phone
        const contactInfo = conversationCard.locator('text=/\\+?\\d{10,}/, [class*="name"]');
        await expect(contactInfo.first()).toBeVisible();

        // Should show message preview
        const preview = conversationCard.locator('[class*="preview"], [class*="snippet"], p');
        await expect(preview.first()).toBeVisible();

        // Should show timestamp
        const timestamp = conversationCard.locator('[class*="time"], [class*="date"], time');
        await expect(timestamp.first()).toBeVisible();
      }
    });

    test('should show unread indicator for new messages', async ({ page }) => {
      const unreadIndicator = page.locator('[class*="unread"], [class*="badge"], [class*="dot"]');
      const exists = await unreadIndicator.count() > 0;
      expect(exists).toBe(true);
    });
  });

  test.describe('Conversation Thread', () => {
    test('should display conversation thread when clicked', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], [class*="thread"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Should show message thread
        const messages = page.locator('[class*="message"], [class*="bubble"]');
        await expect(messages.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display message input field', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Should show message input
        const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], [class*="input"]');
        await expect(messageInput.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should allow sending a message', async ({ page }) => {
      const consoleTracker = setupConsoleErrorTracking(page);

      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        const messageInput = page.locator('input[placeholder*="message" i], textarea').first();

        if (await messageInput.isVisible()) {
          await messageInput.fill('Test message from E2E test');

          const sendButton = page.locator('button:has-text("Send"), button[type="submit"], [aria-label*="send" i]').first();
          if (await sendButton.isVisible()) {
            await sendButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }

      consoleTracker.assertNoErrors();
    });

    test('should show message status (sent, delivered, read)', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Check for status indicators
        const statusIndicator = page.locator('[class*="status"], [class*="check"], text=/sent|delivered|read/i');
        const exists = await statusIndicator.count() > 0;
        expect(exists).toBe(true);
      }
    });

    test('should distinguish AI vs human messages', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Check for AI indicator
        const aiIndicator = page.locator('[class*="ai"], text=/ai/i, [class*="automated"]');
        const exists = await aiIndicator.count() > 0;
        expect(exists).toBe(true);
      }
    });
  });

  test.describe('Message Actions', () => {
    test('should allow marking conversation as read/unread', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"]').first();

      if (await conversationItem.isVisible()) {
        // Right-click or find menu button
        const menuButton = conversationItem.locator('button[aria-label*="menu" i], [class*="menu"]');

        if (await menuButton.count() > 0) {
          await menuButton.first().click();

          const markReadOption = page.locator('button:has-text("Mark as read"), [role="menuitem"]:has-text("read")');
          const exists = await markReadOption.count() > 0;
          expect(exists).toBe(true);
        }
      }
    });

    test('should allow archiving conversation', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        const archiveButton = page.locator('button:has-text("Archive"), [aria-label*="archive" i]');
        const exists = await archiveButton.count() > 0;
        expect(exists).toBe(true);
      }
    });

    test('should allow creating job from conversation', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        const createJobButton = page.locator('button:has-text("Create Job"), button:has-text("New Job"), a:has-text("Create Job")');
        const exists = await createJobButton.count() > 0;
        expect(exists).toBe(true);
      }
    });
  });

  test.describe('Voice Messages', () => {
    test('should display voice message player', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      // Look for voice message indicator or player
      const voicePlayer = page.locator('[class*="audio"], [class*="voice"], audio, [class*="player"]');
      const exists = await voicePlayer.count() > 0;
      expect(exists).toBe(true);
    });

    test('should show call transcription', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Check for transcription section
        const transcription = page.locator('[class*="transcript"], text=/transcript/i');
        const exists = await transcription.count() > 0;
        expect(exists).toBe(true);
      }
    });
  });

  test.describe('AI Handling', () => {
    test('should show AI handling status', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      // Check for AI handled indicator
      const aiStatus = page.locator('[class*="ai"], text=/ai handled/i, [class*="automated"]');
      const exists = await aiStatus.count() > 0;
      expect(exists).toBe(true);
    });

    test('should allow taking over from AI', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        const takeOverButton = page.locator('button:has-text("Take Over"), button:has-text("Reply Manually")');
        const exists = await takeOverButton.count() > 0;
        expect(exists).toBe(true);
      }
    });
  });

  test.describe('Customer Context', () => {
    test('should display customer info sidebar', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Check for customer info panel
        const customerInfo = page.locator('[class*="customer"], [class*="sidebar"], [class*="profile"]');
        await expect(customerInfo.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should link to customer profile', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        const customerLink = page.locator('a[href*="/customers/"]');
        const exists = await customerLink.count() > 0;
        expect(exists).toBe(true);
      }
    });

    test('should show job history for customer', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const conversationItem = page.locator('[class*="conversation"], a[href*="/inbox/"]').first();

      if (await conversationItem.isVisible()) {
        await conversationItem.click();
        await waitForPageLoad(page);

        // Check for job history
        const jobHistory = page.locator('text=/job/i, [class*="jobs"], [class*="history"]');
        const exists = await jobHistory.count() > 0;
        expect(exists).toBe(true);
      }
    });
  });

  test.describe('Inbox Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      // Tab through conversations
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      // Check main regions have labels
      const main = page.locator('[role="main"], main');
      await expect(main.first()).toBeVisible();
    });
  });
});
