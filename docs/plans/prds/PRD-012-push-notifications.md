# PRD-012: Push Notifications

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Phase** | 3 - Mobile & Field |
| **Estimated Effort** | 2 days |
| **Dependencies** | PRD-009 (Mobile PWA), PRD-004 (Real-time Updates) |
| **Owner** | Full-stack Team |

## Problem Statement

Users must have the app open to know about new calls, messages, or job updates. When the app is closed or in background, critical events are missed. WebSocket real-time updates only work when actively using the app.

**Impact**:
- Missed incoming calls
- Delayed response to customer messages
- Technicians miss new job assignments
- Owners don't know about urgent issues

## Goals

1. Critical events reach users even when app is closed
2. Notification preferences are configurable
3. Tapping notification opens relevant screen
4. Works on mobile PWA and desktop

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Notification delivery | 95% | % of push notifications delivered |
| Tap-through rate | 40% | % of notifications that are tapped |
| Response time improvement | 50% | Reduction in time to respond to events |
| User opt-in rate | 70% | % of users who enable notifications |

## Functional Requirements

### FR-1: Notification Types
- **Incoming call**: New call ringing (high priority)
- **Missed call**: Call went unanswered
- **New message**: SMS or chat received
- **Job assigned**: New job assigned to technician
- **Job updated**: Job status changed
- **Appointment reminder**: Upcoming appointment (for techs)
- **Payment received**: Invoice paid

### FR-2: Notification Preferences
- Enable/disable by notification type
- Quiet hours setting
- Do not disturb mode
- Sound/vibration preferences
- Per-device settings

### FR-3: Deep Linking
- Tap "Incoming call" → opens call screen
- Tap "New message" → opens conversation
- Tap "Job assigned" → opens job detail
- Tap "Payment received" → opens invoice

### FR-4: Notification Actions
- Quick actions without opening app
- "Incoming call" → [Answer] [Decline]
- "New message" → [Reply] [View]
- "Job assigned" → [View] [Navigate]

### FR-5: Badge Counts
- Unread message count on app icon
- Clear badge when viewed

## Technical Design

### Web Push Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server │────▶│ Push Service│
│   (PWA)     │◀────│  (Backend)  │◀────│ (FCM/APNS) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
  Service Worker    Store subscription
```

### Database Schema
```prisma
model PushSubscription {
  id             String   @id @default(cuid())
  userId         String
  endpoint       String   @unique
  p256dh         String   // Public key
  auth           String   // Auth secret
  userAgent      String?
  createdAt      DateTime @default(now())
  lastUsedAt     DateTime @default(now())

  user           User     @relation(...)
}

model NotificationPreference {
  id             String   @id @default(cuid())
  userId         String   @unique

  incomingCall   Boolean  @default(true)
  missedCall     Boolean  @default(true)
  newMessage     Boolean  @default(true)
  jobAssigned    Boolean  @default(true)
  jobUpdated     Boolean  @default(false)
  appointmentReminder Boolean @default(true)
  paymentReceived Boolean @default(true)

  quietHoursStart String?  // "22:00"
  quietHoursEnd   String?  // "07:00"

  user           User     @relation(...)
}
```

### Service Worker Push Handler
```typescript
// In service worker
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: data.tag, // Prevents duplicate notifications
    data: {
      url: data.url, // Deep link
      type: data.type,
    },
    actions: data.actions, // Quick actions
    vibrate: [200, 100, 200],
    requireInteraction: data.priority === 'high',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data.url;
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

### Backend Push Service
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@serviceflow.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(
  userId: string,
  notification: PushNotification
) {
  // Check user preferences
  const prefs = await getNotificationPreferences(userId);
  if (!shouldSend(prefs, notification.type)) return;

  // Check quiet hours
  if (isQuietHours(prefs)) return;

  // Get all user subscriptions (multiple devices)
  const subscriptions = await getPushSubscriptions(userId);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(notification));
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription expired, remove it
        await deletePushSubscription(sub.id);
      }
    }
  }
}
```

### Notification Payloads
```typescript
// Incoming call
{
  type: 'incoming_call',
  title: 'Incoming Call',
  body: 'John Smith is calling',
  tag: 'call-123',
  url: '/calls/123',
  priority: 'high',
  actions: [
    { action: 'answer', title: '📞 Answer' },
    { action: 'decline', title: '❌ Decline' },
  ],
}

// New message
{
  type: 'new_message',
  title: 'New Message',
  body: 'John Smith: "What time will you arrive?"',
  tag: 'message-456',
  url: '/inbox/456',
  priority: 'normal',
  actions: [
    { action: 'reply', title: '💬 Reply' },
  ],
}

// Job assigned
{
  type: 'job_assigned',
  title: 'New Job Assigned',
  body: 'Fix leaky faucet - John Smith - 2:00 PM',
  tag: 'job-789',
  url: '/technician/jobs/789',
  priority: 'normal',
  actions: [
    { action: 'view', title: '👁 View' },
    { action: 'navigate', title: '🗺 Navigate' },
  ],
}
```

## Tasks for Parallel Execution

### Agent 1: Push Infrastructure
```
Task: Set up Web Push infrastructure

Subtasks:
1. Generate VAPID keys, add to environment
2. Install web-push package
3. Create apps/api/src/services/push-notifications.ts
4. POST /api/push/subscribe - save subscription
5. DELETE /api/push/subscribe - remove subscription
6. Create sendPushNotification() function
7. Handle subscription expiration (410 errors)
8. Add push subscription to Prisma schema
9. Run migration
10. Write tests for push service

Acceptance Criteria:
- VAPID keys generated and configured
- Subscriptions stored in database
- Push notifications sent successfully
- Expired subscriptions cleaned up
```

### Agent 2: Service Worker & Client
```
Task: Implement client-side push handling

Subtasks:
1. Update service worker for push events
2. Create notification click handler with deep linking
3. Create usePushNotifications() hook
4. Request notification permission on first use
5. Subscribe to push on permission grant
6. Create "Enable Notifications" prompt component
7. Handle notification actions (answer, reply, etc.)
8. Update badge count on notifications
9. Test on Chrome, Firefox, Safari (iOS limitations)

Acceptance Criteria:
- Permission requested appropriately
- Notifications display correctly
- Clicking opens correct screen
- Quick actions work
```

### Agent 3: Notification Triggers
```
Task: Trigger notifications from events

Subtasks:
1. Send push on incoming call (Twilio webhook)
2. Send push on missed call (after timeout)
3. Send push on new SMS received
4. Send push on job assigned (job PATCH)
5. Send push on payment received (Stripe webhook)
6. Send push on appointment reminder (scheduler)
7. Include relevant deep link URLs
8. Include appropriate actions per type
9. Add logging for notification sends

Acceptance Criteria:
- All event types trigger appropriate notifications
- Deep links open correct screens
- Actions included and functional
```

### Agent 4: Preferences UI
```
Task: Build notification preferences UI

Subtasks:
1. Add NotificationPreference to Prisma schema
2. Create apps/web/app/dashboard/settings/notifications/page.tsx
3. Toggle for each notification type
4. Quiet hours time picker
5. "Test Notification" button
6. API endpoints for preferences CRUD
7. Show current permission status
8. Link to browser/OS notification settings
9. Add to settings navigation

Acceptance Criteria:
- Can enable/disable each notification type
- Can set quiet hours
- Test notification works
- Preferences respected when sending
```

## UI Mockups

### Notification Permission Prompt
```
┌─────────────────────────────────────────┐
│                                         │
│  🔔 Enable Notifications?               │
│                                         │
│  Get notified about:                    │
│  • Incoming calls                       │
│  • New messages                         │
│  • Job assignments                      │
│  • Payment updates                      │
│                                         │
│  You can customize these in Settings.   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        Enable Notifications          ││
│  └─────────────────────────────────────┘│
│                                         │
│  [ Maybe Later ]                        │
│                                         │
└─────────────────────────────────────────┘
```

### Notification Settings Page
```
┌────────────────────────────────────────────────────────────┐
│ Notification Settings                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Status: ✓ Notifications enabled                           │
│ [ Test Notification ]                                      │
│                                                            │
│ ──────────────────────────────────────────────────────    │
│                                                            │
│ Notify me about:                                           │
│                                                            │
│ Incoming calls                              [====ON====]  │
│ Get notified when a call comes in                         │
│                                                            │
│ Missed calls                                [====ON====]  │
│ Get notified about unanswered calls                       │
│                                                            │
│ New messages                                [====ON====]  │
│ Get notified when you receive a message                   │
│                                                            │
│ Job assigned                                [====ON====]  │
│ Get notified when a job is assigned to you                │
│                                                            │
│ Job updates                                 [===OFF===]   │
│ Get notified when job status changes                      │
│                                                            │
│ Payment received                            [====ON====]  │
│ Get notified when a customer pays an invoice              │
│                                                            │
│ ──────────────────────────────────────────────────────    │
│                                                            │
│ Quiet Hours                                                │
│ [ ] Enable quiet hours                                    │
│     From [ 10:00 PM ] to [ 7:00 AM ]                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Example Notifications (Mobile)
```
┌─────────────────────────────────────────┐
│ 📞 Incoming Call                   now  │
│ ServiceFlow                             │
│ John Smith is calling                   │
│ ┌──────────────┐ ┌──────────────┐      │
│ │ 📞 Answer    │ │ ❌ Decline   │      │
│ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💬 New Message                    2m    │
│ ServiceFlow                             │
│ John Smith: "What time will you..."     │
│ ┌──────────────┐                        │
│ │ 💬 Reply     │                        │
│ └──────────────┘                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📋 New Job Assigned               5m    │
│ ServiceFlow                             │
│ Fix leaky faucet - 2:00 PM Today       │
│ ┌──────────────┐ ┌──────────────┐      │
│ │ 👁 View      │ │ 🗺 Navigate  │      │
│ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Delivery**: 95% notification delivery rate
- **Latency**: <5 seconds from event to notification
- **Battery**: Minimal battery impact (uses native push)
- **Privacy**: No sensitive data in notification body

## iOS PWA Limitations

Note: iOS Safari has limited push notification support for PWAs. Full push support requires:
- iOS 16.4+ for PWA push notifications
- User must add to Home Screen
- Document these requirements for users

## Rollout Plan

1. **Day 1**: Push infrastructure, service worker, subscription management
2. **Day 2**: Event triggers, preferences UI, testing

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
