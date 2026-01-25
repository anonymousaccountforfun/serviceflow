# Phase 1: Foundation - Detailed Implementation Plan

**Date:** January 25, 2026
**Phase Duration:** Months 0-3
**Theme:** "Make it work for real users"

---

## Executive Summary

Phase 1 transforms ServiceFlow from a demo into a production-ready product. This document breaks down each workstream with decision points, trade-offs, and strategic escalations.

**Current State Summary:**
- Authentication: Clerk configured but not wired up (hardcoded org ID)
- Payments: Schema ready, no Stripe integration
- Estimates/Invoices: Full schema, no UI or API routes
- Event System: Working but uses in-process setTimeout (unreliable)
- Settings: Navigation exists, pages are stubs

---

## Strategic Decisions Requiring Input

Before diving into implementation, the following decisions will significantly impact architecture, UX, and cost:

### DECISION 1: Authentication & Multi-tenancy Model

**Context:** Currently hardcoded to single organization. Need to decide how users/orgs relate.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. One User = One Org (Recommended)** | Each signup creates a new org. Solo plumber model. | Simple onboarding, clear data isolation, matches target user | Harder to add team members later, needs org invite flow |
| **B. User Joins Existing Org** | Users can be invited to existing orgs | Supports teams from day 1 | Complex onboarding, "which org?" confusion, more auth edge cases |
| **C. Hybrid** | Default to Option A, add team invite later | Best of both worlds | More code paths, delayed team features |

**Recommendation:** Option A for Phase 1, evolve to C in Phase 2.

**Impact:** Affects onboarding flow, Clerk configuration, and all API authorization logic.

---

### DECISION 2: Stripe Integration Model

**Context:** Two distinct payment needs: (1) collecting subscription fees from ServiceFlow customers, (2) processing customer payments for invoices.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Stripe Connect (Standard)** | Plumbers have own Stripe accounts, we take platform fee | Plumbers own customer relationships, handles payouts automatically | Complex onboarding (Stripe OAuth), compliance burden on us |
| **B. Stripe Connect (Express)** | Simplified connected accounts | Faster onboarding, we handle more | Less control for plumbers, still complex |
| **C. Direct Charge + Manual Payouts** | We collect everything, pay out manually | Simplest to build | Cash flow risk, regulatory issues, plumbers don't like it |
| **D. Subscription Only (Phase 1)** | Only bill for ServiceFlow subscription, no invoice payments yet | Ship faster, defer complexity | Core value prop delayed (getting paid faster) |

**Recommendation:** Option D for immediate launch, Option A/B for Phase 1.5 (week 6-8).

**Impact:** Affects revenue timeline, onboarding complexity, and invoice payment flow.

---

### DECISION 3: Job Queue Infrastructure

**Context:** Current event handlers use `setTimeout` - events lost on server restart.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. BullMQ + Redis** | Industry standard, battle-tested | Reliable, retries, monitoring, scales | Redis dependency, operational complexity |
| **B. PostgreSQL-based Queue (Graphile Worker)** | Queue in existing Postgres DB | No new infrastructure, transactional consistency | Less mature, harder to scale, no built-in UI |
| **C. Cloud Queue (AWS SQS, Cloud Tasks)** | Managed service | Zero ops, scales infinitely | Vendor lock-in, latency, cost at scale |
| **D. Keep setTimeout + Add DB Persistence** | Log pending events, replay on restart | Minimal change, works for low volume | Technical debt, doesn't scale, fragile |

**Recommendation:** Option A (BullMQ + Redis) - Redis is already in requirements, BullMQ is proven.

**Impact:** Affects reliability, scalability, and deployment architecture.

---

### DECISION 4: Estimate/Invoice Delivery Method

**Context:** How do customers receive and interact with estimates?

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. SMS Link to Web Page** | Text contains link to hosted estimate page | Mobile-first (matches users), simple | Requires public-facing pages, security considerations |
| **B. Email with PDF Attachment** | Traditional approach | Professional, printable, familiar | Plumbers don't always have customer email, requires PDF generation |
| **C. Both (SMS + Email)** | Customer chooses or gets both | Maximum reach | More complexity, more code |
| **D. SMS Link + PDF Download Option** | Link to page with PDF download | Best of A and B | Slightly more complex than A alone |

**Recommendation:** Option D - SMS-first with PDF available.

**Impact:** Affects estimate UI, PDF generation requirements, and infrastructure needs.

---

### DECISION 5: Signature Capture Approach

**Context:** Estimates need customer approval/signature before becoming invoices.

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Digital Signature Pad** | Customer draws signature on screen | Legally robust, professional | Requires signature library, mobile UX concerns |
| **B. "I Approve" Button + Name** | Typed name as signature | Simpler, faster, works on any device | Less "official" feeling, some legal ambiguity |
| **C. SMS Confirmation Code** | Text "APPROVE" to confirm | Frictionless, creates audit trail | Less visual, customers may not understand |
| **D. Checkbox Agreement** | "I agree to this estimate" checkbox | Simplest implementation | Least professional, weakest legally |

**Recommendation:** Option B for MVP (typed name), upgrade to A in Phase 2.

**Impact:** Affects customer-facing estimate page UX and legal compliance.

---

## Detailed Task Breakdown

### Workstream 1: Authentication & Onboarding
**Duration:** Weeks 1-2
**Dependencies:** None (can start immediately)

#### 1.1 Wire Up Clerk Authentication
```
[ ] 1.1.1 Configure Clerk middleware in Next.js
    - File: /apps/web/middleware.ts (create)
    - Protect /dashboard/* routes
    - Allow public access to /api/webhooks/*

[ ] 1.1.2 Create auth callback handler
    - File: /apps/web/app/auth/callback/page.tsx
    - Sync Clerk user to database User model
    - Create Organization on first sign-in

[ ] 1.1.3 Replace hardcoded org ID in dashboard layout
    - File: /apps/web/app/dashboard/layout.tsx
    - Get org from Clerk session
    - Redirect to onboarding if no org

[ ] 1.1.4 Add auth header to API client
    - File: /apps/web/lib/api.ts
    - Include Clerk JWT in requests
    - Handle 401 responses

[ ] 1.1.5 Create API auth middleware
    - File: /apps/api/src/middleware/auth.ts
    - Validate Clerk JWT
    - Attach user/org to request
    - Replace x-organization-id header approach
```

**Decision Point 1.1:** JWT validation approach
- Option A: Clerk's `@clerk/express` SDK (recommended - maintained, handles edge cases)
- Option B: Manual JWT verification with `jose` library (more control, less dependency)

#### 1.2 Onboarding Wizard
```
[ ] 1.2.1 Create onboarding flow container
    - File: /apps/web/app/onboarding/page.tsx
    - Multi-step wizard (4 steps)
    - Progress indicator
    - Redirect after completion

[ ] 1.2.2 Step 1: Business Profile
    - Business name (required)
    - Owner name
    - Service type (plumber, HVAC, electrician, other)
    - Logo upload (optional)

[ ] 1.2.3 Step 2: Phone Setup
    - Option A: "I have a Twilio number" - enter credentials
    - Option B: "Get a new number" - Twilio number provisioning
    - Verify number works (send test SMS)

[ ] 1.2.4 Step 3: Business Hours
    - Day-by-day schedule picker
    - Pre-fill common patterns ("M-F 8-5", "7 days")
    - Timezone selection

[ ] 1.2.5 Step 4: AI Preview
    - Show sample AI greeting
    - Test "Call simulation" (optional)
    - Customize greeting text

[ ] 1.2.6 Create onboarding API endpoints
    - POST /api/onboarding/business
    - POST /api/onboarding/phone
    - POST /api/onboarding/hours
    - POST /api/onboarding/complete
```

**Decision Point 1.2:** Twilio number provisioning
- Option A: Manual entry only (user brings own Twilio) - simpler, lower support burden
- Option B: Auto-provision via Twilio API - better UX, but we pay for unused numbers
- **Trade-off:** B increases conversion but adds cost/complexity. Recommend B with 14-day trial buffer.

#### 1.3 First-Time Dashboard Experience
```
[ ] 1.3.1 Create "Getting Started" checklist component
    - File: /apps/web/components/getting-started.tsx
    - Track completion in org settings
    - Dismissible after completion

[ ] 1.3.2 Checklist items:
    - [ ] Complete business profile
    - [ ] Connect phone number
    - [ ] Set business hours
    - [ ] Add first customer
    - [ ] Create first job
    - [ ] (Optional) Connect Google Business

[ ] 1.3.3 Empty state improvements
    - Better CTAs on empty customer/job lists
    - "Add your first X" guidance
```

---

### Workstream 2: Job Queue & Reliability
**Duration:** Weeks 2-3
**Dependencies:** Redis infrastructure decision

#### 2.1 Redis Setup
```
[ ] 2.1.1 Add Redis connection
    - File: /apps/api/src/lib/redis.ts
    - Use ioredis (already in package.json)
    - Connection pooling
    - Graceful reconnection

[ ] 2.1.2 Update deployment configuration
    - Add Redis to docker-compose.yml
    - Document Railway/Render Redis addon
    - Add REDIS_URL to .env.example
```

**Decision Point 2.1:** Redis provider for production
- Option A: Railway Redis addon (~$5/mo) - simple, same platform
- Option B: Upstash (serverless Redis) - pay-per-use, lower minimum cost
- Option C: Self-hosted - cheapest at scale, operational burden
- **Recommendation:** A for simplicity, consider B if cost-sensitive

#### 2.2 BullMQ Integration
```
[ ] 2.2.1 Install and configure BullMQ
    - File: /apps/api/src/lib/queue.ts
    - Create queue factory
    - Configure default job options (retries, backoff)

[ ] 2.2.2 Create job processors
    - File: /apps/api/src/jobs/index.ts
    - Processor for each event type
    - Error handling and logging

[ ] 2.2.3 Migrate missed-call handler
    - Move from setTimeout to BullMQ delayed job
    - Add retry logic (3 attempts, exponential backoff)
    - Preserve existing business logic

[ ] 2.2.4 Migrate review-request handler
    - Same pattern as missed-call
    - Configure appropriate delays

[ ] 2.2.5 Add job monitoring
    - Integrate Bull Board UI (admin only)
    - Route: /admin/queues
    - Protect with auth

[ ] 2.2.6 Update event service
    - File: /apps/api/src/services/events.ts
    - Replace emit + setTimeout with queue.add()
    - Keep event persistence for audit
```

**Decision Point 2.2:** Job monitoring approach
- Option A: Bull Board (self-hosted UI) - free, full control
- Option B: BullMQ Pro dashboard - paid, better UX
- Option C: No UI, logs only - simplest, harder to debug
- **Recommendation:** A for Phase 1, evaluate B at scale

#### 2.3 Dead Letter Queue & Alerting
```
[ ] 2.3.1 Configure DLQ for failed jobs
    - After max retries, move to DLQ
    - Preserve full job context

[ ] 2.3.2 Add alerting on DLQ
    - Option: Slack webhook on new DLQ entry
    - Option: Email to admin
    - Include job details and error

[ ] 2.3.3 Create retry mechanism
    - API endpoint to retry DLQ jobs
    - Bulk retry option
```

---

### Workstream 3: Stripe Integration
**Duration:** Weeks 3-4
**Dependencies:** Auth complete, Decision 2 resolved

#### 3.1 Subscription Billing
```
[ ] 3.1.1 Create Stripe products and prices
    - Starter: $149/mo (price_starter_monthly)
    - Growth: $299/mo (price_growth_monthly)
    - Scale: $499/mo (price_scale_monthly)
    - Store IDs in constants

[ ] 3.1.2 Create checkout session endpoint
    - File: /apps/api/src/routes/billing.ts
    - POST /api/billing/checkout
    - Create Stripe Checkout session
    - Include trial period (14 days)

[ ] 3.1.3 Create billing portal endpoint
    - POST /api/billing/portal
    - Redirect to Stripe Customer Portal
    - Allow plan changes, payment method updates

[ ] 3.1.4 Create Stripe webhook handler
    - File: /apps/api/src/webhooks/stripe.ts
    - Events: checkout.session.completed, invoice.paid,
      customer.subscription.updated, customer.subscription.deleted
    - Update org subscription status

[ ] 3.1.5 Add subscription status to dashboard
    - Show current plan
    - Days remaining in trial
    - Upgrade CTAs for Starter users

[ ] 3.1.6 Implement trial enforcement
    - Check subscription status on protected routes
    - Grace period handling (7 days past due)
    - Downgrade behavior definition
```

**Decision Point 3.1:** Trial experience
- Option A: Full access during trial, hard paywall after
- Option B: Limited features during trial (e.g., 10 SMS)
- Option C: Full access, gentle nudges, then paywall
- **Trade-off:** A maximizes trial value but risks abuse. C balances conversion and trust.
- **Recommendation:** C - full access with prominent "X days left" banner

#### 3.2 Payment Processing (for customer invoices)
**Note:** This may move to Phase 1.5 based on Decision 2.

```
[ ] 3.2.1 Stripe Connect account creation
    - Onboarding step or settings page
    - OAuth flow for connected accounts
    - Store stripe_account_id on organization

[ ] 3.2.2 Create payment intent for invoice
    - POST /api/invoices/:id/payment-intent
    - Use connected account
    - Calculate platform fee

[ ] 3.2.3 Build payment page
    - File: /apps/web/app/pay/[invoiceId]/page.tsx
    - Public page (no auth required)
    - Show invoice details
    - Stripe Elements for card input

[ ] 3.2.4 Handle payment webhooks
    - payment_intent.succeeded
    - Update invoice status to paid
    - Trigger payment confirmation SMS

[ ] 3.2.5 Payout configuration
    - Set payout schedule (daily/weekly)
    - Dashboard showing pending payouts
```

---

### Workstream 4: Settings Pages
**Duration:** Weeks 4-5
**Dependencies:** Auth complete

#### 4.1 Profile Settings
```
[ ] 4.1.1 Build profile page
    - File: /apps/web/app/dashboard/settings/profile/page.tsx
    - Edit: name, email, phone, avatar
    - Change password (via Clerk)
    - Notification preferences

[ ] 4.1.2 Create settings API routes
    - GET/PUT /api/users/me
    - Validation with Zod

[ ] 4.1.3 Avatar upload
    - Option A: Clerk-managed avatars
    - Option B: Custom upload to S3/Cloudinary
    - Recommendation: A (simpler, Clerk handles it)
```

#### 4.2 Business Settings
```
[ ] 4.2.1 Build business page
    - File: /apps/web/app/dashboard/settings/business/page.tsx
    - Business name, address, logo
    - Business hours editor (reuse from onboarding)
    - Service area (zip codes, radius)

[ ] 4.2.2 AI settings section
    - AI greeting customization
    - Voice enable/disable
    - SMS auto-reply enable/disable
    - Quiet hours configuration

[ ] 4.2.3 Create settings API
    - PUT /api/organizations/settings
    - Validate with updateOrganizationSettingsSchema
```

**Decision Point 4.2:** Logo storage
- Option A: Cloudinary (recommended) - optimized delivery, transforms
- Option B: AWS S3 + CloudFront - more control, lower cost at scale
- Option C: Vercel Blob - simple, integrated with Next.js
- **Recommendation:** C for Phase 1 (simplicity), migrate to A/B if needed

#### 4.3 Integrations Settings
```
[ ] 4.3.1 Build integrations page
    - Connection status for each service
    - Connect/disconnect buttons
    - Last sync timestamps

[ ] 4.3.2 Twilio integration card
    - Show connected number
    - SMS usage stats
    - Test SMS button

[ ] 4.3.3 Google Business Profile card
    - OAuth connect flow (already built, needs UI)
    - Sync status
    - Last review sync

[ ] 4.3.4 Vapi integration card
    - Voice AI status
    - Minutes used
    - Test call button
```

#### 4.4 Notification Settings
```
[ ] 4.4.1 Build notifications page
    - Channel preferences (SMS, email, push)
    - Event preferences (new lead, booking, payment, review)
    - Quiet hours for notifications

[ ] 4.4.2 Implement notification service
    - File: /apps/api/src/services/notifications.ts
    - Route to appropriate channel based on preferences
    - Respect quiet hours
```

#### 4.5 Billing Settings
```
[ ] 4.5.1 Build billing page
    - Current plan display
    - Usage metrics (SMS sent, AI minutes)
    - Payment method (via Stripe Portal)
    - Invoice history

[ ] 4.5.2 Usage tracking
    - Track SMS count per billing period
    - Track AI voice minutes
    - Warn at 80% of limit
    - Block at 100% or upsell
```

---

### Workstream 5: Estimates & Invoices MVP
**Duration:** Weeks 5-8
**Dependencies:** Stripe integration, Settings complete

#### 5.1 Estimate API
```
[ ] 5.1.1 Create estimate routes
    - File: /apps/api/src/routes/estimates.ts
    - GET /api/estimates (list for org)
    - GET /api/estimates/:id
    - POST /api/estimates (create from job)
    - PUT /api/estimates/:id
    - POST /api/estimates/:id/send
    - POST /api/estimates/:id/convert (to invoice)

[ ] 5.1.2 Implement validation
    - Use createEstimateSchema, sendEstimateSchema
    - Validate line items, totals

[ ] 5.1.3 Add to API client
    - getEstimates, getEstimate, createEstimate, etc.
```

#### 5.2 Estimate Builder UI
```
[ ] 5.2.1 Create estimate list page
    - File: /apps/web/app/dashboard/estimates/page.tsx
    - Filter by status (draft, sent, signed)
    - Quick actions (send, view, delete)

[ ] 5.2.2 Create estimate builder
    - File: /apps/web/app/dashboard/estimates/new/page.tsx
    - Or modal from job detail page
    - Select customer (from job or search)
    - Line item editor with +/- rows
    - Good/better/best tier toggle (optional)
    - Tax calculation
    - Notes field
    - Preview pane

[ ] 5.2.3 Line item component
    - Description (text or from price book)
    - Quantity
    - Unit price
    - Line total (auto-calculated)
    - Delete button

[ ] 5.2.4 Estimate preview
    - Formatted as customer will see it
    - Business branding (logo, name)
    - Total breakdown
```

**Decision Point 5.2:** Good/Better/Best pricing
- Option A: Include tiered pricing from start
- Option B: Simple single-price line items only
- **Trade-off:** A is powerful for upselling but adds UI complexity
- **Recommendation:** B for MVP, A in Phase 2

#### 5.3 Customer-Facing Estimate Page
```
[ ] 5.3.1 Create public estimate page
    - File: /apps/web/app/estimate/[token]/page.tsx
    - No auth required (token-based access)
    - Mobile-optimized layout
    - Business branding

[ ] 5.3.2 Signature capture
    - "I approve this estimate" section
    - Name input (typed signature)
    - Agreement checkbox
    - Sign button

[ ] 5.3.3 Track estimate views
    - Update viewedAt on first load
    - Log view events for analytics

[ ] 5.3.4 Signed confirmation
    - Show confirmation message
    - "What happens next" info
    - Contact info for questions
```

#### 5.4 Estimate Sending
```
[ ] 5.4.1 SMS delivery
    - Use existing SMS service
    - Template: estimate_sent
    - Include short link to estimate page

[ ] 5.4.2 Email delivery (optional)
    - If customer has email
    - HTML email with estimate summary
    - CTA button to view full estimate

[ ] 5.4.3 Generate short links
    - Use existing tokens or short URL service
    - Track click-through
```

**Decision Point 5.4:** Short link approach
- Option A: Use estimate token directly (/estimate/abc123xyz)
- Option B: External short link service (bit.ly, short.io)
- Option C: Build internal shortener (/e/abc)
- **Recommendation:** A for simplicity - tokens are already short enough

#### 5.5 Invoice Generation
```
[ ] 5.5.1 Create invoice routes
    - File: /apps/api/src/routes/invoices.ts
    - Similar structure to estimates
    - POST /api/invoices/:id/send
    - POST /api/invoices/:id/record-payment (manual)

[ ] 5.5.2 Convert estimate to invoice
    - Copy line items
    - Link to source estimate
    - Set due date (default: 7 days)

[ ] 5.5.3 Create invoice list page
    - Filter by status (draft, sent, paid, overdue)
    - Show amount due, due date
    - Quick actions

[ ] 5.5.4 Customer invoice page
    - File: /apps/web/app/invoice/[token]/page.tsx
    - Show invoice details
    - Payment button (if Stripe Connect set up)
    - Mark as paid confirmation
```

#### 5.6 PDF Generation
```
[ ] 5.6.1 Choose PDF library
    - Option A: react-pdf (render React to PDF)
    - Option B: puppeteer (HTML to PDF)
    - Option C: External API (DocRaptor, PDFShift)

[ ] 5.6.2 Create estimate PDF template
    - Business header (logo, name, contact)
    - Customer info
    - Line items table
    - Totals
    - Terms and conditions
    - Signature line

[ ] 5.6.3 Create invoice PDF template
    - Similar to estimate
    - Due date prominent
    - Payment instructions

[ ] 5.6.4 PDF download endpoint
    - GET /api/estimates/:id/pdf
    - GET /api/invoices/:id/pdf
    - Generate on-demand or cache
```

**Decision Point 5.6:** PDF generation approach
- Option A: `@react-pdf/renderer` - pure JS, no external deps, limited styling
- Option B: Puppeteer - full HTML/CSS support, heavy (250MB+), serverless issues
- Option C: External API - best quality, per-PDF cost (~$0.01-0.05)
- **Trade-off:** A is cheapest but limited. B has deployment complexity. C is easiest but ongoing cost.
- **Recommendation:** A for MVP (good enough), evaluate C if quality issues

---

### Workstream 6: Polish & Quality
**Duration:** Weeks 8-12
**Dependencies:** All features complete

#### 6.1 Logging & Monitoring
```
[ ] 6.1.1 Replace console.log with structured logging
    - Install pino
    - Create logger utility
    - Log levels: debug, info, warn, error
    - Include request ID, user ID, org ID

[ ] 6.1.2 Add error tracking
    - Option A: Sentry (recommended)
    - Option B: LogTail/Better Stack
    - Option C: Axiom
    - Capture unhandled errors
    - Source maps for frontend

[ ] 6.1.3 Add performance monitoring
    - API response times
    - Database query times
    - External service latency (Twilio, Stripe)

[ ] 6.1.4 Create health check dashboard
    - Service status page
    - Uptime monitoring
    - Alert on failures
```

**Decision Point 6.1:** Monitoring stack
- Option A: Sentry (errors) + Vercel Analytics (perf) - simple, integrated
- Option B: Datadog (all-in-one) - powerful, expensive
- Option C: Self-hosted (Grafana + Prometheus) - cheap, operational burden
- **Recommendation:** A for Phase 1

#### 6.2 Input Validation
```
[ ] 6.2.1 Apply Zod schemas to all routes
    - Audit each route
    - Add validation middleware
    - Return helpful error messages

[ ] 6.2.2 Add rate limiting
    - Per-IP limits on public endpoints
    - Per-org limits on API
    - Use Redis for distributed counting

[ ] 6.2.3 Security headers audit
    - CSP configuration
    - CORS tightening
    - Cookie settings
```

#### 6.3 Testing
```
[ ] 6.3.1 Set up test infrastructure
    - Jest for unit tests
    - Playwright for E2E
    - Test database setup

[ ] 6.3.2 Critical path E2E tests
    - Signup -> Onboarding -> Dashboard
    - Create customer -> Create job -> Create estimate -> Send
    - Missed call -> Text-back sent
    - Invoice -> Payment received

[ ] 6.3.3 API integration tests
    - Auth flows
    - CRUD operations
    - Webhook handlers

[ ] 6.3.4 CI/CD pipeline
    - Run tests on PR
    - Block merge on failure
    - Deploy to staging on merge
```

#### 6.4 Performance Optimization
```
[ ] 6.4.1 Database optimization
    - Add missing indexes (query analysis)
    - Optimize N+1 queries
    - Add connection pooling (PgBouncer if needed)

[ ] 6.4.2 Frontend optimization
    - Audit bundle size
    - Lazy load routes
    - Image optimization
    - Cache API responses appropriately

[ ] 6.4.3 API caching
    - Cache static data (templates, settings)
    - Implement ETag for lists
    - Consider Redis caching for hot paths
```

---

## Dependency Graph

```
Week 1-2: Authentication & Onboarding
    |
    ├── Week 2-3: Job Queue & Reliability (parallel start)
    |       |
    |       └── Needed for: Estimate automation, reliable webhooks
    |
    └── Week 3-4: Stripe Integration
            |
            ├── Week 4-5: Settings Pages
            |       |
            |       └── Week 5-8: Estimates & Invoices
            |
            └── Week 8-12: Polish & Quality (parallel)
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Clerk integration complexity | Medium | High | Spike early, have fallback (next-auth) |
| Stripe Connect onboarding friction | High | Medium | Defer to Phase 1.5, start with subscriptions |
| PDF generation quality issues | Medium | Low | Accept "good enough" for MVP, iterate |
| Redis operational issues | Low | High | Use managed Redis, have local fallback |
| Scope creep in estimate builder | High | Medium | Strict feature freeze, resist "just one more thing" |
| Testing delays release | Medium | Medium | Prioritize critical path tests only |

---

## Success Criteria

Phase 1 is complete when:

1. **A new user can:**
   - Sign up and complete onboarding in <5 minutes
   - See the "Getting Started" checklist
   - Add customers and create jobs

2. **The system reliably:**
   - Sends text-back within 60 seconds of missed call
   - Processes 95%+ of webhooks successfully
   - Persists jobs across server restarts

3. **Billing works:**
   - User can start 14-day trial
   - User can upgrade to paid plan
   - Subscription status enforced

4. **Estimates flow:**
   - Create estimate from job
   - Send via SMS
   - Customer can view and sign
   - Convert to invoice
   - (Stretch) Accept payment

5. **Settings complete:**
   - All 5 settings pages functional
   - Business hours editable
   - AI settings configurable

---

## Open Questions for Review

1. **Pricing validation:** Are the $149/$299/$499 tiers correct for this market?
2. **Trial length:** 14 days standard, but should it be longer for high-touch sales?
3. **Twilio provisioning:** Do we provision numbers or require BYOT (bring your own Twilio)?
4. **Payment processing priority:** Is "get paid faster" critical for launch or can it wait?
5. **Mobile app timing:** Should React Native start in Phase 1 or wait for Phase 2?

---

## Next Steps

1. **Resolve strategic decisions (1-5)** - Need input before implementation
2. **Set up development environment** - Clone, run locally, verify current state
3. **Create sprint board** - Break into 2-week sprints
4. **Assign ownership** - Who owns each workstream?
5. **Schedule weekly check-ins** - Review progress, unblock issues
