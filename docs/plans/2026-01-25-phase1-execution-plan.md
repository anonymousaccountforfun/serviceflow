# Phase 1: Foundation - Execution Plan

**Date:** January 25, 2026
**Duration:** 12 Weeks (Months 0-3)
**Theme:** "Make it work for real users"
**Approach:** Vibe-coded with Claude Code

---

## Confirmed Strategic Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Auth Model** | One User = One Org | Simple onboarding for solo plumbers, add team invites Phase 2 |
| **Stripe Scope** | Full (Subscriptions + Invoice Payments) | Complete value prop, Connect can slip to Phase 1.5 if needed |
| **Job Queue** | BullMQ + Redis | Battle-tested, reliable event processing |
| **Estimate Delivery** | SMS Link + PDF Download | Mobile-first with professional PDF option |
| **Signature Capture** | Digital Signature Pad | Legally robust, professional feel |
| **Trial Length** | 30 days | More time for high-touch sales |
| **Twilio Numbers** | We provision | Better onboarding UX |
| **Mobile Strategy** | React Native (Expo), parallel track | Maximum mobile investment, vibe-coded |
| **Pricing Tiers** | NOT VALIDATED | Need market research before launch |

---

## Open Item: Pricing Validation

**Current tiers (unvalidated):**
- Starter: $149/mo
- Growth: $299/mo
- Scale: $499/mo

**Action needed before launch:**
- [ ] Interview 10+ plumbers on pricing sensitivity
- [ ] Competitive analysis (Housecall Pro: $65-$149, Jobber: $49-$249)
- [ ] Consider usage-based component (per SMS, per AI minute)
- [ ] A/B test landing page pricing

---

## 12-Week Execution Plan

### Week 1-2: Authentication & Project Setup

#### Web Track
```
[ ] 1.1 Clerk Authentication
    [ ] Configure Clerk middleware (apps/web/middleware.ts)
    [ ] Create auth callback - sync Clerk user to DB
    [ ] Replace hardcoded org ID in dashboard layout
    [ ] Add Clerk JWT to API client headers
    [ ] Create API auth middleware (validate JWT, attach user/org)

[ ] 1.2 Onboarding Wizard
    [ ] Create /onboarding route with 4-step wizard
    [ ] Step 1: Business profile (name, type, logo)
    [ ] Step 2: Phone setup (provision Twilio number)
    [ ] Step 3: Business hours picker
    [ ] Step 4: AI greeting preview
    [ ] Store completion state, redirect to dashboard

[ ] 1.3 Getting Started Checklist
    [ ] Create dismissible checklist component
    [ ] Track completion in org settings
    [ ] Items: profile, phone, hours, first customer, first job
```

#### Mobile Track
```
[ ] 1.4 React Native Project Setup
    [ ] Initialize Expo project in /apps/mobile
    [ ] Configure Expo Router (file-based routing)
    [ ] Set up shared packages integration
    [ ] Configure TypeScript paths
    [ ] Add Clerk React Native SDK
    [ ] Create auth flow (login, signup)
    [ ] Test in Expo Go

[ ] 1.5 Mobile Design System
    [ ] Create base components (Button, Card, Input)
    [ ] Define color palette (match web dark theme)
    [ ] Set up NativeWind (Tailwind for RN) or StyleSheet
    [ ] Large touch targets (min 48px for field use)
```

---

### Week 3-4: Infrastructure & Core Screens

#### Web Track
```
[ ] 2.1 Redis + BullMQ Setup
    [ ] Add Redis connection (apps/api/src/lib/redis.ts)
    [ ] Configure BullMQ queues
    [ ] Create job processors for each event type
    [ ] Migrate missed-call handler from setTimeout
    [ ] Migrate review-request handler
    [ ] Add Bull Board for monitoring (/admin/queues)
    [ ] Configure dead letter queue + alerting

[ ] 2.2 Stripe Subscription Billing
    [ ] Create Stripe products/prices (Starter/Growth/Scale)
    [ ] POST /api/billing/checkout - create checkout session
    [ ] POST /api/billing/portal - customer portal redirect
    [ ] Stripe webhook handler (checkout.completed, subscription events)
    [ ] 30-day trial flow
    [ ] Subscription status enforcement
    [ ] "X days left in trial" banner
```

#### Mobile Track
```
[ ] 2.3 Today's Schedule Screen
    [ ] Bottom tab navigator (Today, Jobs, Inbox, Settings)
    [ ] Fetch today's appointments from API
    [ ] Appointment cards with customer info
    [ ] Pull-to-refresh
    [ ] Empty state for no appointments

[ ] 2.4 Job List & Detail Screens
    [ ] Job list with filters (status, date)
    [ ] Job detail screen
    [ ] Status update buttons (en route, arrived, completed)
    [ ] Customer info card with click-to-call
    [ ] Navigate to address (deep link to Maps)
```

---

### Week 5-6: Settings & Notifications

#### Web Track
```
[ ] 3.1 Settings Pages
    [ ] Profile: name, email, avatar, password (Clerk)
    [ ] Business: hours, service area, logo upload
    [ ] AI Settings: greeting, voice toggle, quiet hours
    [ ] Integrations: Twilio status, Google connect, Vapi config
    [ ] Notifications: channel prefs, event prefs
    [ ] Billing: current plan, usage, payment method

[ ] 3.2 Settings API
    [ ] GET/PUT /api/users/me
    [ ] PUT /api/organizations/settings
    [ ] File upload for logo (Vercel Blob)
    [ ] Validation with Zod schemas
```

#### Mobile Track
```
[ ] 3.3 Push Notifications
    [ ] Configure expo-notifications
    [ ] Register for push tokens (FCM/APNs)
    [ ] Store push token on user record
    [ ] API endpoint to receive tokens
    [ ] Trigger notifications from event handlers:
        - New missed call
        - New SMS received
        - Appointment reminder (30 min before)
        - New job assigned

[ ] 3.4 Mobile Settings Screen
    [ ] Profile view/edit
    [ ] Notification preferences
    [ ] Logout
    [ ] App version info
```

---

### Week 7-8: Estimates MVP

#### Web Track
```
[ ] 4.1 Estimate API
    [ ] GET /api/estimates (list)
    [ ] GET /api/estimates/:id
    [ ] POST /api/estimates (create from job)
    [ ] PUT /api/estimates/:id
    [ ] POST /api/estimates/:id/send
    [ ] Add to web API client

[ ] 4.2 Estimate Builder UI
    [ ] Estimate list page (/dashboard/estimates)
    [ ] Filter by status (draft, sent, signed)
    [ ] New estimate page/modal
    [ ] Line item editor (description, qty, price)
    [ ] Tax calculation
    [ ] Notes field
    [ ] Live preview pane

[ ] 4.3 Customer-Facing Estimate Page
    [ ] Public route: /estimate/[token]
    [ ] Mobile-optimized layout
    [ ] Business branding (logo, name)
    [ ] Digital signature pad (react-signature-canvas)
    [ ] "I approve this estimate" flow
    [ ] Track viewedAt, signedAt
    [ ] Confirmation screen
```

#### Mobile Track
```
[ ] 4.4 Quick Estimate Creation
    [ ] Create estimate from job detail screen
    [ ] Simplified line item entry
    [ ] Use templates/price book
    [ ] Send via SMS button
    [ ] View sent estimates

[ ] 4.5 Photo Capture
    [ ] expo-image-picker integration
    [ ] Attach photos to jobs
    [ ] Photo gallery on job detail
    [ ] Prepare for Phase 2 photo estimates
```

---

### Week 9-10: Invoices & Payments

#### Web Track
```
[ ] 5.1 Invoice API
    [ ] CRUD routes for invoices
    [ ] POST /api/estimates/:id/convert (estimate -> invoice)
    [ ] POST /api/invoices/:id/send
    [ ] POST /api/invoices/:id/record-payment (manual)
    [ ] Payment status tracking

[ ] 5.2 Invoice UI
    [ ] Invoice list page (/dashboard/invoices)
    [ ] Invoice detail view
    [ ] Send invoice flow (SMS + optional email)
    [ ] Payment status indicators

[ ] 5.3 Customer Payment Page
    [ ] Public route: /pay/[token]
    [ ] Invoice summary
    [ ] Stripe Elements card input
    [ ] Payment processing
    [ ] Confirmation + receipt

[ ] 5.4 PDF Generation
    [ ] Estimate PDF template (@react-pdf/renderer)
    [ ] Invoice PDF template
    [ ] GET /api/estimates/:id/pdf
    [ ] GET /api/invoices/:id/pdf
    [ ] Download button on customer pages
```

#### Mobile Track
```
[ ] 5.5 Quick Invoice
    [ ] Create invoice from completed job
    [ ] Pre-fill from estimate if exists
    [ ] Send button
    [ ] Payment status in job detail

[ ] 5.6 "On My Way" Feature
    [ ] One-tap "On My Way" button
    [ ] Get current location (expo-location)
    [ ] Calculate ETA to job address
    [ ] Send SMS to customer with ETA
    [ ] Update appointment status
```

---

### Week 11-12: Polish & Launch Prep

#### Web Track
```
[ ] 6.1 Logging & Monitoring
    [ ] Replace console.log with Pino
    [ ] Add Sentry for error tracking
    [ ] Source maps for frontend errors
    [ ] API response time logging

[ ] 6.2 Security & Validation
    [ ] Apply Zod validation to all routes
    [ ] Add rate limiting (Redis-based)
    [ ] Security headers audit (CSP, CORS)
    [ ] Webhook signature verification

[ ] 6.3 Testing
    [ ] E2E tests for critical paths (Playwright)
        - Signup -> Onboarding -> Dashboard
        - Create estimate -> Send -> Sign
        - Create invoice -> Pay
    [ ] API integration tests
    [ ] CI pipeline (run tests on PR)

[ ] 6.4 Performance
    [ ] Database query optimization
    [ ] Add missing indexes
    [ ] Frontend bundle analysis
    [ ] Lazy loading for routes
```

#### Mobile Track
```
[ ] 6.5 App Store Preparation
    [ ] App icons (all sizes)
    [ ] Splash screen
    [ ] App Store screenshots
    [ ] App Store description
    [ ] Privacy policy URL
    [ ] TestFlight build (iOS)
    [ ] Internal testing track (Android)

[ ] 6.6 Beta Testing
    [ ] Recruit 5-10 beta testers (plumbers)
    [ ] Collect feedback
    [ ] Bug fixes
    [ ] Performance testing on older devices

[ ] 6.7 Offline Foundation
    [ ] Cache today's jobs on app open
    [ ] Cache customer data for today's jobs
    [ ] Queue failed requests for retry
    [ ] (Full offline sync in Phase 2)
```

---

## Project Structure After Phase 1

```
serviceflow/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Clerk auth pages
│   │   │   ├── onboarding/     # Onboarding wizard
│   │   │   ├── dashboard/
│   │   │   │   ├── estimates/  # NEW
│   │   │   │   ├── invoices/   # NEW
│   │   │   │   └── settings/   # COMPLETED
│   │   │   ├── estimate/[token]/ # Public estimate page
│   │   │   ├── invoice/[token]/  # Public invoice page
│   │   │   └── pay/[token]/      # Payment page
│   │   └── middleware.ts       # Clerk auth middleware
│   │
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── redis.ts    # NEW
│   │   │   │   └── queue.ts    # NEW (BullMQ)
│   │   │   ├── routes/
│   │   │   │   ├── estimates.ts # NEW
│   │   │   │   ├── invoices.ts  # NEW
│   │   │   │   └── billing.ts   # NEW
│   │   │   ├── webhooks/
│   │   │   │   └── stripe.ts    # NEW
│   │   │   └── jobs/            # NEW (BullMQ processors)
│   │
│   └── mobile/                  # NEW - React Native
│       ├── app/                 # Expo Router
│       │   ├── (auth)/          # Login, signup
│       │   ├── (tabs)/          # Bottom tabs
│       │   │   ├── today.tsx
│       │   │   ├── jobs.tsx
│       │   │   ├── inbox.tsx
│       │   │   └── settings.tsx
│       │   ├── job/[id].tsx
│       │   └── estimate/new.tsx
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       │   └── api.ts           # Shared API client
│       └── services/
│           ├── notifications.ts
│           └── location.ts
│
├── packages/
│   ├── database/               # Prisma (unchanged)
│   └── shared/                 # Types, validators (shared with mobile)
│
└── docs/
    └── plans/                  # This planning documentation
```

---

## Success Criteria

Phase 1 is complete when:

### Web
- [ ] New user signs up, completes onboarding in <5 minutes
- [ ] 95%+ webhook processing success rate
- [ ] Missed call text-back sends within 60 seconds
- [ ] User can create, send, and get signature on estimate
- [ ] User can create and send invoice
- [ ] Customer can pay invoice online
- [ ] All 5 settings pages functional
- [ ] Subscription billing working (30-day trial)

### Mobile
- [ ] App available on TestFlight and Play Store internal track
- [ ] User can log in and see today's schedule
- [ ] User can view job details and update status
- [ ] Push notifications working for calls, messages, appointments
- [ ] User can create and send estimate from phone
- [ ] "On My Way" sends ETA to customer
- [ ] Click-to-call and navigate-to-address working

### Quality
- [ ] E2E tests passing for critical paths
- [ ] Error tracking operational (Sentry)
- [ ] No critical bugs from beta testers

---

## Budget Estimate (Vibe-Coded)

| Item | Monthly | 3-Month Total |
|------|---------|---------------|
| Claude Code API | $100-150 | $300-450 |
| Vercel Pro (web hosting) | $20 | $60 |
| Railway (API + Redis) | $20-30 | $60-90 |
| Supabase/Neon (Postgres) | $25 | $75 |
| Sentry (error tracking) | $0 (free tier) | $0 |
| Apple Developer | - | $99 |
| Google Play | - | $25 |
| Twilio (dev/test) | $20 | $60 |
| Stripe (no fees until revenue) | $0 | $0 |
| **Total** | | **~$700-850** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Clerk integration issues | Spike in Week 1, have NextAuth fallback plan |
| React Native learning curve | Expo simplifies significantly, strong Claude training data |
| Stripe Connect complexity | Can defer to Phase 1.5, launch with subscriptions only |
| App Store rejection | Follow guidelines strictly, submit early for review |
| Scope creep | Strict feature freeze, "Phase 2" parking lot |
| Pricing not validated | Soft launch to beta users, gather feedback before public |

---

## Next Steps

1. **Clone repo locally** and verify current state runs
2. **Set up development environment** (Node 20, pnpm, Postgres, Redis)
3. **Create Clerk application** and get API keys
4. **Create Stripe account** and set up products
5. **Initialize Expo project** in /apps/mobile
6. **Start Week 1 tasks** - Auth & Project Setup

---

## Weekly Check-in Template

```markdown
## Week X Check-in

### Completed
- [ ] Task 1
- [ ] Task 2

### In Progress
- [ ] Task 3 (blocked by X)

### Blockers
- Issue description

### Decisions Needed
- Question requiring input

### Next Week Focus
- Priority 1
- Priority 2
```
