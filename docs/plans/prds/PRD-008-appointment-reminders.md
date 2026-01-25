# PRD-008: Appointment Reminders

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Phase** | 2 - Core Workflows |
| **Estimated Effort** | 2 days |
| **Dependencies** | Twilio (already integrated) |
| **Owner** | Backend Team |

## Problem Statement

Customers forget appointments, leading to no-shows. Technicians arrive at empty houses. ServiceFlow has scheduling but **no automated reminders**. Users must manually text each customer, which doesn't scale.

**Impact**:
- 15-20% no-show rate (industry average without reminders)
- Wasted technician time
- Lost revenue from empty slots
- Poor customer experience

## Goals

1. Reduce no-show rate to <5%
2. Zero manual effort for reminders
3. Customers can confirm/reschedule via SMS
4. Technicians see confirmation status

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| No-show rate | <5% | % of scheduled jobs with no customer present |
| Reminder delivery | 99% | % of reminders successfully sent |
| Confirmation rate | 70% | % of customers who confirm |
| Reschedule via reminder | Track | Number of reschedules from reminder link |

## Functional Requirements

### FR-1: Automated Reminder Schedule
- Send reminder 24 hours before appointment
- Send reminder 2 hours before appointment
- Configurable timing per organization
- Skip reminders for same-day bookings made within window

### FR-2: Reminder Content
- Customer name and appointment time
- Service description
- Technician name (if assigned)
- Company contact info
- Confirm/Reschedule links

### FR-3: Customer Actions via SMS
- Reply "C" or "CONFIRM" to confirm
- Reply "R" or "RESCHEDULE" to get reschedule link
- Reply "CANCEL" to cancel appointment
- Automated responses to customer replies

### FR-4: Confirmation Tracking
- Job shows confirmation status (unconfirmed, confirmed, rescheduled, cancelled)
- Dashboard widget for unconfirmed appointments
- Alert for unconfirmed appointments day-of

### FR-5: Organization Settings
- Enable/disable reminders
- Customize reminder timing
- Customize reminder message template
- Set business hours for reminder sending

## Technical Design

### Database Schema
```prisma
model Job {
  // Existing fields...

  // New fields
  reminderStatus    ReminderStatus @default(pending)
  reminder24hSentAt DateTime?
  reminder2hSentAt  DateTime?
  confirmedAt       DateTime?
  confirmationMethod String?  // "sms", "call", "email"
}

model OrganizationSettings {
  // Add to existing settings JSON
  reminders: {
    enabled: boolean
    timing: number[]  // [24, 2] hours before
    template24h: string
    template2h: string
    businessHoursOnly: boolean
  }
}

enum ReminderStatus {
  pending
  sent
  confirmed
  rescheduled
  cancelled
  no_response
}
```

### Reminder Message Templates
```
24-hour reminder:
"Hi {customerName}! Reminder: Your {serviceName} appointment with {businessName} is tomorrow at {time}.

Reply C to confirm, R to reschedule, or CANCEL to cancel.

Questions? Call {businessPhone}"

2-hour reminder:
"Hi {customerName}! {technicianName} from {businessName} will arrive in about 2 hours for your {serviceName} appointment.

Reply C to confirm you're ready!"
```

### Scheduler Implementation
```typescript
// Cron job runs every 15 minutes
async function processReminders() {
  const now = new Date();

  // Find jobs needing 24h reminder
  const jobs24h = await prisma.job.findMany({
    where: {
      scheduledAt: {
        gte: addHours(now, 23),
        lte: addHours(now, 25),
      },
      reminder24hSentAt: null,
      status: { in: ['scheduled', 'confirmed'] },
    },
    include: { customer: true, organization: true },
  });

  for (const job of jobs24h) {
    await sendReminder(job, '24h');
  }

  // Similar for 2h reminders...
}
```

### SMS Webhook Handler
```typescript
// Handle incoming SMS replies
POST /api/webhooks/twilio/sms

if (body.toLowerCase().includes('confirm') || body === 'c') {
  await confirmAppointment(job);
  reply("Thanks for confirming! We'll see you at {time}.");
} else if (body.toLowerCase().includes('reschedule') || body === 'r') {
  reply("To reschedule, click here: {rescheduleLink}");
} else if (body.toLowerCase().includes('cancel')) {
  await cancelAppointment(job);
  reply("Your appointment has been cancelled. To rebook, call {phone}.");
}
```

## Tasks for Parallel Execution

### Agent 1: Reminder Scheduler
```
Task: Build automated reminder system

Subtasks:
1. Create apps/api/src/services/reminder-scheduler.ts
2. Implement processReminders() function
3. Find jobs needing 24h reminders
4. Find jobs needing 2h reminders
5. Send SMS via existing Twilio service
6. Update job reminder status
7. Create cron endpoint POST /api/cron/reminders
8. Add Vercel cron configuration
9. Handle edge cases (same-day bookings, rescheduled jobs)
10. Write scheduler tests

Acceptance Criteria:
- Reminders sent at correct times
- No duplicate reminders
- Handles timezone correctly
- Works with Vercel cron
```

### Agent 2: SMS Reply Handler
```
Task: Handle customer SMS responses

Subtasks:
1. Update apps/api/src/webhooks/twilio.ts for inbound SMS
2. Parse customer replies (confirm, reschedule, cancel)
3. Match SMS to job via phone number lookup
4. Update job confirmation status
5. Send appropriate auto-response
6. Generate reschedule link when requested
7. Log all interactions
8. Handle unknown/unclear responses gracefully

Acceptance Criteria:
- Confirm/reschedule/cancel all work via SMS
- Appropriate responses sent
- Job status updated correctly
- Unknown messages handled gracefully
```

### Agent 3: Confirmation UI & Settings
```
Task: Build confirmation tracking UI

Subtasks:
1. Add reminderStatus field to job cards/list
2. Add confirmation badge to job detail page
3. Create "Unconfirmed Today" dashboard widget
4. Add reminder settings to organization settings page
5. Enable/disable toggle
6. Timing configuration
7. Message template editor
8. Preview reminder message

Acceptance Criteria:
- Can see confirmation status on jobs
- Dashboard shows unconfirmed appointments
- Can configure reminder settings
- Can preview reminder messages
```

## UI Mockups

### Job Card with Confirmation Status
```
┌──────────────────────────────────────────────────────┐
│ 🔧 Fix leaky faucet                    ✓ Confirmed  │
│ John Smith · 2:00 PM                                │
│ 123 Main Street                                      │
│ Assigned: Marcus J.                                  │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ⚡ Electrical panel upgrade            ⏳ Unconfirmed│
│ Sarah Williams · 4:00 PM                            │
│ 456 Oak Avenue                                       │
│ Assigned: Alex R.                                    │
└──────────────────────────────────────────────────────┘
```

### Reminder Settings
```
┌────────────────────────────────────────────────────────────┐
│ Appointment Reminders                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ [✓] Enable automatic appointment reminders                 │
│                                                            │
│ Send reminders:                                            │
│ [✓] 24 hours before appointment                           │
│ [✓] 2 hours before appointment                            │
│ [ ] 1 day before appointment (morning)                    │
│                                                            │
│ 24-Hour Reminder Message:                                  │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Hi {customerName}! Reminder: Your {serviceName}        ││
│ │ appointment with {businessName} is tomorrow at {time}. ││
│ │                                                         ││
│ │ Reply C to confirm, R to reschedule, or CANCEL.        ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Available variables: {customerName}, {serviceName},        │
│ {businessName}, {time}, {date}, {technicianName}          │
│                                                            │
│ [ Preview ] [ Save Changes ]                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Dashboard Widget
```
┌────────────────────────────────────────┐
│ ⚠️ Unconfirmed Today (3)              │
├────────────────────────────────────────┤
│ 10:00 AM - John Smith - HVAC tune-up  │
│ 2:00 PM - Mary Jones - Plumbing       │
│ 4:30 PM - Bob Wilson - Electrical     │
│                                        │
│ [ Send Reminder ] [ View All ]        │
└────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Reliability**: 99.9% reminder delivery
- **Timing**: Reminders sent within 15-minute window of target time
- **Scale**: Support 1000+ reminders/day
- **Compliance**: Include opt-out instructions per TCPA

## Rollout Plan

1. **Day 1**: Reminder scheduler, SMS sending
2. **Day 2**: SMS reply handling, UI updates, testing

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
