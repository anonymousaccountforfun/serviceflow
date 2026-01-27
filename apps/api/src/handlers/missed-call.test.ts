/**
 * Missed Call Handler Unit Tests
 *
 * Tests the critical missed call text-back flow:
 * 1. Event reception and job enqueueing
 * 2. Skip conditions (already sent, call answered, AI handled)
 * 3. Business hours template selection
 * 4. SMS delivery and call record updates
 */

import { mockPrisma, testData } from '../tests/mocks/database';

// Mock the services before importing the handler
jest.mock('../services/events', () => ({
  events: {
    on: jest.fn(),
    emit: jest.fn().mockResolvedValue('event_123'),
  },
}));

jest.mock('../services/job-queue', () => ({
  jobQueue: {
    register: jest.fn(),
    enqueue: jest.fn().mockResolvedValue('job_123'),
  },
}));

jest.mock('../services/sms', () => ({
  sms: {
    sendTemplated: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
  },
}));

jest.mock('../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@serviceflow/shared', () => ({
  isBusinessHours: jest.fn().mockReturnValue(true),
  TIMING: {
    MISSED_CALL_DELAY_MS: 30000,
  },
}));

// Import after mocks are set up
import { events } from '../services/events';
import { jobQueue } from '../services/job-queue';
import { sms } from '../services/sms';
import { isBusinessHours } from '@serviceflow/shared';
import { registerMissedCallHandler } from './missed-call';

describe('Missed Call Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerMissedCallHandler', () => {
    it('should register event handlers for call.missed and call.voicemail', () => {
      // Clear previous registrations
      (events.on as jest.Mock).mockClear();
      (jobQueue.register as jest.Mock).mockClear();

      registerMissedCallHandler();

      expect(events.on).toHaveBeenCalledWith('call.missed', expect.any(Function));
      expect(events.on).toHaveBeenCalledWith('call.voicemail', expect.any(Function));
    });

    it('should register job handler for missed_call_textback', () => {
      // Clear previous registrations
      (events.on as jest.Mock).mockClear();
      (jobQueue.register as jest.Mock).mockClear();

      registerMissedCallHandler();

      expect(jobQueue.register).toHaveBeenCalledWith(
        'missed_call_textback',
        expect.any(Function)
      );
    });
  });

  describe('handleMissedCallEvent', () => {
    let handleMissedCallEvent: (event: any) => Promise<void>;

    beforeEach(() => {
      // Clear previous registrations
      (events.on as jest.Mock).mockClear();
      (jobQueue.register as jest.Mock).mockClear();

      registerMissedCallHandler();
      // Get the registered handler
      const missedCallHandler = (events.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'call.missed'
      );
      handleMissedCallEvent = missedCallHandler ? missedCallHandler[1] : jest.fn();
    });

    it('should enqueue a text-back job with 30-second delay', async () => {
      const call = testData.call({
        id: 'call_123',
        customerId: 'cust_123',
        textBackSentAt: null,
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const event = {
        type: 'call.missed',
        organizationId: 'org_123',
        data: {
          callId: 'call_123',
          customerId: 'cust_123',
          from: '+15551111111',
        },
      };

      await handleMissedCallEvent(event);

      expect(jobQueue.enqueue).toHaveBeenCalledWith({
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_123',
          customerId: 'cust_123',
          from: '+15551111111',
        },
        delayMs: 30000,
      });
    });

    it('should skip enqueueing if text-back was already sent', async () => {
      const call = testData.call({
        id: 'call_123',
        textBackSentAt: new Date(), // Already sent
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const event = {
        type: 'call.missed',
        organizationId: 'org_123',
        data: {
          callId: 'call_123',
          customerId: 'cust_123',
          from: '+15551111111',
        },
      };

      await handleMissedCallEvent(event);

      expect(jobQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should skip enqueueing if call has no customer', async () => {
      const call = testData.call({
        id: 'call_123',
        customerId: null, // No customer
        textBackSentAt: null,
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const event = {
        type: 'call.missed',
        organizationId: 'org_123',
        data: {
          callId: 'call_123',
          customerId: null,
          from: '+15551111111',
        },
      };

      await handleMissedCallEvent(event);

      expect(jobQueue.enqueue).not.toHaveBeenCalled();
    });

    it('should skip enqueueing if call not found', async () => {
      mockPrisma.call.findUnique.mockResolvedValue(null);

      const event = {
        type: 'call.missed',
        organizationId: 'org_123',
        data: {
          callId: 'nonexistent',
          customerId: 'cust_123',
          from: '+15551111111',
        },
      };

      await handleMissedCallEvent(event);

      expect(jobQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('processMissedCallTextback', () => {
    let processMissedCallTextback: (job: any) => Promise<void>;

    beforeEach(() => {
      // Clear previous registrations
      (events.on as jest.Mock).mockClear();
      (jobQueue.register as jest.Mock).mockClear();

      registerMissedCallHandler();
      // Get the registered job handler
      const jobHandler = (jobQueue.register as jest.Mock).mock.calls.find(
        (call) => call[0] === 'missed_call_textback'
      );
      processMissedCallTextback = jobHandler ? jobHandler[1] : jest.fn();
    });

    it('should send text-back SMS and update call record on success', async () => {
      const organization = testData.organization({
        id: 'org_123',
        name: 'Test Plumbing',
        timezone: 'America/New_York',
        settings: { businessHours: { start: '08:00', end: '18:00' } },
      });

      const customer = testData.customer({
        id: 'cust_123',
        firstName: 'John',
        phone: '+15551111111',
      });

      const call = testData.call({
        id: 'call_123',
        customerId: 'cust_123',
        textBackSentAt: null,
        status: 'no_answer',
        aiHandled: false,
        organization,
        customer,
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);
      mockPrisma.call.update.mockResolvedValue({ ...call, textBackSentAt: new Date() });
      (sms.sendTemplated as jest.Mock).mockResolvedValue({ success: true, messageId: 'msg_123' });
      (isBusinessHours as jest.Mock).mockReturnValue(true);

      const job = {
        id: 'job_123',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_123',
          customerId: 'cust_123',
          from: '+15551111111',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).toHaveBeenCalledWith({
        organizationId: 'org_123',
        customerId: 'cust_123',
        to: '+15551111111',
        templateType: 'missed_call_textback',
        variables: {
          businessName: 'Test Plumbing',
          customerName: 'John',
        },
      });

      expect(mockPrisma.call.update).toHaveBeenCalledWith({
        where: { id: 'call_123' },
        data: {
          textBackSentAt: expect.any(Date),
          textBackMessageId: 'msg_123',
        },
      });
    });

    it('should use after-hours template outside business hours', async () => {
      const organization = testData.organization({
        id: 'org_123',
        name: 'Test Plumbing',
        timezone: 'America/New_York',
        settings: { businessHours: { start: '08:00', end: '18:00' } },
      });

      const customer = testData.customer({
        id: 'cust_123',
        firstName: 'Jane',
        phone: '+15552222222',
      });

      const call = testData.call({
        id: 'call_456',
        customerId: 'cust_123',
        textBackSentAt: null,
        status: 'no_answer',
        aiHandled: false,
        organization,
        customer,
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);
      mockPrisma.call.update.mockResolvedValue({ ...call, textBackSentAt: new Date() });
      (sms.sendTemplated as jest.Mock).mockResolvedValue({ success: true, messageId: 'msg_456' });
      (isBusinessHours as jest.Mock).mockReturnValue(false); // After hours

      const job = {
        id: 'job_456',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_456',
          customerId: 'cust_123',
          from: '+15552222222',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).toHaveBeenCalledWith({
        organizationId: 'org_123',
        customerId: 'cust_123',
        to: '+15552222222',
        templateType: 'missed_call_after_hours',
        variables: {
          businessName: 'Test Plumbing',
          customerName: 'Jane',
        },
      });
    });

    it('should skip text-back if call was answered (in_progress)', async () => {
      const call = testData.call({
        id: 'call_789',
        status: 'in_progress', // Call was answered
        textBackSentAt: null,
        aiHandled: false,
        organization: testData.organization(),
        customer: testData.customer(),
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const job = {
        id: 'job_789',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_789',
          customerId: 'cust_123',
          from: '+15553333333',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).not.toHaveBeenCalled();
      expect(mockPrisma.call.update).not.toHaveBeenCalled();
    });

    it('should skip text-back if call was completed', async () => {
      const call = testData.call({
        id: 'call_abc',
        status: 'completed', // Call was completed
        textBackSentAt: null,
        aiHandled: false,
        organization: testData.organization(),
        customer: testData.customer(),
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const job = {
        id: 'job_abc',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_abc',
          customerId: 'cust_123',
          from: '+15554444444',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).not.toHaveBeenCalled();
    });

    it('should skip text-back if AI already handled the call', async () => {
      const call = testData.call({
        id: 'call_ai',
        status: 'no_answer',
        textBackSentAt: null,
        aiHandled: true, // AI handled
        organization: testData.organization(),
        customer: testData.customer(),
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const job = {
        id: 'job_ai',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_ai',
          customerId: 'cust_123',
          from: '+15555555555',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).not.toHaveBeenCalled();
    });

    it('should skip if text-back was already sent (race condition)', async () => {
      const call = testData.call({
        id: 'call_race',
        status: 'no_answer',
        textBackSentAt: new Date(), // Already sent (race condition)
        aiHandled: false,
        organization: testData.organization(),
        customer: testData.customer(),
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const job = {
        id: 'job_race',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_race',
          customerId: 'cust_123',
          from: '+15556666666',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).not.toHaveBeenCalled();
    });

    it('should throw error to trigger retry when SMS fails', async () => {
      const organization = testData.organization({
        id: 'org_123',
        name: 'Test Plumbing',
        settings: {},
      });

      const customer = testData.customer({
        id: 'cust_123',
        firstName: 'Bob',
        phone: '+15557777777',
      });

      const call = testData.call({
        id: 'call_fail',
        status: 'no_answer',
        textBackSentAt: null,
        aiHandled: false,
        organization,
        customer,
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);
      (sms.sendTemplated as jest.Mock).mockResolvedValue({
        success: false,
        error: { code: 'TWILIO_ERROR', message: 'Service unavailable' },
      });

      const job = {
        id: 'job_fail',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_fail',
          customerId: 'cust_123',
          from: '+15557777777',
        },
      };

      await expect(processMissedCallTextback(job)).rejects.toThrow('Service unavailable');
    });

    it('should handle call with no customer gracefully', async () => {
      const call = testData.call({
        id: 'call_nocust',
        status: 'no_answer',
        textBackSentAt: null,
        aiHandled: false,
        organization: testData.organization(),
        customer: null, // No customer
      });

      mockPrisma.call.findUnique.mockResolvedValue(call);

      const job = {
        id: 'job_nocust',
        type: 'missed_call_textback',
        organizationId: 'org_123',
        payload: {
          callId: 'call_nocust',
          customerId: 'cust_123',
          from: '+15558888888',
        },
      };

      await processMissedCallTextback(job);

      expect(sms.sendTemplated).not.toHaveBeenCalled();
    });
  });
});
