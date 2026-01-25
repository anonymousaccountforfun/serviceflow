# PRD-007: Estimates & Quotes

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P1 - High |
| **Phase** | 2 - Core Workflows |
| **Estimated Effort** | 4 days |
| **Dependencies** | PRD-006 (Invoicing) |
| **Owner** | Full-stack Team |

## Problem Statement

Service businesses need to provide estimates before work begins, but ServiceFlow has no estimate/quote functionality. Users must create estimates in separate tools (Word, email) and manually convert them to invoices later, creating duplication and errors.

**Impact**:
- Lost quotes (no tracking)
- Manual re-entry when converting to invoice
- No approval workflow
- Can't track win rate

## Goals

1. Create professional estimates in <2 minutes
2. Send estimates for customer approval
3. Convert approved estimates to invoices with one click
4. Track quote-to-close rate

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Estimate creation time | <2 minutes | Time from start to send |
| Customer approval rate | 60% | % of sent estimates approved |
| Estimate-to-invoice conversion | 95% | % approved that become invoices |
| Quote tracking | 100% | All estimates have status tracked |

## Functional Requirements

### FR-1: Estimate Creation
- Create estimate from scratch
- Create estimate from job
- Add/edit/remove line items
- Apply tax rate
- Add notes, terms, validity period
- Preview before sending
- Save as template

### FR-2: Customer Approval Flow
- Send estimate via SMS/email
- Customer views without login (public page)
- Customer can approve or request changes
- Approval captures digital signature
- Declined estimates prompt for feedback

### FR-3: Estimate-to-Invoice Conversion
- One-click convert approved estimate to invoice
- All line items transfer automatically
- Link invoice to original estimate
- Maintain audit trail

### FR-4: Estimate Management
- List all estimates with status filter
- Statuses: draft, sent, viewed, approved, declined, expired, converted
- Duplicate estimate
- Void estimate
- Resend estimate
- Track validity expiration

## Technical Design

### Database Schema
```prisma
model Estimate {
  id             String   @id @default(cuid())
  number         String   // EST-001
  organizationId String
  customerId     String
  jobId          String?

  status         EstimateStatus @default(draft)

  subtotal       Decimal
  taxRate        Decimal  @default(0)
  taxAmount      Decimal
  total          Decimal

  validUntil     DateTime
  sentAt         DateTime?
  viewedAt       DateTime?
  approvedAt     DateTime?
  declinedAt     DateTime?

  approvalSignature String?  // Base64 signature image
  declineReason    String?

  notes          String?
  terms          String?

  publicToken    String   @unique

  lineItems      EstimateLineItem[]
  invoice        Invoice?  @relation(...)

  // ... relations
}

enum EstimateStatus {
  draft
  sent
  viewed
  approved
  declined
  expired
  converted
}
```

### API Endpoints
```typescript
POST   /api/estimates           // Create estimate
GET    /api/estimates           // List with filters
GET    /api/estimates/:id       // Get detail
PATCH  /api/estimates/:id       // Update draft
POST   /api/estimates/:id/send  // Send to customer
POST   /api/estimates/:id/convert // Convert to invoice

// Public (no auth)
GET    /api/public/estimates/:id?token=xxx
POST   /api/public/estimates/:id/approve
POST   /api/public/estimates/:id/decline
```

## Tasks for Parallel Execution

### Agent 1: Estimate API & Database
```
Task: Build estimate management API

Subtasks:
1. Add Estimate, EstimateLineItem models to Prisma schema
2. Run migration
3. Create apps/api/src/routes/estimates.ts
4. POST / - create estimate with line items
5. GET / - list estimates with filters
6. GET /:id - get estimate detail
7. PATCH /:id - update draft estimate
8. POST /:id/void - void estimate
9. Implement estimate number generation (EST-001, EST-002...)
10. Write API tests

Acceptance Criteria:
- Can create, read, update, void estimates
- Line items calculate totals correctly
- Estimate numbers are sequential per org
```

### Agent 2: Customer Approval Flow
```
Task: Build customer-facing estimate approval

Subtasks:
1. Create apps/web/app/quote/[id]/page.tsx (public, no auth)
2. Display estimate details (line items, total, validity)
3. "Approve" button with signature capture
4. "Request Changes" button with feedback form
5. apps/web/app/quote/[id]/approved/page.tsx (confirmation)
6. POST /api/public/estimates/:id/approve endpoint
7. POST /api/public/estimates/:id/decline endpoint
8. Mobile-optimized design

Acceptance Criteria:
- Customer can view estimate without login
- Can approve with signature
- Can decline with feedback
- Mobile-friendly layout
```

### Agent 3: Estimate UI & Conversion
```
Task: Build estimate management UI

Subtasks:
1. Create apps/web/app/dashboard/estimates/page.tsx (list)
2. Create apps/web/app/dashboard/estimates/new/page.tsx (create)
3. Create apps/web/app/dashboard/estimates/[id]/page.tsx (detail)
4. Line item editor component (reuse from invoices)
5. Estimate preview component
6. Send modal (choose SMS/email)
7. "Convert to Invoice" button with confirmation
8. POST /api/estimates/:id/convert endpoint
9. Integrate with React Query

Acceptance Criteria:
- Can create estimate with line items
- Can preview before sending
- Can send via SMS/email
- Can convert approved estimate to invoice
```

## UI Mockups

### Estimate Creation
```
┌────────────────────────────────────────────────────────────┐
│ New Estimate                                   [ Preview ] │
├────────────────────────────────────────────────────────────┤
│ Customer: [ John Smith ▼ ]      Valid Until: [ 02/08/26 ] │
├────────────────────────────────────────────────────────────┤
│ Line Items                                                 │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Description              Qty    Price      Total       ││
│ ├────────────────────────────────────────────────────────┤│
│ │ Water heater install     1      $1,200    $1,200      ││
│ │ Parts - 50gal tank       1      $450      $450        ││
│ │ Labor (estimated)        3 hrs  $85       $255        ││
│ │ [ + Add Line Item ]                                    ││
│ └────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│                                    Subtotal:    $1,905.00 │
│ Tax Rate: [ 8.25 ]%                Tax:         $157.16  │
│                                    ───────────────────────│
│                                    Total:       $2,062.16 │
├────────────────────────────────────────────────────────────┤
│ Notes: [ This estimate is valid for 14 days...       ]    │
├────────────────────────────────────────────────────────────┤
│             [ Save Draft ]  [ Send Estimate ]             │
└────────────────────────────────────────────────────────────┘
```

### Customer Approval Page
```
┌────────────────────────────────────────────────────────────┐
│              Mike's Plumbing                               │
│              Estimate #EST-023                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Water heater installation           $1,200.00            │
│  Parts - 50 gallon tank               $450.00             │
│  Labor (estimated 3 hours)            $255.00             │
│                                      ─────────            │
│  Subtotal                           $1,905.00             │
│  Tax (8.25%)                          $157.16             │
│                                      ─────────            │
│  Estimated Total                    $2,062.16             │
│                                                            │
│  Valid Until: February 8, 2026                            │
│                                                            │
│  ┌────────────────────────────────────────────┐           │
│  │ Sign here to approve:                      │           │
│  │ ┌────────────────────────────────────────┐ │           │
│  │ │         [Signature Canvas]             │ │           │
│  │ └────────────────────────────────────────┘ │           │
│  │         [ Clear ]                          │           │
│  └────────────────────────────────────────────┘           │
│                                                            │
│  ┌────────────────────────────────────┐                   │
│  │     ✓ Approve This Estimate        │                   │
│  └────────────────────────────────────┘                   │
│                                                            │
│  [ Request Changes ]                                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Performance**: Estimate PDF generates in <5 seconds
- **Security**: Public links use secure tokens
- **Mobile**: Approval page works on mobile devices
- **Audit**: Full history of estimate changes

## Rollout Plan

1. **Day 1**: Database schema, estimate CRUD API
2. **Day 2**: Customer approval flow (public page)
3. **Day 3**: Estimate UI (create, list, detail)
4. **Day 4**: Conversion to invoice, testing

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
