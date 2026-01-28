/**
 * Invoices Routes Integration Tests
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from '../tests/mocks/database';

// Mock Clerk
jest.mock('@clerk/backend', () => ({
  Clerk: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  }),
  verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  createClerkClient: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  }),
}));

// Mock SMS service
const mockSendTemplated = jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123' });
jest.mock('../services/sms', () => ({
  sms: {
    sendTemplated: (...args: unknown[]) => mockSendTemplated(...args),
  },
}));

describe('Invoices Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testCustomer = testData.customer();
  const testJob = testData.job();
  const testOrganization = testData.organization();

  const testInvoice = {
    id: 'inv_test123',
    organizationId: testUser.organizationId,
    customerId: testCustomer.id,
    jobId: testJob.id,
    lineItems: [
      { description: 'Service', quantity: 1, unitPrice: 10000, total: 10000 },
    ],
    subtotal: 10000,
    tax: 0,
    total: 10000,
    status: 'draft',
    paidAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
    mockSendTemplated.mockResolvedValue({ success: true, messageId: 'msg_123' });
  });

  describe('GET /api/invoices', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/invoices')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return paginated invoices list', async () => {
      const invoices = [
        { ...testInvoice, id: 'inv_1' },
        { ...testInvoice, id: 'inv_2' },
      ];

      mockPrisma.invoice.findMany.mockResolvedValue(invoices);
      mockPrisma.invoice.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/invoices')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      await request(app)
        .get('/api/invoices?status=sent')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'sent',
          }),
        })
      );
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should return 404 for non-existent invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/invoices/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should return invoice by ID', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        ...testInvoice,
        job: testJob,
        customer: testCustomer,
      });

      const response = await request(app)
        .get(`/api/invoices/${testInvoice.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testInvoice.id);
    });
  });

  describe('POST /api/invoices', () => {
    it('should create a new invoice', async () => {
      mockPrisma.job.findFirst.mockResolvedValue({
        ...testJob,
        customer: testCustomer,
      });
      mockPrisma.invoice.create.mockResolvedValue({
        ...testInvoice,
        job: testJob,
        customer: testCustomer,
      });

      const response = await request(app)
        .post('/api/invoices')
        .set(authHeader)
        .send({
          jobId: testJob.id,
          lineItems: [
            { description: 'Service', quantity: 1, unitPrice: 10000, total: 10000 },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
    });

    it('should return 404 for non-existent job', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/invoices')
        .set(authHeader)
        .send({
          jobId: 'nonexistent',
          lineItems: [
            { description: 'Service', quantity: 1, unitPrice: 10000, total: 10000 },
          ],
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });
  });

  describe('PATCH /api/invoices/:id', () => {
    it('should update invoice status', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(testInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...testInvoice,
        status: 'sent',
        sentAt: new Date(),
      });

      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set(authHeader)
        .send({ status: 'sent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('sent');
    });

    it('should reject editing paid invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        ...testInvoice,
        status: 'paid',
      });

      const response = await request(app)
        .patch(`/api/invoices/${testInvoice.id}`)
        .set(authHeader)
        .send({ status: 'draft' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });
  });

  describe('POST /api/invoices/:id/send', () => {
    const invoiceWithRelations = {
      ...testInvoice,
      customer: testCustomer,
      organization: testOrganization,
      customerId: testCustomer.id,
    };

    it('should send invoice and trigger SMS', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceWithRelations);
      mockPrisma.invoice.update.mockResolvedValue({
        ...invoiceWithRelations,
        status: 'sent',
        sentAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/send`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'sent',
          }),
        })
      );

      // Verify SMS was sent
      expect(mockSendTemplated).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: 'invoice_sent',
          to: testCustomer.phone,
          variables: expect.objectContaining({
            customerName: expect.any(String),
            amount: '100.00', // $100.00 from 10000 cents
            paymentLink: expect.stringContaining('/pay/'),
          }),
        })
      );
    });

    it('should still succeed if SMS fails', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceWithRelations);
      mockPrisma.invoice.update.mockResolvedValue({
        ...invoiceWithRelations,
        status: 'sent',
        sentAt: new Date(),
      });
      mockSendTemplated.mockRejectedValue(new Error('SMS failed'));

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/send`)
        .set(authHeader)
        .expect(200);

      // Should still succeed - SMS failure doesn't block invoice send
      expect(response.body.success).toBe(true);
    });

    it('should handle missing customer phone gracefully', async () => {
      const invoiceNoPhone = {
        ...invoiceWithRelations,
        customer: { ...testCustomer, phone: null },
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceNoPhone);
      mockPrisma.invoice.update.mockResolvedValue({
        ...invoiceNoPhone,
        status: 'sent',
        sentAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/send`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      // SMS should not be called without phone
      expect(mockSendTemplated).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/invoices/nonexistent/send')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should allow re-sending already sent invoice and trigger SMS again', async () => {
      // Invoice already sent - simulates a re-send scenario
      const alreadySentInvoice = {
        ...invoiceWithRelations,
        status: 'sent',
        sentAt: new Date(Date.now() - 86400000), // Sent yesterday
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(alreadySentInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...alreadySentInvoice,
        sentAt: new Date(), // Updated sentAt
      });

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/send`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      // SMS should still be sent on re-send (customer may not have received first one)
      expect(mockSendTemplated).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: 'invoice_sent',
        })
      );
    });
  });

  describe('POST /api/invoices/:id/record-payment', () => {
    const invoiceWithRelationsForPayment = {
      ...testInvoice,
      customer: testCustomer,
      organization: testOrganization,
      customerId: testCustomer.id,
    };

    const mockPayment = {
      id: 'pay_test123',
      invoiceId: testInvoice.id,
      organizationId: testUser.organizationId,
      customerId: testCustomer.id,
      amount: 5000,
      method: 'cash',
      status: 'succeeded',
      note: 'Partial payment',
      recordedBy: testUser.id,
      processedAt: new Date(),
      createdAt: new Date(),
    };

    it('should record partial payment, create Payment record, and send SMS', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceWithRelationsForPayment);
      // Mock transaction returning [payment, updatedInvoice]
      mockPrisma.$transaction.mockResolvedValue([
        mockPayment,
        {
          ...invoiceWithRelationsForPayment,
          paidAmount: 5000,
          status: 'partial',
          customer: testCustomer,
        },
      ]);

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/record-payment`)
        .set(authHeader)
        .send({ amount: 5000, method: 'cash', note: 'Partial payment' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('partial');
      expect(response.body.data.payment.id).toBe('pay_test123');
      expect(response.body.data.payment.amount).toBe(5000);
      expect(response.body.data.payment.method).toBe('cash');
      expect(response.body.data.payment.status).toBe('succeeded');

      // Verify transaction was called with payment creation
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Verify payment confirmation SMS was sent
      expect(mockSendTemplated).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: 'payment_received',
          to: testCustomer.phone,
          variables: expect.objectContaining({
            customerName: expect.any(String),
            amount: '50.00', // $50.00 from 5000 cents
          }),
        })
      );
    });

    it('should mark as paid when full amount recorded', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceWithRelationsForPayment);
      mockPrisma.$transaction.mockResolvedValue([
        { ...mockPayment, amount: 10000, method: 'check' },
        {
          ...invoiceWithRelationsForPayment,
          paidAmount: 10000,
          status: 'paid',
          paidAt: new Date(),
          customer: testCustomer,
        },
      ]);

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/record-payment`)
        .set(authHeader)
        .send({ amount: 10000, method: 'check' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('paid');
      expect(response.body.data.payment.method).toBe('check');
    });

    it('should reject recording payment on paid invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        ...invoiceWithRelationsForPayment,
        status: 'paid',
      });

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/record-payment`)
        .set(authHeader)
        .send({ amount: 1000 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });

    it('should still succeed if SMS fails during payment recording', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceWithRelationsForPayment);
      mockPrisma.$transaction.mockResolvedValue([
        mockPayment,
        {
          ...invoiceWithRelationsForPayment,
          paidAmount: 5000,
          status: 'partial',
          customer: testCustomer,
        },
      ]);
      mockSendTemplated.mockRejectedValue(new Error('SMS failed'));

      const response = await request(app)
        .post(`/api/invoices/${testInvoice.id}/record-payment`)
        .set(authHeader)
        .send({ amount: 5000, method: 'cash' })
        .expect(200);

      // Should still succeed - SMS failure doesn't block payment recording
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/invoices/:id', () => {
    it('should void draft invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(testInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...testInvoice,
        status: 'canceled',
      });

      const response = await request(app)
        .delete(`/api/invoices/${testInvoice.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.voided).toBe(true);
    });

    it('should reject voiding paid invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        ...testInvoice,
        status: 'paid',
      });

      const response = await request(app)
        .delete(`/api/invoices/${testInvoice.id}`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });
  });

  describe('GET /api/invoices/:id/payments', () => {
    const mockPayments = [
      {
        id: 'pay_1',
        invoiceId: 'inv_test123',
        amount: 5000,
        method: 'card',
        status: 'succeeded',
        createdAt: new Date(),
      },
      {
        id: 'pay_2',
        invoiceId: 'inv_test123',
        amount: 5000,
        method: 'cash',
        status: 'succeeded',
        createdAt: new Date(),
      },
    ];

    it('should return payments for an invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv_test123' });
      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const response = await request(app)
        .get(`/api/invoices/${testInvoice.id}/payments`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should return 404 for non-existent invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/invoices/nonexistent/payments')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should return empty array for invoice with no payments', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv_test123' });
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/invoices/${testInvoice.id}/payments`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.total).toBe(0);
    });
  });
});
