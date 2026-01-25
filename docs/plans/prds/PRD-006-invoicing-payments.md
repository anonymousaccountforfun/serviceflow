# PRD-006: Invoicing & Payments

## Overview

| Field | Value |
|-------|-------|
| **Priority** | P0 - Critical |
| **Phase** | 2 - Core Workflows |
| **Estimated Effort** | 5 days |
| **Dependencies** | Stripe account |
| **Owner** | Full-stack Team |

## Problem Statement

Database has `Invoice` and `InvoiceLineItem` models, but there is **no UI** to:
- Create invoices
- Send invoices to customers
- Accept payments
- Track payment status

Users must use external tools (Word, QuickBooks, Venmo) for invoicing, defeating the purpose of an all-in-one platform.

## Goals

1. Generate professional invoices from jobs in <1 minute
2. Send invoices via SMS/email with payment link
3. Accept online payments via Stripe
4. Track paid/unpaid status with reminders

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Invoice creation time | <60 seconds | From job to sent invoice |
| Online payment rate | 40% | % of invoices paid online vs cash/check |
| Payment collection rate | 70% | % of invoices paid within 14 days |
| Invoice send success | 99% | SMS/email delivery rate |

## Functional Requirements

### FR-1: Invoice Creation
- Create invoice from job (pre-populate customer, line items)
- Create invoice from scratch
- Add/edit/remove line items
- Apply tax rate
- Add notes/terms
- Set due date
- Preview before sending

### FR-2: Invoice Sending
- Send via SMS with payment link
- Send via email with PDF attachment
- Send via both
- Custom message with invoice
- Track delivery status

### FR-3: Payment Collection
- Stripe Checkout integration for card payments
- Payment link that works on mobile
- Partial payment support
- Record manual payments (cash, check)
- Send payment receipt

### FR-4: Invoice Management
- List all invoices with status filter
- Invoice statuses: draft, sent, viewed, partial, paid, overdue, void
- Duplicate invoice
- Void invoice
- Resend invoice
- Download PDF

### FR-5: Payment Reminders
- Auto-remind at due date
- Auto-remind at due date + 7 days
- Manual reminder send
- Configurable reminder templates

### FR-6: Customer Invoice View (Public)
- View invoice without login
- See line items, total, due date
- Pay with card via Stripe
- Download PDF
- Contact business

## Technical Design

### API Endpoints

```typescript
// Create invoice
POST /api/invoices
Body: { jobId?, customerId, lineItems[], taxRate, dueDate, notes }
Response: { id, number, total, status }

// Get invoice
GET /api/invoices/:id
Response: { invoice with lineItems, customer, job, payments }

// Send invoice
POST /api/invoices/:id/send
Body: { method: "sms" | "email" | "both", message? }
Response: { sent: true, deliveryStatus }

// Create payment intent
POST /api/invoices/:id/payment-intent
Response: { clientSecret, paymentIntentId }

// Record payment
POST /api/invoices/:id/payments
Body: { amount, method: "card" | "cash" | "check", reference? }
Response: { payment, invoice: { status, amountPaid } }

// Public invoice view (no auth)
GET /api/public/invoices/:id?token=xxx
Response: { invoice with lineItems, paymentLink }

// Generate PDF
GET /api/invoices/:id/pdf
Response: PDF file
```

### Database (Enhance Existing)
```prisma
model Invoice {
  id             String   @id @default(cuid())
  number         String   // INV-001
  organizationId String
  customerId     String
  jobId          String?

  status         InvoiceStatus @default(draft)

  subtotal       Decimal
  taxRate        Decimal  @default(0)
  taxAmount      Decimal
  total          Decimal
  amountPaid     Decimal  @default(0)

  dueDate        DateTime
  sentAt         DateTime?
  viewedAt       DateTime?
  paidAt         DateTime?

  notes          String?
  terms          String?

  publicToken    String   @unique // For public access

  lineItems      InvoiceLineItem[]
  payments       Payment[]

  // ... relations
}

model Payment {
  id             String   @id @default(cuid())
  invoiceId      String
  amount         Decimal
  method         PaymentMethod
  stripePaymentId String?
  reference      String?  // Check number, etc.
  createdAt      DateTime @default(now())

  invoice        Invoice  @relation(...)
}

enum InvoiceStatus {
  draft
  sent
  viewed
  partial
  paid
  overdue
  void
}

enum PaymentMethod {
  card
  cash
  check
  other
}
```

### Stripe Integration
```typescript
// Create payment link
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: invoice.lineItems.map(li => ({
    price_data: {
      currency: 'usd',
      product_data: { name: li.description },
      unit_amount: Math.round(li.total * 100),
    },
    quantity: 1,
  })),
  success_url: `${BASE_URL}/pay/${invoice.id}/success`,
  cancel_url: `${BASE_URL}/pay/${invoice.id}`,
  metadata: { invoiceId: invoice.id },
});
```

## Tasks for Parallel Execution

### Agent 1: Invoice API & Database
```
Task: Build invoice management API

Subtasks:
1. Update Prisma schema with enhanced Invoice, Payment models
2. Run migration
3. Create apps/api/src/routes/invoices.ts
4. POST / - create invoice with line items
5. GET / - list invoices with filters
6. GET /:id - get invoice detail
7. PATCH /:id - update draft invoice
8. POST /:id/void - void invoice
9. Implement invoice number generation (INV-001, INV-002...)
10. Write API tests

Acceptance Criteria:
- Can create, read, update, void invoices
- Line items calculate totals correctly
- Invoice numbers are sequential per org
```

### Agent 2: Payment Processing
```
Task: Implement Stripe payment flow

Subtasks:
1. Create apps/api/src/services/stripe.ts
2. Implement createPaymentIntent(invoice)
3. Implement handleWebhook for payment_intent.succeeded
4. POST /api/invoices/:id/payment-intent endpoint
5. POST /api/invoices/:id/payments for manual payments
6. Update invoice status on payment
7. Implement partial payment logic
8. Create apps/api/src/webhooks/stripe.ts
9. Write payment flow tests

Acceptance Criteria:
- Stripe payment intent created correctly
- Webhook updates invoice on payment
- Partial payments tracked correctly
- Manual payments recorded
```

### Agent 3: Invoice Sending
```
Task: Implement invoice delivery

Subtasks:
1. Create apps/api/src/services/invoice-delivery.ts
2. Generate PDF with invoice template (use @react-pdf/renderer)
3. Send SMS with payment link via Twilio
4. Send email with PDF via SendGrid/Resend
5. POST /api/invoices/:id/send endpoint
6. Track delivery status
7. Update invoice.sentAt on send
8. Create reminder scheduler (cron or Vercel cron)

Acceptance Criteria:
- PDF generates correctly with all invoice data
- SMS sends with working payment link
- Email sends with PDF attachment
- sentAt updated on successful send
```

### Agent 4: Invoice UI
```
Task: Build invoice management UI

Subtasks:
1. Create apps/web/app/dashboard/invoices/page.tsx (list)
2. Create apps/web/app/dashboard/invoices/new/page.tsx (create)
3. Create apps/web/app/dashboard/invoices/[id]/page.tsx (detail)
4. Line item editor component
5. Invoice preview component
6. Send modal (choose SMS/email, add message)
7. Payment recording modal
8. Add "Create Invoice" button to job detail page
9. Integrate with React Query

Acceptance Criteria:
- Can create invoice with line items
- Can preview before sending
- Can send via SMS/email
- Can record manual payments
- Job detail has quick invoice button
```

### Agent 5: Public Payment Page
```
Task: Build customer-facing invoice page

Subtasks:
1. Create apps/web/app/pay/[id]/page.tsx (public, no auth)
2. Display invoice details (line items, total, due)
3. "Pay Now" button initiates Stripe Checkout
4. apps/web/app/pay/[id]/success/page.tsx (thank you)
5. PDF download button
6. Mobile-optimized design
7. Handle expired/paid/void states

Acceptance Criteria:
- Customer can view invoice without login
- Can pay via Stripe Checkout
- Mobile-friendly layout
- Shows appropriate state for paid/void invoices
```

## UI Mockups

### Invoice Creation
```
┌────────────────────────────────────────────────────────────┐
│ New Invoice                                    [ Preview ] │
├────────────────────────────────────────────────────────────┤
│ Customer: [ John Smith ▼ ]        Due Date: [ 02/08/26 ]  │
├────────────────────────────────────────────────────────────┤
│ Line Items                                                 │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Description              Qty    Price      Total       ││
│ ├────────────────────────────────────────────────────────┤│
│ │ Water heater install     1      $1,200    $1,200      ││
│ │ Parts - 50gal tank       1      $450      $450        ││
│ │ Labor - 3 hours          3      $85       $255        ││
│ │ [ + Add Line Item ]                                    ││
│ └────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│                                    Subtotal:    $1,905.00 │
│ Tax Rate: [ 8.25 ]%                Tax:         $157.16  │
│                                    ───────────────────────│
│                                    Total:       $2,062.16 │
├────────────────────────────────────────────────────────────┤
│ Notes: [ Optional notes for customer...              ]    │
├────────────────────────────────────────────────────────────┤
│             [ Save Draft ]  [ Send Invoice ]              │
└────────────────────────────────────────────────────────────┘
```

### Customer Payment Page
```
┌────────────────────────────────────────────────────────────┐
│              Mike's Plumbing                               │
│              Invoice #INV-047                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Water heater installation           $1,200.00            │
│  Parts - 50 gallon tank               $450.00             │
│  Labor (3 hours)                      $255.00             │
│                                      ─────────            │
│  Subtotal                           $1,905.00             │
│  Tax (8.25%)                          $157.16             │
│                                      ─────────            │
│  Total Due                          $2,062.16             │
│                                                            │
│  Due Date: February 8, 2026                               │
│                                                            │
│         ┌────────────────────────────────┐                │
│         │        Pay $2,062.16           │                │
│         │    💳 Credit or Debit Card     │                │
│         └────────────────────────────────┘                │
│                                                            │
│  [ Download PDF ]                                         │
│                                                            │
│  Questions? Call (512) 555-1234                          │
└────────────────────────────────────────────────────────────┘
```

## Non-Functional Requirements

- **Security**: Payment links use secure tokens, no sensitive data exposed
- **Performance**: Invoice PDF generates in <5 seconds
- **Reliability**: 99.9% payment processing success
- **Compliance**: PCI compliant via Stripe (no card data on our servers)

## Rollout Plan

1. **Day 1**: Database schema, invoice CRUD API
2. **Day 2**: Stripe integration, payment flow
3. **Day 3**: Invoice sending (SMS, email, PDF)
4. **Day 4**: Invoice UI (create, list, detail)
5. **Day 5**: Public payment page, testing

---

*PRD Version: 1.0*
*Author: CPTO*
*Date: 2026-01-25*
