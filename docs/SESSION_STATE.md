# Session State - AI Voice V1 & Test Requirements

> Last updated: 2026-01-27

## Summary

Implemented AI Voice V1 features and a pre-launch test requirements tracking system. Almost complete - just need manual verification of the AI Performance dashboard.

---

## What's Complete

### AI Voice V1 Features
- ✅ Extended AISettings schema with V1 fields
- ✅ Enhanced buildSystemPrompt with emergency tiers (Tier 0/1/2)
- ✅ Added lookup_customer tool (finds customer by phone, returns recent calls)
- ✅ Added send_sms_confirmation tool (emergency vs routine messaging)
- ✅ Created /api/analytics/ai-roi endpoint
- ✅ Created AI Performance dashboard page
- ✅ Added AI Performance link to dashboard sidebar

### Test Requirements Tracking System
- ✅ Created `packages/shared/src/testing/` with registry, types, and AI Voice V1 requirements
- ✅ Created `scripts/generate-test-report.ts` for markdown/JSON reports
- ✅ Added `pnpm test:requirements` and `pnpm test:requirements:ci` scripts
- ✅ Created `.github/workflows/test-requirements.yml` for CI

### E2E Testing Infrastructure
- ✅ Created `tests/e2e/specs/ai-performance.spec.ts` with 15 test cases
- ✅ Created `.github/workflows/e2e-tests.yml` for Vercel deployments
- ✅ Updated `tests/e2e/playwright.config.ts` for external URL testing
- ✅ Updated `tests/e2e/auth.setup.ts` with better Clerk handling
- ✅ Deployed latest to Vercel: https://serviceflow-rho.vercel.app

---

## Test Requirements Status

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| AI-VOICE-001 | AISettings schema validation | P0 | ✅ passing |
| AI-VOICE-002 | System prompt includes emergency tiers | P0 | ✅ passing |
| AI-VOICE-003 | Recording disclosure in greeting | P0 | ✅ passing |
| AI-VOICE-008 | Tier 0 emergency instructs 911 | P0 | ✅ passing |
| AI-VOICE-004 | lookup_customer tool returns recent calls | P1 | ✅ passing |
| AI-VOICE-005 | send_sms_confirmation sends appropriate message | P1 | ✅ passing |
| AI-VOICE-006 | AI ROI analytics endpoint | P1 | ✅ passing |
| AI-VOICE-007 | AI Performance dashboard renders | P1 | 📝 written (needs manual verify) |

**Current Status: 7/8 passing, All P0s complete, Ready for Launch: YES**

---

## What's Left To Do

### 1. Manual Verification of AI-VOICE-007
The AI Performance dashboard E2E tests are written but can't run automatically due to Clerk OAuth configuration.

**To verify manually:**
1. Go to https://serviceflow-rho.vercel.app/sign-in
2. Sign in with your account
3. Navigate to AI Performance page in sidebar
4. Confirm it loads and shows ROI metrics

**Then update the requirement:**
```typescript
// In packages/shared/src/testing/features/ai-voice-v1.ts
// Change AI-VOICE-007 status from 'written' to 'manual_verified'
// Add verifiedAt and verifiedBy fields
```

### 2. Fix E2E Authentication (Optional)
The Clerk OAuth auto-redirects Gmail addresses to Google Sign-In before showing "Use password" option.

**Options to fix:**
- Use a non-Gmail test account with email/password auth
- Configure Clerk to not auto-redirect Gmail to Google
- Add GitHub Secrets for CI: `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

### 3. Uncommitted Changes
There are uncommitted changes to auth.setup.ts and playwright.config.ts:
```bash
git status  # Check what's uncommitted
git add -A && git commit -m "fix(e2e): improve Clerk auth handling"
git push origin main
```

---

## Key Files Modified/Created

### New Files
- `packages/shared/src/testing/requirements.ts` - Type definitions
- `packages/shared/src/testing/registry.ts` - TestRequirementsRegistry class
- `packages/shared/src/testing/index.ts` - Exports
- `packages/shared/src/testing/features/ai-voice-v1.ts` - AI Voice V1 requirements
- `scripts/generate-test-report.ts` - Report generator
- `tests/e2e/specs/ai-performance.spec.ts` - AI Performance E2E tests
- `.github/workflows/test-requirements.yml` - CI for requirements check
- `.github/workflows/e2e-tests.yml` - CI for E2E tests on Vercel
- `docs/TEST_REQUIREMENTS.md` - Generated report

### Modified Files
- `package.json` - Added test scripts
- `vercel.json` - Fixed monorepo build config
- `packages/shared/src/index.ts` - Added testing export
- `tests/e2e/playwright.config.ts` - Skip webServer for external URLs
- `tests/e2e/auth.setup.ts` - Better Clerk OAuth handling

---

## Commands Reference

```bash
# Generate test requirements report
pnpm test:requirements

# Run tests
pnpm test --filter @serviceflow/shared  # Validators (33 tests)
pnpm test --filter @serviceflow/api     # API tests (vapi, analytics)

# Run E2E tests against Vercel
TEST_BASE_URL=https://serviceflow-rho.vercel.app \
TEST_USER_EMAIL="your-email" \
TEST_USER_PASSWORD="your-password" \
pnpm test:e2e

# Deploy to Vercel
npx vercel --prod
```

---

## Test User Credentials Attempted
- `test@serviceflow.app` / `TestPassword123!` - OAuth redirect (Google)
- `ebrianhughes@gmail.com` / `NewYork516!!` - OAuth redirect (Google)

**Need:** A test account created with email/password (not Google Sign-In)
