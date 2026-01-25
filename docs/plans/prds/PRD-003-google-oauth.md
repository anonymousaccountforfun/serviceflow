# PRD-003: Google OAuth Integration

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 1 - Foundation |
| **Estimated Effort** | 2 days |
| **Dependencies** | Google Cloud Project |
| **Owner** | Full-stack Team |

## Problem Statement

Google integration shows `alert('Google OAuth flow would start here')` - it's completely unimplemented. Users cannot connect their Google Business Profile to sync reviews.

## Goals

1. Implement real Google OAuth flow
2. Enable Google Business Profile connection
3. Sync reviews from Google automatically
4. Users can connect in <2 minutes

## Success Metrics

| Metric | Target |
|--------|--------|
| OAuth completion rate | 80% |
| Time to connect | <2 minutes |
| Review sync accuracy | 100% |

## Functional Requirements

### FR-1: Google OAuth Flow
- Initiate OAuth with proper scopes
- Handle OAuth callback
- Store refresh token securely
- Show connection status

### FR-2: Business Profile Selection
- After OAuth, show list of connected Business Profiles
- User selects which location to sync
- Store selected location ID

### FR-3: Review Sync
- Fetch reviews from Google My Business API
- Store in local Review model
- Sync on schedule (every 6 hours)
- Manual sync button

## Tasks for Parallel Execution

### Agent 1: OAuth Backend
```
Task: Implement Google OAuth flow

Subtasks:
1. Create apps/api/src/services/google-auth.ts
2. GET /api/google/auth - redirect to Google OAuth
3. GET /api/google/callback - handle OAuth response
4. Store tokens in GoogleIntegration model
5. Implement token refresh logic
6. Add proper scopes for Business Profile API

Acceptance Criteria:
- OAuth flow completes successfully
- Tokens stored securely
- Refresh works automatically
```

### Agent 2: Review Sync
```
Task: Implement Google review sync

Subtasks:
1. Create apps/api/src/services/google-reviews.ts
2. Fetch reviews from Google My Business API
3. Map to local Review model
4. Handle pagination for many reviews
5. Implement scheduled sync (cron)
6. POST /api/google/reviews/sync - manual trigger

Acceptance Criteria:
- Reviews fetched and stored correctly
- Scheduled sync runs every 6 hours
- Manual sync works from UI
```

### Agent 3: Integration UI
```
Task: Build Google integration UI

Subtasks:
1. Update settings/integrations/page.tsx
2. Replace alert() with real OAuth redirect
3. Show connection status (connected/disconnected)
4. Show connected location name
5. Add "Sync Now" button
6. Add "Disconnect" option

Acceptance Criteria:
- Real OAuth flow initiates
- Status accurately reflects connection
- Sync button triggers review fetch
```

---

*PRD Version: 1.0*
