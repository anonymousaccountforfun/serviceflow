# ServiceFlow Product Roadmap Q1 2026

## Executive Summary

Based on red team analysis from three customer avatars (solo tradesperson, growing multi-tech business, tech-savvy founder), we've identified critical gaps preventing product-market fit. This roadmap addresses friction points in priority order to achieve **paying customer retention** within 90 days.

**North Star Metric**: 30-day retention rate > 60% (currently estimated <20%)

---

## Phase 1: Foundation (Weeks 1-2)
### Theme: "Make It Actually Work"

**Goal**: Replace mock/placeholder features with real implementations so the core product delivers on its promises.

| Initiative | Priority | KPI Target | Owner |
|------------|----------|------------|-------|
| 1.1 Real AI Integration | P0 | AI handles 80% of test conversations correctly | Backend |
| 1.2 Phone Provisioning Flow | P0 | 100% of onboarded users have working phone | Full-stack |
| 1.3 Google OAuth Integration | P0 | Users can connect Google in <2 min | Full-stack |
| 1.4 Real-time Updates | P1 | <3 second latency on status changes | Backend |

**Success Criteria**: A new user can complete onboarding and receive their first AI-handled call within 10 minutes.

---

## Phase 2: Core Workflows (Weeks 3-4)
### Theme: "Complete the Job Lifecycle"

**Goal**: Build missing UI for database models that already exist (invoicing, estimates, team assignment).

| Initiative | Priority | KPI Target | Owner |
|------------|----------|------------|-------|
| 2.1 Technician Management UI | P0 | Assign jobs in <3 clicks | Frontend |
| 2.2 Invoicing & Payments | P0 | Generate invoice in <1 min | Full-stack |
| 2.3 Estimates & Quotes | P1 | Send estimate via SMS/email | Full-stack |
| 2.4 Appointment Reminders | P1 | Auto-send 24hr + 1hr reminders | Backend |

**Success Criteria**: Multi-tech business owner can assign job, complete it, invoice customer, and collect payment without leaving ServiceFlow.

---

## Phase 3: Mobile & Field (Weeks 5-8)
### Theme: "Technicians Can Actually Use This"

**Goal**: Ship mobile experience so field technicians can see and complete their work.

| Initiative | Priority | KPI Target | Owner |
|------------|----------|------------|-------|
| 3.1 Mobile-First PWA | P0 | Core flows work on mobile | Frontend |
| 3.2 Technician Day View | P0 | Tech sees today's jobs + navigation | Frontend |
| 3.3 Job Completion Flow | P0 | Mark complete + photo in <30 sec | Full-stack |
| 3.4 Push Notifications | P1 | New job alert within 5 seconds | Full-stack |

**Success Criteria**: Technician can view assigned jobs, navigate to location, and mark complete with photos from their phone.

---

## Phase 4: Growth & Retention (Weeks 9-12)
### Theme: "Reasons to Stay"

**Goal**: Add features that create stickiness and demonstrate ROI to customers.

| Initiative | Priority | KPI Target | Owner |
|------------|----------|------------|-------|
| 4.1 Review Management (Multi-platform) | P1 | Yelp + Facebook integration | Full-stack |
| 4.2 Conversion Analytics | P1 | Show lead→quote→job funnel | Full-stack |
| 4.3 QuickBooks Integration | P2 | Two-way sync invoices | Backend |
| 4.4 Customer Portal | P2 | Customers view/pay invoices | Full-stack |

**Success Criteria**: Owner can see ROI dashboard showing "ServiceFlow saved you X hours and brought in $Y revenue this month."

---

## KPI Dashboard

| Metric | Current | Week 4 Target | Week 8 Target | Week 12 Target |
|--------|---------|---------------|---------------|----------------|
| Onboarding completion rate | ~40% | 75% | 85% | 90% |
| 7-day retention | ~25% | 50% | 65% | 75% |
| 30-day retention | ~15% | 35% | 50% | 60% |
| Jobs created per active user/week | 2 | 5 | 8 | 12 |
| AI call handling success rate | 0% (mock) | 70% | 80% | 85% |
| Mobile usage (% of sessions) | 5% | 20% | 40% | 50% |
| Invoice collection rate | 0% | 30% | 50% | 65% |

---

## Resource Allocation

### Parallel Workstreams
To maximize velocity, work is structured for parallel execution:

**Stream A: Backend/AI** (Phases 1.1, 1.4, 2.4, 3.4)
**Stream B: Full-stack Core** (Phases 1.2, 1.3, 2.1, 2.2, 2.3)
**Stream C: Mobile/Frontend** (Phases 3.1, 3.2, 3.3)
**Stream D: Integrations** (Phases 4.1, 4.3, 4.4)

---

## PRD Index

Each initiative has a detailed PRD in `/docs/plans/prds/`:

1. [PRD-001: Real AI Integration](./prds/PRD-001-real-ai-integration.md)
2. [PRD-002: Phone Provisioning Flow](./prds/PRD-002-phone-provisioning.md)
3. [PRD-003: Google OAuth Integration](./prds/PRD-003-google-oauth.md)
4. [PRD-004: Real-time Updates](./prds/PRD-004-realtime-updates.md)
5. [PRD-005: Technician Management UI](./prds/PRD-005-technician-management.md)
6. [PRD-006: Invoicing & Payments](./prds/PRD-006-invoicing-payments.md)
7. [PRD-007: Estimates & Quotes](./prds/PRD-007-estimates-quotes.md)
8. [PRD-008: Appointment Reminders](./prds/PRD-008-appointment-reminders.md)
9. [PRD-009: Mobile PWA](./prds/PRD-009-mobile-pwa.md)
10. [PRD-010: Technician Day View](./prds/PRD-010-technician-day-view.md)
11. [PRD-011: Job Completion Flow](./prds/PRD-011-job-completion-flow.md)
12. [PRD-012: Push Notifications](./prds/PRD-012-push-notifications.md)

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Twilio API rate limits | High | Medium | Implement queue system, request limit increase |
| LLM costs exceed budget | High | Medium | Set per-org token limits, cache common responses |
| Mobile PWA performance | Medium | High | Aggressive code splitting, offline-first architecture |
| Stripe onboarding friction | Medium | Medium | Offer Stripe Express for faster setup |
| Scope creep | High | High | Strict PRD adherence, weekly scope reviews |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CPTO | [Pending] | | |
| CEO | [Pending] | | |
| Engineering Lead | [Pending] | | |

---

*Document Version: 1.0*
*Last Updated: 2026-01-25*
