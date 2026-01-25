# Settings PRD: Simpler Than ServiceTitan

**Document Version:** 1.0
**Date:** January 25, 2026
**Author:** Product & Engineering
**Status:** Draft for Review

---

## Executive Summary

ServiceTitan's settings are notoriously complex—dozens of nested menus, hundreds of options, and a learning curve that requires dedicated training. Our opportunity: **settings so simple a plumber can configure them between jobs on their phone.**

This PRD defines a settings experience that is radically simpler while remaining powerful enough to run a home services business.

---

## 1. Problem Statement

### The ServiceTitan Problem

ServiceTitan users report:
- **"It took 3 weeks to set up"** - Complex configuration process
- **"I need to call support for simple changes"** - Hidden settings, unclear labels
- **"I can't do anything on my phone"** - Desktop-only configuration
- **"There are 100 settings I'll never use"** - Feature bloat
- **"It's overkill for my 2-person shop"** - Enterprise-focused

### Our Target User

**Mike, Solo Plumber**
- 47 years old, runs Mike's Plumbing (just him + part-time helper)
- Revenue: $180K/year
- Tech comfort: Uses iPhone for everything, avoids desktop
- Time available for admin: 30 min/day max
- Pain: "I just want it to work. Don't make me think."

**What Mike needs from Settings:**
1. Change business hours when he takes vacation
2. Update his AI greeting seasonally
3. See if his integrations are working
4. Update payment method
5. Turn notifications on/off

**What Mike does NOT need:**
- 47 workflow customization options
- Complex permission matrices
- Custom field builders
- API key management
- Multi-location hierarchies

---

## 2. Design Principles

### Principle 1: One Screen, One Job
Each settings page does exactly one thing. No tabs within tabs. No "Advanced" sections hiding critical options.

### Principle 2: Smart Defaults, Optional Tweaks
Everything works out of the box. Customization is available but never required.

### Principle 3: Mobile-First, Always
Every setting must be configurable on a phone with dirty hands. Large touch targets. No hover states required.

### Principle 4: Show, Don't Tell
Instead of describing what a setting does, show a preview. "Your AI will say: [live preview]"

### Principle 5: Instant Feedback
Every change shows immediate confirmation. No "Save" buttons buried at the bottom. Auto-save with clear feedback.

---

## 3. Information Architecture

```
/dashboard/settings
├── Profile          → Your personal account
├── Business         → Company info & operations
├── Integrations     → Connected services status
├── Notifications    → What alerts you receive
└── Billing          → Plan & payment
```

**Why only 5 sections?**
- ServiceTitan has 20+ top-level settings categories
- Housecall Pro has 12
- We have 5 because that's all a solo operator needs

---

## 4. Detailed Requirements

---

### 4.1 Settings Hub (`/dashboard/settings`)

**Purpose:** Quick overview of account health and navigation to sub-pages.

#### Layout

```
┌─────────────────────────────────────────────────┐
│  Settings                                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ 👤 Profile      │  │ 🏢 Business      │      │
│  │ Mike Johnson    │  │ Mike's Plumbing  │      │
│  │ mike@email.com  │  │ Mon-Fri 8-5      │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ 🔌 Integrations │  │ 🔔 Notifications │      │
│  │ 2 connected     │  │ All enabled      │      │
│  │ ✓ Twilio ✓ GBP │  │                  │      │
│  └─────────────────┘  └─────────────────┘      │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │ 💳 Billing                          │       │
│  │ Starter Plan · Trial: 24 days left  │       │
│  └─────────────────────────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| HUB-1 | Show summary card for each settings section | P0 |
| HUB-2 | Display key info on each card (name, status, quick stat) | P0 |
| HUB-3 | Cards link to respective settings pages | P0 |
| HUB-4 | Show alert badge if action needed (e.g., trial expiring) | P1 |
| HUB-5 | Mobile: Stack cards vertically | P0 |

---

### 4.2 Profile Settings (`/dashboard/settings/profile`)

**Purpose:** Manage personal account information.

**Jobs to Be Done:**
- Update my name if it's wrong
- Change my email address
- Update my phone number
- Change my password
- Upload a profile photo

#### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Settings                                     │
│  Profile                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│         ┌───────┐                               │
│         │  MJ   │  ← Tap to change photo        │
│         └───────┘                               │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ First Name                              │   │
│  │ Mike                              [Edit]│   │
│  ├─────────────────────────────────────────┤   │
│  │ Last Name                               │   │
│  │ Johnson                           [Edit]│   │
│  ├─────────────────────────────────────────┤   │
│  │ Email                                   │   │
│  │ mike@mikesplumbing.com           [Edit]│   │
│  ├─────────────────────────────────────────┤   │
│  │ Phone                                   │   │
│  │ (512) 555-1234                   [Edit]│   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔒 Change Password                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🗑️ Delete Account                 [→]   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| PRO-1 | Display current profile photo or initials | P0 |
| PRO-2 | Tap photo to upload new (camera or gallery) | P1 |
| PRO-3 | Inline edit for first name, last name | P0 |
| PRO-4 | Email change requires verification | P0 |
| PRO-5 | Phone number with formatting | P1 |
| PRO-6 | Password change via Clerk (redirect or modal) | P0 |
| PRO-7 | Delete account with confirmation | P2 |
| PRO-8 | Auto-save on blur with toast confirmation | P0 |

#### API Endpoints

```
GET  /api/users/me           → Get current user
PATCH /api/users/me          → Update user fields
POST /api/users/me/avatar    → Upload avatar
DELETE /api/users/me         → Delete account (with confirmation)
```

---

### 4.3 Business Settings (`/dashboard/settings/business`)

**Purpose:** Configure company operations.

**Jobs to Be Done:**
- Update business name
- Change business hours (vacation, seasonal)
- Customize my AI greeting
- Set my service area
- Update business address

#### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Settings                                     │
│  Business                                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  COMPANY INFO                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Business Name                           │   │
│  │ Mike's Plumbing                   [Edit]│   │
│  ├─────────────────────────────────────────┤   │
│  │ Service Type                            │   │
│  │ Plumber                           [Edit]│   │
│  ├─────────────────────────────────────────┤   │
│  │ Address                                 │   │
│  │ 123 Main St, Austin, TX 78701    [Edit]│   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  BUSINESS HOURS                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Mon  8:00 AM - 5:00 PM            [Edit]│   │
│  │ Tue  8:00 AM - 5:00 PM                  │   │
│  │ Wed  8:00 AM - 5:00 PM                  │   │
│  │ Thu  8:00 AM - 5:00 PM                  │   │
│  │ Fri  8:00 AM - 5:00 PM                  │   │
│  │ Sat  Closed                             │   │
│  │ Sun  Closed                             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  AI ASSISTANT                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Voice Answering           [=========○] │   │
│  │ AI answers calls when you're busy       │   │
│  ├─────────────────────────────────────────┤   │
│  │ Greeting Preview                        │   │
│  │ ┌───────────────────────────────────┐  │   │
│  │ │ 🤖 "Hi, thanks for calling Mike's │  │   │
│  │ │ Plumbing! We're helping another   │  │   │
│  │ │ customer right now..."            │  │   │
│  │ └───────────────────────────────────┘  │   │
│  │                          [Customize →] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  SERVICE AREA                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ ZIP Codes: 78701, 78702, 78703 + 12    │   │
│  │                              [Edit →]   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| BUS-1 | Edit business name with instant save | P0 |
| BUS-2 | Service type dropdown (Plumber, HVAC, Electrician, Other) | P1 |
| BUS-3 | Business address with autocomplete | P1 |
| BUS-4 | Business hours editor (reuse onboarding component) | P0 |
| BUS-5 | Quick presets for hours (Mon-Fri 8-5, etc.) | P1 |
| BUS-6 | Voice answering toggle with immediate effect | P0 |
| BUS-7 | AI greeting preview (live render) | P0 |
| BUS-8 | Greeting customization modal/page | P0 |
| BUS-9 | Service area ZIP code editor | P1 |
| BUS-10 | Service area radius option (alternative to ZIP) | P2 |

#### AI Greeting Customization Modal

```
┌─────────────────────────────────────────────────┐
│  Customize AI Greeting                     [X]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your AI assistant will say this when           │
│  answering calls:                               │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Hi, thanks for calling {{business}}!    │   │
│  │ We're helping another customer right    │   │
│  │ now, but we'll get back to you shortly. │   │
│  │ Can I get your name and what you're     │   │
│  │ calling about?                          │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Available variables:                           │
│  {{business}} - Your business name              │
│  {{hours}} - Today's hours                      │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔊 Preview Voice                        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Reset to Default]              [Save Changes] │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### API Endpoints

```
GET  /api/organizations/settings     → Get org settings
PUT  /api/organizations/settings     → Update org settings
POST /api/organizations/settings/preview-voice → Generate voice preview
```

---

### 4.4 Integrations Settings (`/dashboard/settings/integrations`)

**Purpose:** View and manage connected services.

**Jobs to Be Done:**
- See if my phone number is working
- Connect Google Business Profile
- Check integration health
- Reconnect if something breaks

#### Design Philosophy

**Status-focused, not configuration-focused.**

Unlike ServiceTitan (which shows 50+ integration options), we show:
1. What's connected
2. Is it working?
3. How to fix it if not

#### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Settings                                     │
│  Integrations                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  PHONE & SMS                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 📞 Twilio                               │   │
│  │ ✓ Connected                             │   │
│  │                                         │   │
│  │ Phone Number                            │   │
│  │ +1 (512) 555-0123                       │   │
│  │                                         │   │
│  │ This Month                              │   │
│  │ 47 calls · 156 SMS sent                 │   │
│  │                                         │   │
│  │ [Test Call]  [Test SMS]                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  REVIEWS                                        │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔍 Google Business Profile              │   │
│  │ ✓ Connected                             │   │
│  │                                         │   │
│  │ Mike's Plumbing                         │   │
│  │ Last synced: 2 hours ago                │   │
│  │ 47 reviews · 4.8 avg rating             │   │
│  │                                         │   │
│  │ [Sync Now]  [Disconnect]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📘 Facebook                             │   │
│  │ ○ Not Connected                         │   │
│  │                                         │   │
│  │ Connect to sync Facebook reviews        │   │
│  │                                         │   │
│  │ [Connect Facebook]                      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  AI VOICE                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ 🤖 Vapi Voice AI                        │   │
│  │ ✓ Active                                │   │
│  │                                         │   │
│  │ AI minutes this month: 23 / 100         │   │
│  │ ████████░░░░░░░░░░░░ 23%                │   │
│  │                                         │   │
│  │ [Test AI Call]                          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| INT-1 | Show Twilio connection status | P0 |
| INT-2 | Display connected phone number | P0 |
| INT-3 | Show usage stats (calls, SMS this month) | P1 |
| INT-4 | Test call/SMS buttons (send to own phone) | P2 |
| INT-5 | Google Business Profile connection status | P0 |
| INT-6 | Google OAuth connect flow | P0 |
| INT-7 | Manual review sync button | P1 |
| INT-8 | Disconnect Google option | P1 |
| INT-9 | Facebook placeholder (future) | P2 |
| INT-10 | Vapi AI status and usage | P1 |
| INT-11 | AI minutes usage bar | P1 |
| INT-12 | Error states with reconnect CTA | P0 |

#### Error States

```
┌─────────────────────────────────────────────────┐
│ 📞 Twilio                                       │
│ ⚠️ Connection Error                             │
│                                                 │
│ We can't reach your phone number.               │
│ Calls and texts may not be working.             │
│                                                 │
│ [Reconnect]  [Contact Support]                  │
└─────────────────────────────────────────────────┘
```

#### API Endpoints

```
GET  /api/integrations/status        → Get all integration statuses
POST /api/integrations/twilio/test   → Send test call/SMS
GET  /api/google/status              → Google connection status
POST /api/google/connect             → Start OAuth flow
POST /api/google/disconnect          → Disconnect Google
POST /api/google/reviews/sync        → Manual sync
GET  /api/integrations/vapi/status   → Vapi status and usage
```

---

### 4.5 Notifications Settings (`/dashboard/settings/notifications`)

**Purpose:** Control what alerts you receive and how.

**Jobs to Be Done:**
- Stop getting too many notifications
- Make sure I get emergency alerts
- Choose SMS vs email vs push

#### Design Philosophy

**Two-level control:**
1. **Channel level:** Do I want SMS? Email? Push?
2. **Event level:** Which events matter to me?

ServiceTitan has 100+ notification toggles. We have ~10.

#### Layout

```
┌─────────────────────────────────────────────────┐
│  ← Settings                                     │
│  Notifications                                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHANNELS                                       │
│  How do you want to be notified?                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📱 Push Notifications      [=========○]│   │
│  │ Alerts on your phone                    │   │
│  ├─────────────────────────────────────────┤   │
│  │ 💬 SMS                     [=========○]│   │
│  │ Text messages to (512) 555-1234         │   │
│  ├─────────────────────────────────────────┤   │
│  │ 📧 Email                   [=========○]│   │
│  │ Emails to mike@mikesplumbing.com        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  EVENTS                                         │
│  What do you want to know about?                │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                          Push SMS Email │   │
│  │ ─────────────────────────────────────── │   │
│  │ 📞 Missed calls           ✓    ✓    ○  │   │
│  │ 💬 New messages           ✓    ○    ○  │   │
│  │ 📅 Appointment reminders  ✓    ✓    ○  │   │
│  │ ⭐ New reviews            ✓    ○    ✓  │   │
│  │ 💰 Payments received      ✓    ○    ✓  │   │
│  │ 🚨 Emergency requests     ✓    ✓    ✓  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  QUIET HOURS                                    │
│  ┌─────────────────────────────────────────┐   │
│  │ 🌙 Do Not Disturb         [=========○] │   │
│  │ Silence non-emergency notifications     │   │
│  │                                         │   │
│  │ From  [9:00 PM]  to  [7:00 AM]         │   │
│  │                                         │   │
│  │ ⚠️ Emergency calls always come through  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NOT-1 | Master toggles for Push, SMS, Email channels | P0 |
| NOT-2 | Per-event notification matrix | P0 |
| NOT-3 | Events: Missed calls, New messages, Appointments, Reviews, Payments, Emergency | P0 |
| NOT-4 | Quiet hours toggle with time pickers | P1 |
| NOT-5 | Emergency always bypasses quiet hours | P0 |
| NOT-6 | Auto-save all changes | P0 |
| NOT-7 | Show current phone/email in channel labels | P1 |
| NOT-8 | Test notification button | P2 |

#### API Endpoints

```
GET  /api/users/me/notifications     → Get notification preferences
PUT  /api/users/me/notifications     → Update preferences
POST /api/users/me/notifications/test → Send test notification
```

---

### 4.6 Billing Settings (`/dashboard/settings/billing`)

**Purpose:** Manage subscription and payments.

**Jobs to Be Done:**
- See what plan I'm on
- Know when my trial ends
- Upgrade to get more features
- Update payment method
- Download invoices

#### Layout - Trial User

```
┌─────────────────────────────────────────────────┐
│  ← Settings                                     │
│  Billing                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎉 You're on a free trial!              │   │
│  │                                         │   │
│  │ ████████████████░░░░ 24 days left       │   │
│  │                                         │   │
│  │ Your trial includes all Starter         │   │
│  │ features. Add payment to continue       │   │
│  │ after your trial ends.                  │   │
│  │                                         │   │
│  │ [Add Payment Method]                    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  CHOOSE YOUR PLAN                               │
│                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ STARTER     │ │ GROWTH      │ │ SCALE     │ │
│  │             │ │ Popular ⭐  │ │           │ │
│  │ $149/mo     │ │ $299/mo     │ │ $499/mo   │ │
│  │             │ │             │ │           │ │
│  │ • 1 phone   │ │ • 3 phones  │ │ • 10 phone│ │
│  │ • 500 SMS   │ │ • 1500 SMS  │ │ • Unlim.  │ │
│  │ • 2 users   │ │ • 100 AI min│ │ • 300 AI  │ │
│  │             │ │ • 5 users   │ │ • Unlim.  │ │
│  │             │ │             │ │   users   │ │
│  │ [Current]   │ │ [Upgrade]   │ │ [Upgrade] │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Layout - Paying Customer

```
┌─────────────────────────────────────────────────┐
│  ← Settings                                     │
│  Billing                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  CURRENT PLAN                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Growth Plan                $299/month   │   │
│  │ Next billing: February 25, 2026         │   │
│  │                                         │   │
│  │ [Change Plan]  [Cancel Subscription]    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  USAGE THIS MONTH                               │
│  ┌─────────────────────────────────────────┐   │
│  │ SMS Messages                            │   │
│  │ 892 / 1,500        ████████████░░░ 59%  │   │
│  │                                         │   │
│  │ AI Voice Minutes                        │   │
│  │ 47 / 100           ████████░░░░░░░ 47%  │   │
│  │                                         │   │
│  │ Team Members                            │   │
│  │ 2 / 5              ████░░░░░░░░░░░ 40%  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  PAYMENT METHOD                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 💳 Visa ending in 4242                  │   │
│  │ Expires 12/2027                         │   │
│  │                           [Update Card] │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  BILLING HISTORY                                │
│  ┌─────────────────────────────────────────┐   │
│  │ Jan 25, 2026  Growth Plan    $299  [↓]  │   │
│  │ Dec 25, 2025  Growth Plan    $299  [↓]  │   │
│  │ Nov 25, 2025  Starter Plan   $149  [↓]  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| BIL-1 | Show current plan name and price | P0 |
| BIL-2 | Trial status with days remaining | P0 |
| BIL-3 | Plan comparison cards | P0 |
| BIL-4 | Upgrade button → Stripe Checkout | P0 |
| BIL-5 | Usage meters (SMS, AI minutes, users) | P1 |
| BIL-6 | Usage warnings at 80% | P1 |
| BIL-7 | Payment method display (last 4 digits) | P0 |
| BIL-8 | Update card → Stripe Portal | P0 |
| BIL-9 | Billing history with invoice downloads | P1 |
| BIL-10 | Cancel subscription with confirmation | P1 |
| BIL-11 | Downgrade flow | P2 |

#### API Endpoints

```
GET  /api/billing/subscription       → Current plan, status, usage
POST /api/billing/checkout           → Create Stripe checkout session
POST /api/billing/portal             → Create Stripe portal session
GET  /api/billing/invoices           → List invoices
GET  /api/billing/invoices/:id/pdf   → Download invoice PDF
POST /api/billing/cancel             → Cancel subscription
```

---

## 5. Competitive Comparison

| Feature | ServiceFlow | ServiceTitan | Housecall Pro |
|---------|-------------|--------------|---------------|
| **Settings pages** | 5 | 20+ | 12 |
| **Time to configure** | 5 min | 3 weeks | 2 hours |
| **Mobile settings** | Full | None | Partial |
| **AI configuration** | 1 toggle + greeting | N/A | N/A |
| **Integration setup** | Auto-connected | Manual | Manual |
| **Plan changes** | Self-serve | Call sales | Self-serve |

---

## 6. Technical Implementation

### Component Architecture

```
/app/dashboard/settings/
├── page.tsx                    # Hub with cards
├── profile/
│   └── page.tsx               # Profile form
├── business/
│   ├── page.tsx               # Business settings
│   └── components/
│       ├── BusinessHoursEditor.tsx
│       ├── GreetingCustomizer.tsx
│       └── ServiceAreaEditor.tsx
├── integrations/
│   └── page.tsx               # Integration status cards
├── notifications/
│   └── page.tsx               # Notification matrix
└── billing/
    └── page.tsx               # Subscription management
```

### Shared Components

```typescript
// Reusable settings components
<SettingsSection title="Company Info">
  <SettingsField label="Business Name" value={name} onSave={...} />
</SettingsSection>

<ToggleField
  label="Voice Answering"
  description="AI answers calls when you're busy"
  value={enabled}
  onChange={...}
/>

<IntegrationCard
  name="Twilio"
  icon={Phone}
  status="connected" | "error" | "disconnected"
  stats={[{label: "Calls", value: 47}]}
  actions={[{label: "Test", onClick: ...}]}
/>
```

### State Management

- **Server state:** React Query for fetching/caching settings
- **Form state:** Local state with auto-save on blur
- **Optimistic updates:** Show change immediately, revert on error

### Auto-Save Pattern

```typescript
const handleFieldChange = async (field: string, value: any) => {
  // Optimistic update
  setLocalState(prev => ({...prev, [field]: value}));

  // Show saving indicator
  setSaving(true);

  try {
    await api.updateSettings({ [field]: value });
    toast.success('Saved');
  } catch (error) {
    // Revert on error
    setLocalState(prev => ({...prev, [field]: originalValue}));
    toast.error('Failed to save');
  } finally {
    setSaving(false);
  }
};
```

---

## 7. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Settings completion rate** | >80% | % of users who visit settings and make at least 1 change |
| **Time to configure** | <5 min | Time from first settings visit to last change |
| **Support tickets about settings** | <5% | % of tickets mentioning settings confusion |
| **Mobile settings usage** | >40% | % of settings changes made on mobile |
| **AI greeting customization** | >30% | % of users who customize their greeting |

---

## 8. Out of Scope (Phase 1)

The following are intentionally NOT included in this phase:

- Multi-location settings
- Team permission management (beyond owner/tech)
- Custom fields
- Workflow automation builder
- API key management
- White-labeling
- Custom integrations
- Advanced reporting configuration
- Inventory settings
- Equipment tracking settings

These may be added in future phases for Growth/Scale tier customers.

---

## 9. Open Questions

1. **Photo storage:** Where do we store profile/logo images? (Recommendation: Vercel Blob or Cloudinary)

2. **Quiet hours enforcement:** Should quiet hours apply to all channels or just push? (Recommendation: All channels except emergency SMS)

3. **Billing invoices:** Generate PDFs ourselves or use Stripe's invoice PDFs? (Recommendation: Use Stripe's)

4. **Delete account:** What's the data retention policy? (Need legal input)

---

## 10. Implementation Order

| Week | Deliverable |
|------|-------------|
| 1 | Settings hub + Profile page |
| 1 | Business page (reuse onboarding components) |
| 2 | Integrations page (status display only) |
| 2 | Notifications page |
| 3 | Billing page (requires Stripe integration) |

**Total estimate:** 2-3 weeks of focused vibe-coding

---

## Appendix: ServiceTitan Settings Comparison

For reference, here's what ServiceTitan's settings look like:

```
ServiceTitan Settings Menu (partial):
├── Company Settings
│   ├── Company Info
│   ├── Locations (12 sub-pages)
│   ├── Business Units
│   ├── Departments
│   └── ...
├── User Management
│   ├── Users
│   ├── Roles (47 permissions)
│   ├── Security
│   └── ...
├── Operations
│   ├── Job Types (custom fields)
│   ├── Job Tags
│   ├── Job Priorities
│   ├── Workflows (visual builder)
│   └── ...
├── Pricing
│   ├── Price Books
│   ├── Materials
│   ├── Labor Rates
│   └── ...
├── Integrations
│   ├── Accounting (12 options)
│   ├── Marketing (8 options)
│   ├── Payments (5 options)
│   └── ...
└── [40+ more categories...]
```

**Our approach:** We don't compete on features. We win on simplicity.
