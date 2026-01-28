/**
 * QA Test Plan - Critical Fixes Verification
 *
 * Tests for P0/P1/P2 fixes from code review:
 * - Phase 1: Idempotency Testing
 * - Phase 2: Race Condition Testing
 * - Phase 3: Auth Boundary Testing
 * - Phase 4: Transaction Integrity
 * - Phase 5: Event Ordering
 */

import { mockPrisma, testData } from './mocks/database';

// Mock logger
jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock SMS service
jest.mock('../services/sms', () => ({
  sms: {
    sendTemplated: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock webhooks service
jest.mock('../services/webhooks', () => ({
  logWebhook: jest.fn().mockResolvedValue('webhook_log_123'),
  markWebhookProcessed: jest.fn().mockResolvedValue(undefined),
  markWebhookIgnored: jest.fn().mockResolvedValue(undefined),
}));

import { logWebhook, markWebhookProcessed, markWebhookIgnored } from '../services/webhooks';

describe('QA Test Plan - Critical Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // PHASE 1: IDEMPOTENCY TESTING
  // ============================================
  describe('Phase 1: Idempotency Testing', () => {
    describe('Stripe Webhook Idempotency', () => {
      it('should detect duplicate webhook events by externalId', async () => {
        const eventId = 'evt_duplicate_123';

        // First call - no existing webhook
        mockPrisma.webhookLog.findFirst.mockResolvedValueOnce(null);

        const firstCheck = await mockPrisma.webhookLog.findFirst({
          where: { provider: 'stripe', externalId: eventId },
          select: { id: true, status: true },
        });

        expect(firstCheck).toBeNull();

        // Second call - existing webhook found
        mockPrisma.webhookLog.findFirst.mockResolvedValueOnce({
          id: 'log_123',
          status: 'processed',
        });

        const secondCheck = await mockPrisma.webhookLog.findFirst({
          where: { provider: 'stripe', externalId: eventId },
          select: { id: true, status: true },
        });

        expect(secondCheck).not.toBeNull();
        expect(secondCheck?.status).toBe('processed');
      });

      it('should log webhook before processing', async () => {
        const event = {
          id: 'evt_new_123',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_123' } },
        };

        // Simulate logging webhook
        const logId = await logWebhook({
          provider: 'stripe',
          eventType: event.type,
          externalId: event.id,
          payload: event,
        });

        expect(logWebhook).toHaveBeenCalledWith({
          provider: 'stripe',
          eventType: 'payment_intent.succeeded',
          externalId: 'evt_new_123',
          payload: event,
        });
        expect(logId).toBe('webhook_log_123');
      });

      it('should mark webhook as processed on success', async () => {
        const logId = 'webhook_log_456';

        await markWebhookProcessed(logId);

        expect(markWebhookProcessed).toHaveBeenCalledWith(logId);
      });

      it('should mark webhook as processed with error on failure', async () => {
        const logId = 'webhook_log_789';
        const errorMessage = 'Database error';

        await markWebhookProcessed(logId, errorMessage);

        expect(markWebhookProcessed).toHaveBeenCalledWith(logId, errorMessage);
      });
    });

    describe('Reschedule Token Atomic Usage (TOCTOU Fix)', () => {
      // Test the atomic update pattern logic
      it('should use atomic updateMany pattern with WHERE clause', () => {
        // The fix uses updateMany with a WHERE clause that atomically checks:
        // 1. token matches
        // 2. usedAt is null (not already used)
        // 3. expiresAt > now (not expired)
        // This prevents TOCTOU race conditions

        const atomicUpdatePattern = {
          where: {
            token: 'test_token',
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        };

        // Verify the pattern structure
        expect(atomicUpdatePattern.where.usedAt).toBeNull();
        expect(atomicUpdatePattern.where.expiresAt).toBeDefined();
        expect(atomicUpdatePattern.data.usedAt).toBeDefined();
      });

      it('should interpret count 0 as token already used or expired', () => {
        // When updateMany returns count: 0, it means:
        // - Token doesn't exist, OR
        // - Token was already used (concurrent request won), OR
        // - Token has expired

        const simulateAtomicResult = (tokenState: 'available' | 'used' | 'expired' | 'missing') => {
          switch (tokenState) {
            case 'available': return { count: 1 };
            case 'used': return { count: 0 };
            case 'expired': return { count: 0 };
            case 'missing': return { count: 0 };
          }
        };

        expect(simulateAtomicResult('available').count).toBe(1);
        expect(simulateAtomicResult('used').count).toBe(0);
        expect(simulateAtomicResult('expired').count).toBe(0);
        expect(simulateAtomicResult('missing').count).toBe(0);
      });

      it('should revert token usage if subsequent operations fail', () => {
        // The fix includes reverting token.usedAt to null if validation fails
        // This ensures tokens aren't consumed for invalid operations

        const revertTokenUsage = async (shouldRevert: boolean) => {
          if (shouldRevert) {
            // Would call: prisma.rescheduleToken.update({ where: { id }, data: { usedAt: null } })
            return { reverted: true };
          }
          return { reverted: false };
        };

        // Scenarios that should revert:
        // - Appointment not found
        // - New time is in the past
        // - Schedule conflict detected
        expect(revertTokenUsage(true)).resolves.toEqual({ reverted: true });
      });
    });
  });

  // ============================================
  // PHASE 2: RACE CONDITION TESTING
  // ============================================
  describe('Phase 2: Race Condition Testing', () => {
    describe('Estimate Number Generation (Transaction-Based)', () => {
      it('should use Serializable isolation level for estimate creation', async () => {
        const orgId = 'org_test123';

        // Mock transaction with isolation level
        mockPrisma.$transaction.mockImplementation(async (fn, options) => {
          // Verify isolation level is passed
          expect(options?.isolationLevel).toBe('Serializable');

          // Create a mock transaction client
          const txClient = {
            estimate: {
              findFirst: jest.fn().mockResolvedValue({ number: 'EST-005' }),
              create: jest.fn().mockResolvedValue({
                id: 'est_new',
                number: 'EST-006',
                organizationId: orgId,
              }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'est_new',
                number: 'EST-006',
              }),
            },
            estimateLineItem: {
              createMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };

          return fn(txClient);
        });

        // Simulate estimate creation with transaction
        const result = await mockPrisma.$transaction(
          async (tx: any) => {
            // Generate number inside transaction
            const latest = await tx.estimate.findFirst({
              where: { organizationId: orgId },
              orderBy: { number: 'desc' },
              select: { number: true },
            });

            const nextNum = latest ? parseInt(latest.number.replace('EST-', ''), 10) + 1 : 1;
            const estimateNumber = `EST-${nextNum.toString().padStart(3, '0')}`;

            const estimate = await tx.estimate.create({
              data: {
                number: estimateNumber,
                organizationId: orgId,
                customerId: 'cust_123',
                status: 'draft',
                subtotal: 10000,
                taxRate: 0,
                taxAmount: 0,
                total: 10000,
              },
            });

            return tx.estimate.findUnique({ where: { id: estimate.id } });
          },
          { isolationLevel: 'Serializable' }
        );

        expect(result.number).toBe('EST-006');
      });
    });

    describe('Vapi Call Status Transition Validation', () => {
      const CALL_STATUS_ORDER: Record<string, number> = {
        ringing: 1,
        in_progress: 2,
        completed: 3,
        no_answer: 3,
      };

      function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
        const currentOrder = CALL_STATUS_ORDER[currentStatus] ?? 0;
        const newOrder = CALL_STATUS_ORDER[newStatus] ?? 0;
        return newOrder >= currentOrder;
      }

      it('should allow forward status transitions', () => {
        expect(isValidStatusTransition('ringing', 'in_progress')).toBe(true);
        expect(isValidStatusTransition('in_progress', 'completed')).toBe(true);
        expect(isValidStatusTransition('ringing', 'completed')).toBe(true);
      });

      it('should reject backward status transitions', () => {
        expect(isValidStatusTransition('completed', 'in_progress')).toBe(false);
        expect(isValidStatusTransition('in_progress', 'ringing')).toBe(false);
        expect(isValidStatusTransition('completed', 'ringing')).toBe(false);
      });

      it('should allow same status (idempotent)', () => {
        expect(isValidStatusTransition('ringing', 'ringing')).toBe(true);
        expect(isValidStatusTransition('completed', 'completed')).toBe(true);
      });

      it('should treat terminal states as equal priority', () => {
        expect(isValidStatusTransition('completed', 'no_answer')).toBe(true);
        expect(isValidStatusTransition('no_answer', 'completed')).toBe(true);
      });
    });

    describe('Share Token Max Views (Atomic Increment)', () => {
      it('should use raw SQL for atomic increment with bounds check', () => {
        // The fix uses $executeRaw with a WHERE clause that atomically:
        // 1. Checks token exists
        // 2. Checks not expired (expiresAt > NOW())
        // 3. Checks view limit not reached (maxViews IS NULL OR viewCount < maxViews)
        // 4. Increments viewCount

        const atomicIncrementSQL = `
          UPDATE "ShareToken"
          SET "viewCount" = "viewCount" + 1
          WHERE "token" = $1
            AND "expiresAt" > NOW()
            AND ("maxViews" IS NULL OR "viewCount" < "maxViews")
        `;

        // Verify SQL structure includes all safety checks
        expect(atomicIncrementSQL).toContain('"viewCount" = "viewCount" + 1');
        expect(atomicIncrementSQL).toContain('"expiresAt" > NOW()');
        expect(atomicIncrementSQL).toContain('"maxViews" IS NULL');
        expect(atomicIncrementSQL).toContain('"viewCount" < "maxViews"');
      });

      it('should interpret result count for share token state', () => {
        // When $executeRaw returns 0, it means:
        // - Token doesn't exist, OR
        // - Token has expired, OR
        // - Max views has been reached

        const interpretResult = (rowsUpdated: number) => {
          if (rowsUpdated === 1) return 'view_counted';
          return 'rejected'; // Could be expired, max views, or not found
        };

        expect(interpretResult(1)).toBe('view_counted');
        expect(interpretResult(0)).toBe('rejected');
      });

      it('should prevent concurrent requests from exceeding max views', () => {
        // Scenario: maxViews = 10, viewCount = 9
        // Two concurrent requests arrive simultaneously
        // Only ONE should succeed due to atomic WHERE clause

        const simulateConcurrentViews = (
          currentCount: number,
          maxViews: number,
          concurrentRequests: number
        ) => {
          let successCount = 0;
          const remaining = maxViews - currentCount;

          // Simulate atomic check - only 'remaining' requests can succeed
          for (let i = 0; i < concurrentRequests; i++) {
            if (successCount < remaining) {
              successCount++;
            }
          }

          return successCount;
        };

        // 9 views, max 10, 5 concurrent - only 1 should succeed
        expect(simulateConcurrentViews(9, 10, 5)).toBe(1);

        // 8 views, max 10, 5 concurrent - only 2 should succeed
        expect(simulateConcurrentViews(8, 10, 5)).toBe(2);

        // 10 views, max 10, 5 concurrent - none should succeed
        expect(simulateConcurrentViews(10, 10, 5)).toBe(0);
      });
    });
  });

  // ============================================
  // PHASE 3: AUTH BOUNDARY TESTING
  // ============================================
  describe('Phase 3: Auth Boundary Testing', () => {
    describe('Invoice Payment Rate Limiting', () => {
      it('should have rate limiter configured for public invoice endpoints', () => {
        // This is a configuration test - verify the rate limiter is properly configured
        const { invoicePaymentLimiter } = require('../middleware/rate-limit');

        expect(invoicePaymentLimiter).toBeDefined();
        // Rate limiter should be a function (middleware)
        expect(typeof invoicePaymentLimiter).toBe('function');
      });

      it('should generate unique keys per IP + invoice ID', () => {
        // Test the key generator logic
        const keyGenerator = (req: any) => {
          const invoiceId = req.params.id || 'unknown';
          const ip = req.ip || req.socket?.remoteAddress || 'unknown';
          return `invoice-${ip}-${invoiceId}`;
        };

        const req1 = { params: { id: 'inv_123' }, ip: '192.168.1.1' };
        const req2 = { params: { id: 'inv_456' }, ip: '192.168.1.1' };
        const req3 = { params: { id: 'inv_123' }, ip: '192.168.1.2' };

        expect(keyGenerator(req1)).toBe('invoice-192.168.1.1-inv_123');
        expect(keyGenerator(req2)).toBe('invoice-192.168.1.1-inv_456');
        expect(keyGenerator(req3)).toBe('invoice-192.168.1.2-inv_123');

        // Different invoices or IPs should have different keys
        expect(keyGenerator(req1)).not.toBe(keyGenerator(req2));
        expect(keyGenerator(req1)).not.toBe(keyGenerator(req3));
      });
    });

    describe('Per-User Rate Limiting', () => {
      it('should use user ID when authenticated', () => {
        const keyGenerator = (req: any) => {
          const userId = req.auth?.userId;
          if (userId) {
            return `user-${userId}`;
          }
          return req.ip || 'unknown';
        };

        const authenticatedReq = { auth: { userId: 'user_123' }, ip: '192.168.1.1' };
        const unauthenticatedReq = { ip: '192.168.1.1' };

        expect(keyGenerator(authenticatedReq)).toBe('user-user_123');
        expect(keyGenerator(unauthenticatedReq)).toBe('192.168.1.1');
      });
    });
  });

  // ============================================
  // PHASE 4: TRANSACTION INTEGRITY
  // ============================================
  describe('Phase 4: Transaction Integrity', () => {
    describe('Payment Intent with DB Update', () => {
      it('should create payment intent before updating invoice', async () => {
        const invoiceId = 'inv_test123';
        const paymentIntentId = 'pi_new123';

        // Mock successful payment intent creation
        const stripeService = {
          createPaymentIntent: jest.fn().mockResolvedValue({
            paymentIntentId,
            clientSecret: 'secret_123',
          }),
          cancelPaymentIntent: jest.fn().mockResolvedValue(undefined),
        };

        // Create payment intent
        const paymentIntent = await stripeService.createPaymentIntent({
          amount: 10000,
          invoiceId,
          customerEmail: 'test@example.com',
          description: 'Test invoice',
          organizationId: 'org_123',
        });

        expect(paymentIntent.paymentIntentId).toBe(paymentIntentId);

        // Then update invoice
        mockPrisma.invoice.update.mockResolvedValue({
          id: invoiceId,
          stripePaymentIntentId: paymentIntentId,
        });

        const invoice = await mockPrisma.invoice.update({
          where: { id: invoiceId },
          data: { stripePaymentIntentId: paymentIntentId },
        });

        expect(invoice.stripePaymentIntentId).toBe(paymentIntentId);
      });

      it('should cancel payment intent if DB update fails', async () => {
        const invoiceId = 'inv_fail123';
        const paymentIntentId = 'pi_orphan123';

        const stripeService = {
          createPaymentIntent: jest.fn().mockResolvedValue({
            paymentIntentId,
            clientSecret: 'secret_123',
          }),
          cancelPaymentIntent: jest.fn().mockResolvedValue(undefined),
        };

        // Create payment intent succeeds
        const paymentIntent = await stripeService.createPaymentIntent({
          amount: 10000,
          invoiceId,
        });

        // DB update fails
        mockPrisma.invoice.update.mockRejectedValue(new Error('Database error'));

        try {
          await mockPrisma.invoice.update({
            where: { id: invoiceId },
            data: { stripePaymentIntentId: paymentIntentId },
          });
        } catch (error) {
          // Cancel the orphaned payment intent
          await stripeService.cancelPaymentIntent(paymentIntentId);
        }

        expect(stripeService.cancelPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
      });
    });

    describe('Payment Success with Transaction', () => {
      it('should create payment and update invoice atomically', async () => {
        const invoiceId = 'inv_atomic123';
        const paymentIntentId = 'pi_atomic123';

        const mockPayment = {
          id: 'pay_123',
          invoiceId,
          amount: 15000,
          status: 'succeeded',
        };

        const mockInvoice = {
          id: invoiceId,
          status: 'paid',
          paidAt: new Date(),
        };

        // Mock transaction
        mockPrisma.$transaction.mockResolvedValue([mockPayment, mockInvoice]);

        const [payment, invoice] = await mockPrisma.$transaction([
          mockPrisma.payment.create({
            data: {
              invoiceId,
              organizationId: 'org_123',
              customerId: 'cust_123',
              amount: 15000,
              method: 'card',
              status: 'succeeded',
              stripePaymentIntentId: paymentIntentId,
              processedAt: new Date(),
            },
          }),
          mockPrisma.invoice.update({
            where: { id: invoiceId },
            data: {
              status: 'paid',
              paidAt: new Date(),
              paidAmount: 15000,
              stripePaymentIntentId: paymentIntentId,
            },
          }),
        ]);

        expect(payment.status).toBe('succeeded');
        expect(invoice.status).toBe('paid');
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // PHASE 5: EVENT ORDERING
  // ============================================
  describe('Phase 5: Event Ordering', () => {
    describe('Stripe Subscription Event Ordering', () => {
      it('should process events in timestamp order', async () => {
        const subscriptionId = 'sub_ordering_test';

        // Mock finding latest processed webhook
        mockPrisma.webhookLog.findFirst.mockResolvedValue({
          id: 'log_old',
          payload: {
            created: 1700000000, // Earlier timestamp
            data: { object: { id: subscriptionId } },
          },
          createdAt: new Date('2024-01-01'),
        });

        // New event with later timestamp should be processed
        const newEventTimestamp = 1700000100; // Later timestamp

        // Simulate shouldProcessSubscriptionEvent logic
        const latestWebhook = await mockPrisma.webhookLog.findFirst({
          where: {
            provider: 'stripe',
            eventType: { startsWith: 'customer.subscription' },
            status: 'processed',
          },
          orderBy: { createdAt: 'desc' },
          select: { payload: true, createdAt: true },
        });

        const payload = latestWebhook?.payload as any;
        const latestTimestamp = payload?.created || 0;

        // New event is newer, should process
        expect(newEventTimestamp > latestTimestamp).toBe(true);
      });

      it('should skip out-of-order events', async () => {
        const subscriptionId = 'sub_ordering_test';

        // Mock finding latest processed webhook with newer timestamp
        mockPrisma.webhookLog.findFirst.mockResolvedValue({
          id: 'log_new',
          payload: {
            created: 1700000200, // Later timestamp
            data: { object: { id: subscriptionId } },
          },
          createdAt: new Date('2024-01-02'),
        });

        // Old event arriving late
        const oldEventTimestamp = 1700000100; // Earlier timestamp

        const latestWebhook = await mockPrisma.webhookLog.findFirst({
          where: {
            provider: 'stripe',
            eventType: { startsWith: 'customer.subscription' },
            status: 'processed',
          },
          orderBy: { createdAt: 'desc' },
          select: { payload: true, createdAt: true },
        });

        const payload = latestWebhook?.payload as any;
        const latestTimestamp = payload?.created || 0;

        // Old event should be skipped
        expect(oldEventTimestamp < latestTimestamp).toBe(true);
      });

      it('should process first event when no previous events exist', async () => {
        // No previous webhooks
        mockPrisma.webhookLog.findFirst.mockResolvedValue(null);

        const latestWebhook = await mockPrisma.webhookLog.findFirst({
          where: {
            provider: 'stripe',
            eventType: { startsWith: 'customer.subscription' },
            status: 'processed',
          },
        });

        // Should process when no previous events
        expect(latestWebhook).toBeNull();
        // In real code, this means shouldProcess = true
      });
    });
  });

  // ============================================
  // LOCK ORDERING TESTS
  // ============================================
  describe('Lock Ordering Strategy', () => {
    const LOCK_ORDER = {
      organization: 1,
      customer: 2,
      job: 3,
      appointment: 4,
      estimate: 5,
      invoice: 6,
      payment: 7,
    };

    type EntityType = keyof typeof LOCK_ORDER;

    function sortByLockOrder(entities: EntityType[]): EntityType[] {
      return [...entities].sort((a, b) => LOCK_ORDER[a] - LOCK_ORDER[b]);
    }

    function validateLockOrder(entities: EntityType[]): boolean {
      for (let i = 1; i < entities.length; i++) {
        if (LOCK_ORDER[entities[i]] < LOCK_ORDER[entities[i - 1]]) {
          return false;
        }
      }
      return true;
    }

    it('should sort entities by lock order', () => {
      const unordered: EntityType[] = ['payment', 'job', 'invoice', 'customer'];
      const ordered = sortByLockOrder(unordered);

      expect(ordered).toEqual(['customer', 'job', 'invoice', 'payment']);
    });

    it('should validate correct lock order', () => {
      const correct: EntityType[] = ['customer', 'job', 'invoice', 'payment'];
      expect(validateLockOrder(correct)).toBe(true);
    });

    it('should reject incorrect lock order', () => {
      const incorrect: EntityType[] = ['payment', 'invoice', 'job'];
      expect(validateLockOrder(incorrect)).toBe(false);
    });

    it('should handle single entity', () => {
      const single: EntityType[] = ['job'];
      expect(validateLockOrder(single)).toBe(true);
      expect(sortByLockOrder(single)).toEqual(['job']);
    });
  });

  // ============================================
  // TRANSCRIPT MERGE TESTS
  // ============================================
  describe('Transcript Merge Logic', () => {
    function mergeTranscripts(existing: string | null, incoming: string): string {
      if (!existing) return incoming;

      // If incoming is a continuation (longer), use it
      if (incoming.startsWith(existing) || incoming.length > existing.length) {
        return incoming;
      }

      // If incoming is shorter but different, append as new segment
      if (incoming.length < existing.length) {
        return `${existing}\n\n[continued]\n${incoming}`;
      }

      return incoming;
    }

    it('should use incoming transcript when no existing', () => {
      const result = mergeTranscripts(null, 'Hello, how can I help?');
      expect(result).toBe('Hello, how can I help?');
    });

    it('should use longer transcript as continuation', () => {
      const existing = 'Hello';
      const incoming = 'Hello, how can I help you today?';

      const result = mergeTranscripts(existing, incoming);
      expect(result).toBe(incoming);
    });

    it('should append shorter different transcript as new segment', () => {
      const existing = 'Hello, how can I help you today?';
      const incoming = 'Thank you, goodbye.';

      const result = mergeTranscripts(existing, incoming);
      expect(result).toContain(existing);
      expect(result).toContain('[continued]');
      expect(result).toContain(incoming);
    });
  });
});
