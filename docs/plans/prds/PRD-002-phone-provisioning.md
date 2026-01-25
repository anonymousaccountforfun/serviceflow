# PRD-002: Phone Provisioning Flow

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 1 - Foundation |
| **Estimated Effort** | 3 days |
| **Dependencies** | Twilio account with provisioning enabled |
| **Owner** | Full-stack Team |

## Problem Statement

Onboarding collects phone preferences (area code or existing number) but doesn't actually provision or configure the phone number. Users complete "setup" and land on an empty dashboard with no working phone.

**Current Flow**:
1. User selects area code or enters existing number
2. Data saved to organization settings
3. **Nothing actually happens with Twilio**
4. User expects calls to work, but they don't

## Goals

1. Actually provision Twilio phone numbers during onboarding
2. Configure webhooks automatically so calls route correctly
3. Support "bring your own number" flow for existing Twilio users
4. 100% of onboarded users have a working phone number

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Phone setup completion | 95% | % of users who complete phone step |
| Time to first call | <5 minutes | From signup to receiving test call |
| Provisioning failures | <2% | Failed Twilio API calls |
| Webhook configuration | 100% | All numbers have correct webhooks |

## Functional Requirements

### FR-1: Phone Number Search
- Search available numbers by area code via Twilio API
- Display 5-10 options with locality info
- Allow user to select preferred number
- Show pricing ($1-2/month typical)

### FR-2: Phone Number Purchase
- Purchase selected number via Twilio API
- Store Twilio SID in PhoneNumber record
- Configure voice webhook URL automatically
- Configure SMS webhook URL automatically
- Verify webhooks are accessible

### FR-3: Existing Number Connection
- Accept Twilio phone number SID
- Verify user owns the number (Twilio account check)
- Update webhook URLs to point to ServiceFlow
- Preserve existing configuration where possible

### FR-4: Onboarding Integration
- Replace current "phone setup" step with real flow
- Show provisioning progress (searching → purchasing → configuring)
- Handle failures gracefully with retry option
- Skip to dashboard only after phone is verified working

### FR-5: Phone Management Settings
- View connected phone numbers
- Add additional numbers
- Remove/release numbers
- Update webhook configurations

## Technical Design

### API Endpoints

```typescript
// Search available numbers
GET /api/phone-numbers/search?areaCode=512&limit=10
Response: { numbers: [{ number: "+15125551234", locality: "Austin", price: 1.50 }] }

// Provision new number
POST /api/phone-numbers/provision
Body: { phoneNumber: "+15125551234", label: "Main Line" }
Response: { id: "uuid", number: "+15125551234", status: "active" }

// Connect existing number
POST /api/phone-numbers/connect
Body: { twilioSid: "PNxxx", label: "Existing Line" }
Response: { id: "uuid", number: "+15125551234", status: "active" }

// Verify webhooks
POST /api/phone-numbers/:id/verify
Response: { voice: true, sms: true, errors: [] }
```

### Database Changes
```prisma
model PhoneNumber {
  id             String   @id @default(cuid())
  organizationId String
  number         String   // E.164 format
  twilioSid      String   // Twilio Phone Number SID
  label          String?  // "Main Line", "After Hours", etc.
  status         PhoneNumberStatus @default(pending)
  voiceWebhook   String?
  smsWebhook     String?
  createdAt      DateTime @default(now())

  organization   Organization @relation(...)
}

enum PhoneNumberStatus {
  pending
  active
  suspended
  released
}
```

### Webhook URLs
```
Voice: https://api.serviceflow.com/webhooks/twilio/voice
SMS: https://api.serviceflow.com/webhooks/twilio/sms
Status: https://api.serviceflow.com/webhooks/twilio/status
```

## Tasks for Parallel Execution

### Agent 1: Twilio Service Layer
```
Task: Create TwilioPhoneService for number management

Subtasks:
1. Create apps/api/src/services/twilio-phone.ts
2. Implement searchAvailableNumbers(areaCode, limit)
3. Implement purchaseNumber(phoneNumber, orgId)
4. Implement configureWebhooks(twilioSid, voiceUrl, smsUrl)
5. Implement releaseNumber(twilioSid)
6. Implement verifyWebhooks(twilioSid) - test that webhooks respond
7. Add error handling for Twilio API failures
8. Write unit tests with mocked Twilio client

Acceptance Criteria:
- Can search, purchase, configure, and release numbers
- Webhooks are correctly configured on purchase
- Errors are handled gracefully with retry logic
```

### Agent 2: API Routes
```
Task: Create phone number management API routes

Subtasks:
1. Create apps/api/src/routes/phone-numbers.ts (or update existing)
2. GET /search - search available numbers
3. POST /provision - purchase and configure new number
4. POST /connect - connect existing Twilio number
5. POST /:id/verify - verify webhooks working
6. DELETE /:id - release number
7. Add auth middleware - only org admins can manage phones
8. Write API integration tests

Acceptance Criteria:
- All endpoints work with proper auth
- Provisioning creates working phone in <30 seconds
- Verification confirms webhooks respond correctly
```

### Agent 3: Onboarding UI Update
```
Task: Update onboarding phone step with real provisioning

Subtasks:
1. Update apps/web/app/onboarding/page.tsx PhoneSetupStep
2. Add number search UI when "Get new number" selected
3. Show search results with selection
4. Add provisioning progress indicator
5. Add error handling with retry button
6. Only allow "Continue" after phone verified
7. Update "Use existing" flow to accept Twilio SID
8. Test full onboarding flow end-to-end

Acceptance Criteria:
- User can search and select phone number
- Progress shown during provisioning
- Cannot proceed until phone is working
- Errors show clear retry options
```

## UI Mockups

### Phone Search Results
```
┌────────────────────────────────────────────────┐
│ Available Numbers in 512                       │
├────────────────────────────────────────────────┤
│ ○ (512) 555-1234  Austin, TX      $1.50/mo    │
│ ○ (512) 555-5678  Round Rock, TX  $1.50/mo    │
│ ● (512) 555-9012  Austin, TX      $1.50/mo    │ ← Selected
│ ○ (512) 555-3456  Cedar Park, TX  $1.50/mo    │
├────────────────────────────────────────────────┤
│                      [ Get This Number ]       │
└────────────────────────────────────────────────┘
```

### Provisioning Progress
```
┌────────────────────────────────────────────────┐
│ Setting up your phone number...                │
├────────────────────────────────────────────────┤
│ ✓ Purchasing (512) 555-9012                    │
│ ✓ Configuring voice handling                   │
│ ● Configuring SMS handling...                  │
│ ○ Verifying connection                         │
├────────────────────────────────────────────────┤
│           [=====>                    ] 60%     │
└────────────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Latency**: Number purchase <10 seconds
- **Reliability**: 99% success rate on provisioning
- **Security**: Twilio credentials never exposed to frontend
- **Cost**: Track per-org phone costs for billing

## Rollout Plan

1. **Day 1**: Implement Twilio service layer
2. **Day 2**: Build API routes, test with Postman
3. **Day 3**: Update onboarding UI, end-to-end testing

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Twilio API rate limits | Queue requests, implement backoff |
| Number not available | Search multiple area codes, suggest alternatives |
| Webhook verification fails | Retry with exponential backoff, show manual instructions |

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
