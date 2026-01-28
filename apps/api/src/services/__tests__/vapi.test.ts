/**
 * Vapi Service Tests
 * Tests for AI Voice V1 features
 */

// Uses global jest types (not @jest/globals) for mock compatibility
import { mockPrisma } from '../../tests/mocks/database';
import {
  createTestOrganization,
  createTestCustomer,
  createRecentCall,
  createTestAISettings,
} from '../../tests/factories';

// Mock the SMS service
jest.mock('../sms', () => ({
  sms: {
    send: jest.fn(),
  },
}));

// Import after mocking
import vapi from '../vapi';
import { sms } from '../sms';

describe('VapiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sms.send as jest.Mock).mockResolvedValue({ success: true, messageId: 'test-msg-id' });
  });

  describe('buildSystemPrompt', () => {
    it('should include recording disclosure when enabled', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: {
            recordingDisclosure: true,
            recordingDisclosureText: 'Custom disclosure text here',
          },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('Custom disclosure text here');
    });

    it('should use default disclosure text when not provided', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: { recordingDisclosure: true },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('This call may be recorded');
    });

    it('should not include disclosure when disabled', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: { recordingDisclosure: false },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).not.toContain('START every call with');
    });

    it('should include emergency callback time from settings', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: { emergencyCallbackMinutes: 10 },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('10 minutes');
    });

    it('should use default emergency callback time of 15 minutes', () => {
      const org = createTestOrganization({
        settings: { aiSettings: {} },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('15 minutes');
    });

    it('should include services offered', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: {
            servicesOffered: ['drain cleaning', 'water heaters', 'leak repair'],
          },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('drain cleaning');
      expect(prompt).toContain('water heaters');
      expect(prompt).toContain('leak repair');
    });

    it('should include services NOT offered', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: {
            servicesNotOffered: ['electrical', 'HVAC', 'roofing'],
          },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('We do NOT handle');
      expect(prompt).toContain('electrical');
      expect(prompt).toContain('HVAC');
    });

    it('should include service call fee when set', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: { serviceCallFee: 8900 }, // $89
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('$89');
    });

    it('should include free estimates message when enabled', () => {
      const org = createTestOrganization({
        settings: {
          aiSettings: { freeEstimates: true },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('free estimates');
    });

    it('should include organization name', () => {
      const org = createTestOrganization({ name: 'Super Plumbers Inc' });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('Super Plumbers Inc');
    });

    it('should handle all afterHoursBehavior options', () => {
      const behaviors = [
        { behavior: 'emergency_only', expected: 'emergency_only' },
        { behavior: 'full_service', expected: 'full_service' },
        { behavior: 'message_only', expected: 'message_only' },
      ];

      behaviors.forEach(({ behavior, expected }) => {
        const org = createTestOrganization({
          settings: {
            aiSettings: { afterHoursBehavior: behavior },
          },
        });

        const prompt = vapi.buildSystemPrompt(org);

        expect(prompt).toContain(expected);
      });
    });

    it('should include service area cities', () => {
      const org = createTestOrganization({
        settings: {
          serviceArea: {
            cities: ['Austin', 'Round Rock', 'Cedar Park'],
          },
        },
      });

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('Austin');
      expect(prompt).toContain('Round Rock');
    });

    it('should include Tier 0 emergency instructions', () => {
      const org = createTestOrganization();

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('TIER 0');
      expect(prompt).toContain('gas smell');
      expect(prompt).toContain('911');
    });

    it('should instruct AI to NOT collect info for Tier 0 emergencies', () => {
      const org = createTestOrganization();

      const prompt = vapi.buildSystemPrompt(org);

      // Tier 0 should instruct to call 911 immediately, not collect customer info
      expect(prompt).toMatch(/TIER 0.*do not|don't|never.*collect|gather|ask/is);
      expect(prompt).toMatch(/gas.*smell.*911|911.*gas.*smell/is);
      // Should prioritize safety over booking
      expect(prompt).toMatch(/hang up|call 911|emergency services/is);
    });

    it('should include Tier 1 emergency instructions', () => {
      const org = createTestOrganization();

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('TIER 1');
      expect(prompt).toContain('flooding');
      expect(prompt).toContain('burst pipe');
    });

    it('should include robot disclosure instruction', () => {
      const org = createTestOrganization();

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('Is this a robot');
      expect(prompt).toContain("I'm an AI assistant");
    });

    it('should include lookup_customer tool reference', () => {
      const org = createTestOrganization();

      const prompt = vapi.buildSystemPrompt(org);

      expect(prompt).toContain('lookup_customer');
      expect(prompt).toContain('Repeat caller');
    });
  });

  describe('getAssistantTools', () => {
    it('should include all required tools', () => {
      const tools = vapi.getAssistantTools();
      const toolNames = tools.map((t) => t.function.name);

      expect(toolNames).toContain('book_appointment');
      expect(toolNames).toContain('check_availability');
      expect(toolNames).toContain('transfer_to_human');
      expect(toolNames).toContain('lookup_customer');
      expect(toolNames).toContain('send_sms_confirmation');
    });

    it('should have lookup_customer tool with phone parameter', () => {
      const tools = vapi.getAssistantTools();
      const lookupTool = tools.find((t) => t.function.name === 'lookup_customer');

      expect(lookupTool).toBeDefined();
      expect(lookupTool!.function.parameters.properties).toHaveProperty('phone');
      expect(lookupTool!.function.parameters.required).toContain('phone');
    });

    it('should have send_sms_confirmation tool with required parameters', () => {
      const tools = vapi.getAssistantTools();
      const smsTool = tools.find((t) => t.function.name === 'send_sms_confirmation');

      expect(smsTool).toBeDefined();
      expect(smsTool!.function.parameters.required).toContain('customer_phone');
      expect(smsTool!.function.parameters.required).toContain('customer_name');
      expect(smsTool!.function.parameters.required).toContain('issue');
    });

    it('should have send_sms_confirmation with optional parameters', () => {
      const tools = vapi.getAssistantTools();
      const smsTool = tools.find((t) => t.function.name === 'send_sms_confirmation');

      expect(smsTool!.function.parameters.properties).toHaveProperty('is_emergency');
      expect(smsTool!.function.parameters.properties).toHaveProperty('callback_timeframe');
    });
  });

  describe('handleToolCall', () => {
    describe('lookup_customer', () => {
      it('should return found: false for unknown phone', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue(null);

        const result = await vapi.handleToolCall(
          'lookup_customer',
          { phone: '+15551234567' },
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(result).toEqual({ found: false, recentCalls: [] });
      });

      it('should return customer info and recent calls for known phone', async () => {
        const customer = createTestCustomer({
          calls: [
            createRecentCall(2, { summary: 'Leaking faucet' }),
            createRecentCall(5, { summary: 'Water heater issue' }),
          ],
        });

        mockPrisma.customer.findFirst.mockResolvedValue(customer);

        const result = await vapi.handleToolCall(
          'lookup_customer',
          { phone: '+15551234567' },
          { organizationId: 'test-org', callId: 'test-call' }
        ) as any;

        expect(result.found).toBe(true);
        expect(result.customerName).toBe('John Smith');
        expect(result.recentCalls).toHaveLength(2);
      });

      it('should only include calls from last 7 days', async () => {
        // The query uses 7-day filter - verify the prisma call
        mockPrisma.customer.findFirst.mockResolvedValue(null);

        await vapi.handleToolCall(
          'lookup_customer',
          { phone: '+15551234567' },
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              calls: expect.objectContaining({
                where: expect.objectContaining({
                  createdAt: expect.any(Object),
                }),
              }),
            }),
          })
        );
      });
    });

    describe('send_sms_confirmation', () => {
      it('should send emergency SMS with URGENT content', async () => {
        const org = createTestOrganization();
        const customer = createTestCustomer();

        mockPrisma.organization.findUnique.mockResolvedValue(org);
        mockPrisma.customer.findFirst.mockResolvedValue(customer);

        await vapi.handleToolCall(
          'send_sms_confirmation',
          {
            customer_phone: '+15551234567',
            customer_name: 'John',
            issue: 'Burst pipe flooding basement',
            is_emergency: true,
            callback_timeframe: '15 minutes',
          },
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(sms.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('URGENT'),
            urgent: true,
          })
        );
      });

      it('should send routine SMS with opt-out language', async () => {
        const org = createTestOrganization();
        const customer = createTestCustomer();

        mockPrisma.organization.findUnique.mockResolvedValue(org);
        mockPrisma.customer.findFirst.mockResolvedValue(customer);

        await vapi.handleToolCall(
          'send_sms_confirmation',
          {
            customer_phone: '+15551234567',
            customer_name: 'Jane',
            issue: 'Dripping faucet',
            is_emergency: false,
          },
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(sms.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('STOP'),
          })
        );
      });

      it('should return error for unknown customer', async () => {
        mockPrisma.organization.findUnique.mockResolvedValue(createTestOrganization());
        mockPrisma.customer.findFirst.mockResolvedValue(null);

        const result = await vapi.handleToolCall(
          'send_sms_confirmation',
          {
            customer_phone: '+10000000000',
            customer_name: 'Nobody',
            issue: 'Test issue',
          },
          { organizationId: 'test-org', callId: 'test-call' }
        ) as any;

        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
      });

      it('should include organization name in SMS', async () => {
        const org = createTestOrganization({ name: 'Super Plumbers' });
        const customer = createTestCustomer();

        mockPrisma.organization.findUnique.mockResolvedValue(org);
        mockPrisma.customer.findFirst.mockResolvedValue(customer);

        await vapi.handleToolCall(
          'send_sms_confirmation',
          {
            customer_phone: '+15551234567',
            customer_name: 'John',
            issue: 'Leak',
          },
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(sms.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Super Plumbers'),
          })
        );
      });

      it('should use default callback timeframe when not provided', async () => {
        const org = createTestOrganization();
        const customer = createTestCustomer();

        mockPrisma.organization.findUnique.mockResolvedValue(org);
        mockPrisma.customer.findFirst.mockResolvedValue(customer);

        await vapi.handleToolCall(
          'send_sms_confirmation',
          {
            customer_phone: '+15551234567',
            customer_name: 'John',
            issue: 'Leak',
            is_emergency: false,
          },
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(sms.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('2 hours'),
          })
        );
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool name', async () => {
        const result = await vapi.handleToolCall(
          'unknown_tool',
          {},
          { organizationId: 'test-org', callId: 'test-call' }
        );

        expect(result).toEqual({ error: 'Unknown tool: unknown_tool' });
      });
    });
  });
});
