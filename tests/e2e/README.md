# ServiceFlow E2E Test Suite

Comprehensive end-to-end testing for ServiceFlow using Playwright.

## Test Coverage

| Suite | Priority | Description |
|-------|----------|-------------|
| `auth.spec.ts` | P0 | Authentication flows (sign-in, sign-up, sign-out) |
| `dashboard.spec.ts` | P0 | Main dashboard, metrics, navigation |
| `customers.spec.ts` | P0 | Customer CRUD operations |
| `jobs.spec.ts` | P0 | Job management and status updates |
| `calendar.spec.ts` | P1 | Calendar views and appointment scheduling |
| `inbox.spec.ts` | P0 | Message inbox and conversations |
| `onboarding.spec.ts` | P0 | New user onboarding wizard |
| `reviews.spec.ts` | P1 | Review management and Google integration |
| `settings.spec.ts` | P1 | All settings pages |
| `performance.spec.ts` | P1 | Page load times and Core Web Vitals |
| `accessibility.spec.ts` | P1 | WCAG 2.1 compliance |

## Setup

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install
```

### Environment Variables

Create a `.env.test` file or set these environment variables:

```bash
# Required for authenticated tests
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password

# Optional: for onboarding tests
TEST_NEW_USER_EMAIL=new-user@example.com
TEST_NEW_USER_PASSWORD=new-user-password

# Base URL (defaults to http://localhost:3000)
TEST_BASE_URL=http://localhost:3000
```

### Authentication State

Tests use pre-authenticated storage state files:

- `tests/e2e/.auth/user.json` - Main test user (completed onboarding)
- `tests/e2e/.auth/new-user.json` - New user (needs onboarding)

The `auth.setup.ts` file creates these automatically when tests run.

## Running Tests

### All Tests

```bash
# Run all tests
npx playwright test

# Run with headed browser (visible)
npx playwright test --headed

# Run with UI mode (interactive)
npx playwright test --ui
```

### Specific Suites

```bash
# Run a specific test file
npx playwright test auth
npx playwright test customers
npx playwright test performance

# Run tests matching a pattern
npx playwright test --grep "should display"
```

### By Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Mobile Chrome
npx playwright test --project=mobile-chrome

# All mobile browsers
npx playwright test --project=mobile-chrome --project=mobile-safari
```

### Debug Mode

```bash
# Debug a specific test
npx playwright test auth --debug

# Step through with Playwright Inspector
PWDEBUG=1 npx playwright test
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E Tests
  env:
    TEST_BASE_URL: ${{ env.PREVIEW_URL }}
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: npx playwright test
```

### Test Results

- HTML Report: `playwright-report/index.html`
- JSON Results: `test-results/results.json`
- Videos/Screenshots: `test-results/` (on failure)

```bash
# View HTML report
npx playwright show-report
```

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../utils/test-helpers';

test.describe('Feature Name', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should do something', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Helper Functions

```typescript
// Wait for page to fully load
await waitForPageLoad(page);

// Wait for Clerk authentication to initialize
await waitForClerk(page);

// Generate random test data
const testData = generateTestData();

// Track console errors
const tracker = setupConsoleErrorTracking(page);
// ... test actions ...
tracker.assertNoErrors();
```

### Best Practices

1. **Use semantic locators**: Prefer `role`, `text`, `label` over CSS classes
2. **Wait for elements**: Always wait for elements before interacting
3. **Isolate tests**: Each test should be independent
4. **Clean up**: Don't leave test data that affects other tests
5. **Handle dynamic content**: Use appropriate waits for API responses

## Test Data Management

### Test Accounts

Create dedicated test accounts in Clerk:
- `test@serviceflow.dev` - Main test user
- `newuser@serviceflow.dev` - Fresh user for onboarding tests

### Data Isolation

Tests should either:
1. Use dedicated test organization
2. Clean up created data after tests
3. Use unique identifiers for test data

## Troubleshooting

### Common Issues

**Tests timeout waiting for elements**
- Increase timeout: `{ timeout: 10000 }`
- Check if element selector is correct
- Verify page is loading properly

**Authentication failures**
- Verify test credentials are correct
- Check if Clerk session has expired
- Re-run auth setup: `npx playwright test --project=setup`

**Flaky tests**
- Add appropriate waits
- Use `test.slow()` for slow tests
- Check for race conditions in API calls

### Debug Commands

```bash
# Run with trace enabled
npx playwright test --trace on

# View trace files
npx playwright show-trace test-results/*/trace.zip

# Take screenshots during test
await page.screenshot({ path: 'debug.png' });
```

## Performance Thresholds

| Metric | Target | Measured By |
|--------|--------|-------------|
| Page Load | < 3s | `performance.spec.ts` |
| FCP | < 1.8s | Core Web Vitals |
| LCP | < 2.5s | Core Web Vitals |
| CLS | < 0.1 | Core Web Vitals |
| API Response | < 1s | API timing |

## Accessibility Checklist

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Heading hierarchy correct
- [ ] Color contrast sufficient
- [ ] Form labels associated
- [ ] Error messages announced
