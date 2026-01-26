# ServiceFlow Product Roadmap
## "Every User a Promoter" Initiative

**Author:** Chief Product & Technology Officer
**Date:** January 2026
**Version:** 1.0

---

## Executive Summary

ServiceFlow has built 65% of a powerful platform, but we've been building features instead of experiences. Our users—solo plumbers and small home service teams—don't need more features. They need **results they can feel in their bank account** and **software that disappears into their workflow**.

This roadmap pivots from "ship features" to "ship outcomes." Every decision filters through one question:

> **"Will this make a user tell their buddy at the supply house about us?"**

---

## The Problem We Must Solve

### Current State (Honest Assessment)

| What We Built | What Users Experience |
|--------------|----------------------|
| Missed call text-back | Works, but no visibility into ROI |
| Job management | Functional, but feels like data entry |
| Customer database | Another place to type things |
| AI voice assistant | Cool demo, but tool stubs return mock data |
| Review automation | Sends requests, but no closed-loop tracking |
| Estimates/Invoices | Database schema only—can't bill customers |
| Payments | Zero integration—users can't get paid |
| Authentication | Hardcoded—users literally can't sign up |

**The brutal truth:** A plumber can't run their business on ServiceFlow today. They can't get paid, can't send invoices, and can't even create an account.

### The Gap

We've built the engine but forgot the wheels. Users need:
1. **Immediate value** (< 5 minutes to first "wow")
2. **Visible ROI** (show them money they would have lost)
3. **Zero friction** (works while hands are dirty)
4. **Trust signals** (proof this actually works)

---

## North Star Metrics

| Metric | Current | 90-Day Target | Why It Matters |
|--------|---------|---------------|----------------|
| **Time to First Value** | ∞ (can't sign up) | < 5 minutes | First impression determines retention |
| **Missed Calls Recovered** | Unknown | 100% tracked | This is our core value prop |
| **Revenue per Recovered Call** | Unknown | Visible to user | ROI they can feel |
| **User NPS** | Unknown | > 50 | Promoters drive growth |
| **7-Day Retention** | Unknown | > 70% | Activated users stay |
| **Jobs Completed via SF** | Unknown | > 80% of user's jobs | We're their operating system |

---

## Product Principles

### 1. "Show Me The Money" First
Every feature must connect to dollars. If we can't show ROI, we shouldn't build it.

### 2. One-Thumb Operations
Our users are under a sink with wet hands. Every action must work with one thumb on a phone screen.

### 3. Intelligent Defaults, Not Configuration
Stop asking users to configure. Make smart choices for them. Let them override if they want.

### 4. Celebrate Wins, Hide Complexity
When we save them a customer, make it feel like a win. When we're doing complex things, make it invisible.

### 5. Trust Through Transparency
Show users exactly what we're doing. "We texted John at 2:47 PM because he called at 2:42 PM and didn't leave a voicemail."

---

## Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: UNBLOCK (2 weeks)                                                 │
│  "Users can actually sign up and use the product"                           │
│  - Authentication working                                                    │
│  - Critical bugs fixed                                                       │
│  - Basic onboarding                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CORE VALUE (4 weeks)                                              │
│  "Users can get paid and see ROI"                                           │
│  - Estimates & Invoices                                                      │
│  - Stripe payments                                                           │
│  - ROI Dashboard ("You saved $X this month")                                │
│  - Mobile-first job completion                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: DELIGHT (4 weeks)                                                 │
│  "Users fall in love with the experience"                                   │
│  - AI that actually works (Claude SMS)                                       │
│  - Smart scheduling suggestions                                              │
│  - Automated follow-up sequences                                             │
│  - "Win" notifications                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: GROWTH (4 weeks)                                                  │
│  "Users bring their friends"                                                │
│  - Referral program                                                          │
│  - Team features (technician app)                                            │
│  - Advanced analytics                                                        │
│  - Integrations marketplace                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Unblock (Weeks 1-2)

### Objective
Remove all blockers preventing real users from using ServiceFlow.

### Deliverables

#### 0.1 Authentication (P0 - Critical)
**Current:** Hardcoded organization ID, no login flow
**Target:** Full Clerk integration with magic link sign-up

- [ ] Wire up Clerk middleware properly
- [ ] Create sign-up flow (email only—no friction)
- [ ] Create sign-in flow with magic links (no passwords to forget)
- [ ] Organization creation on first sign-up
- [ ] Session management and logout

**Success Metric:** New user can create account in < 60 seconds

#### 0.2 Onboarding Flow (P0 - Critical)
**Current:** Users land on empty dashboard
**Target:** 3-step setup that delivers value immediately

```
Step 1: "What's your business name?"
        → Auto-creates organization, sets timezone

Step 2: "What's your phone number?"
        → We'll forward calls here for now
        → Upsell: "Want a dedicated business number? $10/mo"

Step 3: "You're all set!"
        → Show: "When you miss a call, we'll text them back automatically"
        → Demo: "Try calling this number and hanging up"
        → Show them the magic in real-time
```

**Success Metric:** 80% of signups complete onboarding

#### 0.3 Critical Bug Fixes (P0)
- [ ] Replace `setTimeout` event handlers with Redis/BullMQ (events lost on restart)
- [ ] Add Sentry error tracking
- [ ] Add request validation to all API endpoints
- [ ] Add rate limiting to public endpoints
- [ ] Fix hardcoded values throughout codebase

#### 0.4 Twilio Number Provisioning (P1)
**Current:** Users must bring their own Twilio number
**Target:** One-click number provisioning in area code

- [ ] Search available numbers by area code
- [ ] Purchase and configure number automatically
- [ ] Set up webhooks automatically
- [ ] Show number in dashboard header

**Success Metric:** User gets working phone number in < 2 minutes

---

## Phase 1: Core Value (Weeks 3-6)

### Objective
Enable the complete revenue cycle: Quote → Work → Get Paid.

### Deliverables

#### 1.1 Estimates (P0 - Critical)
**Current:** Database schema only
**Target:** Create and send estimates in 60 seconds from phone

**Create Estimate Flow:**
```
1. Select customer (or create new)
2. Add line items (searchable, recently used first)
3. Add photos (optional)
4. Preview → Send via SMS
```

**Customer Experience:**
```
SMS: "Hi John, here's your estimate from ABC Plumbing: [link]"

Link opens → Mobile-optimized estimate view
           → "Approve" button (one tap)
           → Optional signature capture
           → "Schedule Now" option
```

- [ ] Estimate creation UI (mobile-first)
- [ ] Line item library with common services
- [ ] Photo attachment (from camera or gallery)
- [ ] Public estimate view (no login required)
- [ ] One-tap approval with signature
- [ ] Approval notification to business owner
- [ ] Convert approved estimate to job automatically

**Success Metric:** Estimate created in < 90 seconds

#### 1.2 Invoices (P0 - Critical)
**Current:** Database schema only
**Target:** Generate invoice from completed job in one tap

**Flow:**
```
Job marked complete → "Send Invoice?" → One tap → Customer gets SMS

Customer taps link → Sees itemized invoice → "Pay Now" → Done
```

- [ ] Auto-generate invoice from job (pre-populated)
- [ ] Edit before sending (adjust line items)
- [ ] Public invoice view
- [ ] Payment status tracking
- [ ] Payment reminder automation

**Success Metric:** Invoice sent within 30 seconds of job completion

#### 1.3 Stripe Payments (P0 - Critical)
**Current:** Schema fields only
**Target:** Customers pay via link, money in your account next day

- [ ] Stripe Connect onboarding (Express accounts)
- [ ] Payment link generation
- [ ] Card + ACH support
- [ ] Instant payment notification to business owner
- [ ] Automatic payment reconciliation
- [ ] Payout visibility ("$X arriving Tuesday")

**Success Metric:** Payment collected within 24 hours of invoice

#### 1.4 ROI Dashboard (P0 - Critical)
**Current:** Generic metrics
**Target:** Show users exactly how much money we're saving them

**New Dashboard Section: "ServiceFlow Impact"**
```
┌─────────────────────────────────────────────────────────────────┐
│  💰 YOUR SERVICEFLOW ROI THIS MONTH                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Missed Calls Recovered: 23                                     │
│  ├── Became Jobs: 14 (61%)                                      │
│  ├── Revenue from Recovered Calls: $8,420                       │
│  └── Without ServiceFlow: $0 (they would have called someone else)
│                                                                 │
│  Review Requests Sent: 18                                       │
│  ├── Reviews Received: 12 (67%)                                 │
│  └── Average Rating: 4.9 ⭐                                     │
│                                                                 │
│  Time Saved This Month: ~8 hours                                │
│  ├── Automated texts sent: 156                                  │
│  ├── Automated reminders: 34                                    │
│  └── Invoices auto-generated: 28                                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  ServiceFlow pays for itself 12x over this month 📈             │
└─────────────────────────────────────────────────────────────────┘
```

- [ ] Track missed call → job conversion
- [ ] Calculate revenue attribution
- [ ] Show time saved estimates
- [ ] Monthly email summary ("Your ServiceFlow ROI Report")

**Success Metric:** Users can articulate their ROI in dollars

#### 1.5 Mobile Job Completion (P1)
**Current:** Desktop-oriented job management
**Target:** Complete job from phone in 30 seconds

**"Complete Job" Flow:**
```
1. Tap job notification (or find in Today's Schedule)
2. Take completion photo (optional but encouraged)
3. Add any notes
4. Adjust final amount if needed
5. Tap "Complete & Invoice" → Done

Automatically:
- Invoice generated and sent
- Review request queued (2 hours later)
- Job archived
- Dashboard updated
```

- [ ] Push notification for scheduled jobs
- [ ] Simplified mobile job view
- [ ] Quick photo capture
- [ ] One-tap complete with invoice
- [ ] Offline support (sync when connected)

**Success Metric:** Job completion in < 30 seconds from phone

---

## Phase 2: Delight (Weeks 7-10)

### Objective
Create "wow" moments that make users feel like they have superpowers.

### Deliverables

#### 2.1 Intelligent AI SMS (P0)
**Current:** Template-based responses
**Target:** Claude-powered conversations that feel human

**Capabilities:**
- Answer common questions ("What's your rate?", "Do you do weekends?")
- Qualify leads ("What's the issue?", "How urgent?")
- Suggest scheduling ("I have availability Thursday 2-4pm, does that work?")
- Graceful handoff ("Let me have Mike call you directly")

**Guardrails:**
- Never commit to pricing without approval
- Always identify as AI when directly asked
- Escalate complex issues to human
- Respect business hours

- [ ] Integrate Claude API for SMS responses
- [ ] Build context window with customer history
- [ ] Define business rules and constraints
- [ ] Human escalation triggers
- [ ] Response quality monitoring

**Success Metric:** 70% of inbound SMS handled without human intervention

#### 2.2 Smart Scheduling (P1)
**Current:** Manual calendar management
**Target:** AI suggests optimal scheduling

**Features:**
- Route optimization ("Job A is near Job B, schedule together")
- Load balancing ("Tuesday is packed, suggest Wednesday")
- Travel time awareness ("Allow 30 min between downtown jobs")
- Customer preference learning ("Mrs. Johnson prefers mornings")

- [ ] Route optimization algorithm
- [ ] Travel time estimation
- [ ] Scheduling suggestions UI
- [ ] Customer preference tracking
- [ ] Calendar conflict detection

**Success Metric:** 30% reduction in windshield time

#### 2.3 Automated Sequences (P0)
**Current:** Schema exists, no execution engine
**Target:** Set-and-forget automation that runs 24/7

**Pre-Built Sequences:**

| Sequence | Trigger | Actions |
|----------|---------|---------|
| **Estimate Follow-up** | Estimate sent, not approved in 3 days | Day 3: "Just checking in on the estimate" → Day 7: "Still interested? Happy to answer questions" → Day 14: Final follow-up |
| **Payment Reminder** | Invoice sent, not paid in 7 days | Day 7: Friendly reminder → Day 14: Second reminder → Day 21: Final notice |
| **Review Request** | Job completed | 2 hours: "How did we do?" → If positive: Google review link → If negative: "Sorry to hear, can we make it right?" |
| **Appointment Reminder** | Appointment scheduled | 24 hours before: SMS + Email → 2 hours before: SMS |
| **Maintenance Reminder** | Job completed (maintenance type) | 6 months: "Time for your annual maintenance check" |

- [ ] Build sequence execution engine (BullMQ)
- [ ] Sequence management UI
- [ ] Enrollment tracking
- [ ] Skip/pause/cancel controls
- [ ] A/B testing framework

**Success Metric:** 50% of routine communications automated

#### 2.4 Win Notifications (P1)
**Current:** No celebration of successes
**Target:** Dopamine hits when good things happen

**Notification Examples:**
```
🎉 "John Smith just paid his $450 invoice!"
📞 "Nice save! Mike called back the customer you missed"
⭐ "New 5-star review from Sarah Johnson"
📈 "You've recovered $2,000 in missed calls this week"
💪 "10th job completed this month—new record!"
```

- [ ] Win notification system
- [ ] Push notifications (mobile)
- [ ] In-app celebration UI
- [ ] Weekly wins summary email

**Success Metric:** Users report feeling "in control" of their business

---

## Phase 3: Growth (Weeks 11-14)

### Objective
Turn promoters into a growth engine.

### Deliverables

#### 3.1 Referral Program (P0)
**Current:** No referral mechanism
**Target:** "Tell a friend, get a month free"

- [ ] Referral code generation
- [ ] Referral tracking
- [ ] Reward fulfillment (credits)
- [ ] Referral leaderboard
- [ ] Easy share mechanism

**Success Metric:** 20% of new users from referrals

#### 3.2 Technician App (P1)
**Current:** Web-only, one user per org
**Target:** Simple mobile app for technicians

**Technician App Features:**
- Today's schedule
- Job details and directions
- Mark complete with photo
- View (not edit) customer info
- Receive push notifications

**Owner Features:**
- Assign jobs to technicians
- View technician locations
- Manage team permissions

- [ ] React Native app scaffold
- [ ] Today's schedule view
- [ ] Job completion flow
- [ ] Push notification setup
- [ ] Technician management UI

**Success Metric:** Technicians check app daily

#### 3.3 Advanced Analytics (P2)
**Current:** Basic metrics
**Target:** Business intelligence for growth

**Reports:**
- Revenue by service type
- Customer lifetime value
- Seasonal trends
- Marketing source ROI
- Technician performance

- [ ] Reporting engine
- [ ] Custom date ranges
- [ ] Export to CSV/PDF
- [ ] Scheduled reports via email

#### 3.4 Integrations Marketplace (P2)
**Current:** Limited integrations
**Target:** Connect to tools users already use

**Priority Integrations:**
1. QuickBooks (accounting sync)
2. Google Calendar (two-way sync)
3. Zapier (connect anything)
4. HomeAdvisor/Angi (lead import)

---

## Quality Imperatives

### Every Feature Must Pass These Gates:

#### 1. Mobile-First Test
- Can a user complete this action with one thumb?
- Does it work on a 5-year-old Android phone?
- Does it load in < 2 seconds on 4G?

#### 2. "Dirty Hands" Test
- Can a plumber use this between jobs without washing hands?
- Large tap targets (minimum 44x44px)
- No precision required

#### 3. Grandma Test
- Would a non-technical user understand what to do?
- No jargon
- Clear next actions

#### 4. ROI Visibility Test
- Does the user understand how this makes/saves them money?
- If not, either add ROI messaging or cut the feature

#### 5. "Tell a Friend" Test
- Would completing this action make someone want to tell a friend?
- If not, how can we add a moment of delight?

---

## Technical Quality Requirements

### Performance
- Page load: < 2 seconds on 4G
- API response: < 200ms p95
- Time to interactive: < 3 seconds

### Reliability
- 99.9% uptime (max 8.7 hours/year downtime)
- Zero lost events (proper job queue)
- Automatic failover for critical paths

### Security
- SOC 2 Type II preparation
- End-to-end encryption for sensitive data
- Regular security audits
- PCI compliance for payments

### Observability
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Business metrics dashboard
- Alerting for critical failures

---

## Success Criteria

### Phase 0 Complete When:
- [ ] New user can sign up and complete onboarding in < 5 minutes
- [ ] First missed call text-back sent within 10 minutes of signup
- [ ] Zero critical bugs in production
- [ ] Error tracking and alerting operational

### Phase 1 Complete When:
- [ ] User can create estimate and send in < 2 minutes
- [ ] Customer can pay invoice via link
- [ ] ROI dashboard shows recovered revenue
- [ ] Payment arrives in user's bank within 2 business days

### Phase 2 Complete When:
- [ ] AI handles 70% of inbound SMS without human help
- [ ] Automated sequences running for all users
- [ ] Users report feeling "in control" (survey)
- [ ] NPS > 40

### Phase 3 Complete When:
- [ ] 20% of new users from referrals
- [ ] Multi-technician teams can use platform
- [ ] NPS > 50
- [ ] Expansion revenue > churn

---

## Resource Requirements

### Phase 0-1 (6 weeks)
- 2 Full-stack engineers
- 1 Designer (part-time)
- 1 QA engineer (part-time)

### Phase 2-3 (8 weeks)
- 3 Full-stack engineers
- 1 Mobile engineer
- 1 Designer
- 1 QA engineer

### Ongoing
- 1 Customer success (starting Phase 1)
- 1 DevOps/SRE (starting Phase 2)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stripe onboarding friction | Medium | High | Pre-fill as much as possible, provide human support |
| AI says something inappropriate | Medium | High | Strict guardrails, human review of edge cases, easy escalation |
| Users don't understand ROI | Medium | Medium | Proactive education, email reports, in-app callouts |
| Twilio costs spike | Low | Medium | Monitor usage, implement rate limiting, alert on anomalies |
| Competition copies features | High | Low | Speed to market + UX quality are moats |

---

## Appendix: User Stories for Phase 1

### US-1: First-Time User Onboarding
```
AS A plumber who just signed up
I WANT TO get set up in under 5 minutes
SO THAT I can see the value before I lose interest

ACCEPTANCE CRITERIA:
- Sign up with just email
- 3 or fewer steps to working product
- See demo of missed call text-back
- Feel confident the product will work
```

### US-2: Create and Send Estimate
```
AS A plumber on a job site
I WANT TO create and send an estimate from my phone
SO THAT I can strike while the iron is hot

ACCEPTANCE CRITERIA:
- Create estimate in < 2 minutes
- Add photos from camera
- Customer receives SMS with link
- Customer can approve with one tap
- I get notified immediately when approved
```

### US-3: Get Paid After Job
```
AS A plumber who just finished a job
I WANT TO send an invoice and get paid immediately
SO THAT I don't have to chase payments

ACCEPTANCE CRITERIA:
- One tap to generate invoice from job
- Customer receives SMS with payment link
- Customer can pay via card or ACH
- I see payment confirmation instantly
- Money in my account within 2 business days
```

### US-4: See My ROI
```
AS A ServiceFlow user
I WANT TO see exactly how much money ServiceFlow is making me
SO THAT I feel confident paying for the subscription

ACCEPTANCE CRITERIA:
- Dashboard shows recovered revenue from missed calls
- I can see which calls became jobs
- Time saved is estimated
- Monthly summary email with ROI
```

---

## Conclusion

ServiceFlow has a strong foundation, but we've been building for engineers, not plumbers. This roadmap refocuses us on outcomes over features.

**The measure of success is simple:** When a user's buddy asks "how do you manage your business?", do they say "oh, you gotta try ServiceFlow" with genuine enthusiasm?

If we execute this roadmap, the answer will be yes.

---

*"Make it so easy they can't say no. Make it so valuable they can't stop talking about it."*
