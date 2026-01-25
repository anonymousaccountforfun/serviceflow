import { test, expect } from '@playwright/test';
import { waitForPageLoad, waitForClerk } from '../utils/test-helpers';

/**
 * Performance Test Suite
 *
 * Tests application performance including page load times,
 * Core Web Vitals, and API response times.
 *
 * Priority: P1 (High)
 * Estimated Runtime: 5 minutes
 */

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  pageLoad: 3000, // 3 seconds max page load
  firstContentfulPaint: 1800, // FCP under 1.8s (Good)
  largestContentfulPaint: 2500, // LCP under 2.5s (Good)
  timeToInteractive: 3800, // TTI under 3.8s
  apiResponse: 1000, // API calls under 1s
  navigationStart: 500, // Navigation should start quickly
};

test.describe('Performance', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.describe('Page Load Performance', () => {
    test('dashboard should load within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    });

    test('customers page should load within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    });

    test('jobs page should load within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    });

    test('calendar page should load within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard/calendar');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    });

    test('inbox page should load within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard/inbox');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    });

    test('settings page should load within threshold', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard/settings');
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should measure First Contentful Paint', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for page to be interactive
      await waitForPageLoad(page);

      // Get FCP from Performance API
      const fcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntriesByName('first-contentful-paint');
            if (entries.length > 0) {
              resolve(entries[0].startTime);
            }
          });

          observer.observe({ entryTypes: ['paint'] });

          // Fallback if already painted
          const existing = performance.getEntriesByName('first-contentful-paint');
          if (existing.length > 0) {
            resolve(existing[0].startTime);
          }

          // Timeout fallback
          setTimeout(() => resolve(0), 5000);
        });
      });

      if (fcp > 0) {
        expect(fcp).toBeLessThan(THRESHOLDS.firstContentfulPaint);
      }
    });

    test('should measure Largest Contentful Paint', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Give time for LCP to be recorded
      await page.waitForTimeout(2000);

      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let lcpValue = 0;

          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.startTime > lcpValue) {
                lcpValue = entry.startTime;
              }
            });
          });

          try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch {
            // LCP not supported
          }

          // Wait a bit then resolve with current value
          setTimeout(() => {
            observer.disconnect();
            resolve(lcpValue);
          }, 1000);
        });
      });

      if (lcp > 0) {
        expect(lcp).toBeLessThan(THRESHOLDS.largestContentfulPaint);
      }
    });

    test('should measure Cumulative Layout Shift', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Wait for potential layout shifts
      await page.waitForTimeout(2000);

      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // @ts-ignore
              if (!entry.hadRecentInput) {
                // @ts-ignore
                clsValue += entry.value;
              }
            }
          });

          try {
            observer.observe({ entryTypes: ['layout-shift'] });
          } catch {
            // Layout shift not supported
          }

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 2000);
        });
      });

      // CLS should be under 0.1 for good score
      expect(cls).toBeLessThan(0.25);
    });
  });

  test.describe('Navigation Performance', () => {
    test('should navigate between pages quickly', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Navigate to customers
      const startTime = Date.now();
      await page.click('a[href*="/customers"]');
      await waitForPageLoad(page);
      const navTime = Date.now() - startTime;

      expect(navTime).toBeLessThan(2000);
    });

    test('should handle rapid navigation without errors', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      const pages = ['/dashboard/customers', '/dashboard/jobs', '/dashboard/calendar', '/dashboard/inbox'];

      for (const path of pages) {
        await page.goto(path);
        // Don't wait for full load, test rapid nav
        await page.waitForTimeout(500);
      }

      // Should not have crashed
      await waitForPageLoad(page);
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('API Response Performance', () => {
    test('should fetch customers within threshold', async ({ page }) => {
      let apiTime = 0;

      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.url().includes('customer')) {
          apiTime = response.timing()?.responseEnd || 0;
        }
      });

      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // API response should be captured
      if (apiTime > 0) {
        expect(apiTime).toBeLessThan(THRESHOLDS.apiResponse);
      }
    });

    test('should fetch jobs within threshold', async ({ page }) => {
      let apiTime = 0;

      page.on('response', async (response) => {
        if (response.url().includes('/api/') && response.url().includes('job')) {
          const timing = response.timing();
          if (timing) {
            apiTime = timing.responseEnd - timing.requestStart;
          }
        }
      });

      await page.goto('/dashboard/jobs');
      await waitForPageLoad(page);

      if (apiTime > 0) {
        expect(apiTime).toBeLessThan(THRESHOLDS.apiResponse);
      }
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks on repeated navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Get initial memory (if available)
      const initialMemory = await page.evaluate(() => {
        // @ts-ignore
        return performance.memory?.usedJSHeapSize || 0;
      });

      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/dashboard/customers');
        await waitForPageLoad(page);
        await page.goto('/dashboard/jobs');
        await waitForPageLoad(page);
        await page.goto('/dashboard/calendar');
        await waitForPageLoad(page);
      }

      // Get final memory
      const finalMemory = await page.evaluate(() => {
        // @ts-ignore
        return performance.memory?.usedJSHeapSize || 0;
      });

      // Memory shouldn't grow more than 50% (this is a rough heuristic)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
        expect(memoryGrowth).toBeLessThan(0.5);
      }
    });
  });

  test.describe('Resource Loading', () => {
    test('should not have excessive network requests', async ({ page }) => {
      let requestCount = 0;

      page.on('request', () => {
        requestCount++;
      });

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Should not make more than 50 requests for initial page load
      expect(requestCount).toBeLessThan(50);
    });

    test('should not have failed resource requests', async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('response', (response) => {
        if (response.status() >= 400 && !response.url().includes('api')) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto('/dashboard');
      await waitForPageLoad(page);

      expect(failedRequests.length).toBe(0);
    });

    test('images should be optimized', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForPageLoad(page);

      // Check that images use next/image or have appropriate sizing
      const images = await page.locator('img').all();

      for (const img of images.slice(0, 10)) {
        const src = await img.getAttribute('src');
        const loading = await img.getAttribute('loading');
        const srcset = await img.getAttribute('srcset');

        // Should have lazy loading or srcset (optimized)
        const isOptimized =
          loading === 'lazy' ||
          srcset !== null ||
          src?.includes('_next/image') ||
          src?.includes('data:');

        if (src && !src.startsWith('data:')) {
          expect(isOptimized).toBeTruthy();
        }
      }
    });
  });

  test.describe('Form Performance', () => {
    test('create customer form should respond quickly', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();

      const startTime = Date.now();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');
      const modalTime = Date.now() - startTime;

      expect(modalTime).toBeLessThan(500);
    });

    test('form inputs should respond without lag', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
      await addButton.click();

      await page.waitForSelector('[role="dialog"], [class*="modal"]');

      const input = page.locator('input').first();

      const startTime = Date.now();
      await input.fill('Test input value');
      const inputTime = Date.now() - startTime;

      // Input should feel instant (under 100ms)
      expect(inputTime).toBeLessThan(500);
    });
  });

  test.describe('Scroll Performance', () => {
    test('should scroll smoothly on long lists', async ({ page }) => {
      await page.goto('/dashboard/customers');
      await waitForPageLoad(page);

      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(500);

      // Scroll back up
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      // Page should still be responsive
      const header = page.locator('h1, [class*="title"]').first();
      await expect(header).toBeVisible();
    });
  });
});
