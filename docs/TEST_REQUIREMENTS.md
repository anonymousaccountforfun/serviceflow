# Pre-Launch Test Requirements Report

> Generated: 1/26/2026, 8:01:56 PM

## Summary

| Metric | Value |
|--------|-------|
| Total Requirements | 8 |
| Ready for Launch | ❌ NO |

### By Status

| Status | Count |
|--------|-------|
| ✅ passing | 1 |
| 📝 written | 5 |
| ⬜ not_started | 2 |

### By Priority

| Priority | Count |
|----------|-------|
| 🔴 P0 (Critical) | 4 |
| 🟡 P1 (High) | 4 |

---

## Requirements by Feature

### AI Voice V1

| ID | Title | Priority | Status | Test File |
|----|-------|----------|--------|----------|
| AI-VOICE-001 | AISettings schema validation | P0 | ✅ passing | `validators.test.ts` |
| AI-VOICE-002 | System prompt includes emergency tiers | P0 | 📝 written | `vapi.test.ts` |
| AI-VOICE-003 | Recording disclosure in greeting | P0 | 📝 written | `vapi.test.ts` |
| AI-VOICE-008 | Tier 0 emergency instructs 911 | P0 | ⬜ not_started | - |
| AI-VOICE-004 | lookup_customer tool returns recent calls | P1 | 📝 written | `vapi.test.ts` |
| AI-VOICE-005 | send_sms_confirmation sends appropriate message | P1 | 📝 written | `vapi.test.ts` |
| AI-VOICE-006 | AI ROI analytics endpoint | P1 | 📝 written | `analytics.test.ts` |
| AI-VOICE-007 | AI Performance dashboard renders | P1 | ⬜ not_started | - |

---

## Detailed Requirements

### AI-VOICE-001: AISettings schema validation

- **Feature:** AI Voice V1
- **Priority:** 🔴 P0 (Critical)
- **Category:** api
- **Status:** ✅ passing
- **Test File:** `packages/shared/src/__tests__/validators.test.ts`
- **Verified:** 2026-01-26T19:42:44Z

Validate all V1 AI settings fields (services, callbacks, pricing, disclosure)

### AI-VOICE-002: System prompt includes emergency tiers

- **Feature:** AI Voice V1
- **Priority:** 🔴 P0 (Critical)
- **Category:** api
- **Status:** 📝 written
- **Test File:** `apps/api/src/services/__tests__/vapi.test.ts`

buildSystemPrompt generates prompt with Tier 0/1/2 emergency handling

### AI-VOICE-003: Recording disclosure in greeting

- **Feature:** AI Voice V1
- **Priority:** 🔴 P0 (Critical)
- **Category:** api
- **Status:** 📝 written
- **Test File:** `apps/api/src/services/__tests__/vapi.test.ts`

Greeting prepends recording disclosure when enabled in settings

### AI-VOICE-004: lookup_customer tool returns recent calls

- **Feature:** AI Voice V1
- **Priority:** 🟡 P1 (High)
- **Category:** api
- **Status:** 📝 written
- **Test File:** `apps/api/src/services/__tests__/vapi.test.ts`

Tool finds customer by phone and returns calls from last 7 days

### AI-VOICE-005: send_sms_confirmation sends appropriate message

- **Feature:** AI Voice V1
- **Priority:** 🟡 P1 (High)
- **Category:** integration
- **Status:** 📝 written
- **Test File:** `apps/api/src/services/__tests__/vapi.test.ts`

Emergency gets URGENT prefix, routine includes opt-out language

### AI-VOICE-006: AI ROI analytics endpoint

- **Feature:** AI Voice V1
- **Priority:** 🟡 P1 (High)
- **Category:** api
- **Status:** 📝 written
- **Test File:** `apps/api/src/routes/__tests__/analytics.test.ts`

/api/analytics/ai-roi returns calls, jobs, value metrics

### AI-VOICE-007: AI Performance dashboard renders

- **Feature:** AI Voice V1
- **Priority:** 🟡 P1 (High)
- **Category:** ui
- **Status:** ⬜ not_started

Dashboard page loads and displays ROI metrics

### AI-VOICE-008: Tier 0 emergency instructs 911

- **Feature:** AI Voice V1
- **Priority:** 🔴 P0 (Critical)
- **Category:** integration
- **Status:** ⬜ not_started

When user mentions gas smell, AI does NOT collect info, instructs to call 911

