/**
 * Vapi Service Tests
 *
 * Tests for the AI voice tools: check_availability and transfer_to_human
 */

import { mockPrisma, testData, resetMocks } from '../tests/mocks/database';
import { vapi } from './vapi';

describe('VapiService', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('handleToolCall', () => {
    const baseContext = {
      organizationId: 'org_test123',
      callId: 'call_test123',
      customerId: 'cust_test123',
    };

    describe('check_availability', () => {
      beforeEach(() => {
        // Default setup for all availability tests
        mockPrisma.appointment.findMany.mockResolvedValue([]);
      });

      it('should return available slots when business is open and no appointments', async () => {
        // Setup: Organization with business hours
        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          settings: {
            businessHours: {
              monday: { open: '08:00', close: '17:00' },
              tuesday: { open: '08:00', close: '17:00' },
              wednesday: { open: '08:00', close: '17:00' },
              thursday: { open: '08:00', close: '17:00' },
              friday: { open: '08:00', close: '17:00' },
              saturday: null,
              sunday: null,
            },
          },
          timezone: 'America/New_York',
        });

        // Get next Monday's date
        const nextMonday = getNextWeekday(1);
        const dateStr = nextMonday.toISOString().split('T')[0];

        const result = await vapi.handleToolCall(
          'check_availability',
          { date: dateStr },
          baseContext
        );

        expect(result).toHaveProperty('available', true);
        expect(result).toHaveProperty('slots');
        expect((result as any).slots.length).toBeGreaterThan(0);
      });

      it('should return unavailable when business is closed on that day (Sunday)', async () => {
        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          settings: {
            businessHours: {
              monday: { open: '08:00', close: '17:00' },
              tuesday: { open: '08:00', close: '17:00' },
              wednesday: { open: '08:00', close: '17:00' },
              thursday: { open: '08:00', close: '17:00' },
              friday: { open: '08:00', close: '17:00' },
              saturday: null,
              sunday: null, // Closed on Sunday
            },
          },
          timezone: 'America/New_York',
        });

        // Get next Sunday's date
        const nextSunday = getNextWeekday(0);
        const dateStr = nextSunday.toISOString().split('T')[0];

        const result = await vapi.handleToolCall(
          'check_availability',
          { date: dateStr },
          baseContext
        );

        expect(result).toHaveProperty('available', false);
        expect((result as any).message).toContain('closed');
      });

      it('should exclude time slots that conflict with existing appointments', async () => {
        // Get next Monday
        const nextMonday = getNextWeekday(1);
        const dateStr = nextMonday.toISOString().split('T')[0];

        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          settings: {
            businessHours: {
              monday: { open: '08:00', close: '17:00' },
            },
          },
          timezone: 'America/New_York',
        });

        // Existing appointment from 8am-10am
        const aptStart = new Date(nextMonday);
        aptStart.setHours(8, 0, 0, 0);
        const aptEnd = new Date(nextMonday);
        aptEnd.setHours(10, 0, 0, 0);

        mockPrisma.appointment.findMany.mockResolvedValue([
          {
            scheduledAt: aptStart,
            scheduledEndAt: aptEnd,
          },
        ]);

        const result = await vapi.handleToolCall(
          'check_availability',
          { date: dateStr },
          baseContext
        );

        expect(result).toHaveProperty('available', true);
        // The 8-10 AM slot should NOT be in the available slots
        expect((result as any).slots).not.toContain('8 AM - 10 AM');
      });

      it('should return unavailable for past dates', async () => {
        // Use a definitely past date to avoid timezone edge cases
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7); // 7 days ago
        const year = pastDate.getFullYear();
        const month = String(pastDate.getMonth() + 1).padStart(2, '0');
        const day = String(pastDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const result = await vapi.handleToolCall(
          'check_availability',
          { date: dateStr },
          baseContext
        );

        expect(result).toHaveProperty('available', false);
        expect((result as any).message).toContain('past');
      });

      it('should return fully booked message when no slots available', async () => {
        const nextMonday = getNextWeekday(1);
        const dateStr = nextMonday.toISOString().split('T')[0];

        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          settings: {
            businessHours: {
              monday: { open: '08:00', close: '12:00' }, // Short day: only 4 hours
            },
          },
          timezone: 'America/New_York',
        });

        // Book all slots (8-10 and 10-12)
        const apt1Start = new Date(nextMonday);
        apt1Start.setHours(8, 0, 0, 0);
        const apt1End = new Date(nextMonday);
        apt1End.setHours(10, 0, 0, 0);

        const apt2Start = new Date(nextMonday);
        apt2Start.setHours(10, 0, 0, 0);
        const apt2End = new Date(nextMonday);
        apt2End.setHours(12, 0, 0, 0);

        mockPrisma.appointment.findMany.mockResolvedValue([
          { scheduledAt: apt1Start, scheduledEndAt: apt1End },
          { scheduledAt: apt2Start, scheduledEndAt: apt2End },
        ]);

        const result = await vapi.handleToolCall(
          'check_availability',
          { date: dateStr },
          baseContext
        );

        expect(result).toHaveProperty('available', false);
        expect((result as any).message).toContain('fully booked');
      });

      it('should use default business hours when not configured', async () => {
        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          settings: {}, // No business hours configured
          timezone: 'America/New_York',
        });

        // Get next Monday (not Sunday)
        const nextMonday = getNextWeekday(1);
        const dateStr = nextMonday.toISOString().split('T')[0];

        const result = await vapi.handleToolCall(
          'check_availability',
          { date: dateStr },
          baseContext
        );

        // Should use default Mon-Fri 8am-5pm
        expect(result).toHaveProperty('available', true);
        expect((result as any).slots.length).toBeGreaterThan(0);
      });
    });

    describe('transfer_to_human', () => {
      it('should return transfer destination from phoneNumber.forwardTo', async () => {
        mockPrisma.call.findUnique.mockResolvedValue({
          id: 'call_test123',
          to: '+15551234567',
        });
        mockPrisma.phoneNumber.findUnique.mockResolvedValue({
          id: 'phone_test123',
          forwardTo: '+15559876543',
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        const result = await vapi.handleToolCall(
          'transfer_to_human',
          { reason: 'Customer requested' },
          baseContext
        );

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('destination');
        expect((result as any).destination.number).toBe('+15559876543');
        expect((result as any).message).toContain('transfer');
      });

      it('should fall back to owner phone when no forwardTo configured', async () => {
        mockPrisma.call.findUnique.mockResolvedValue({
          id: 'call_test123',
          to: '+15551234567',
        });
        mockPrisma.phoneNumber.findUnique.mockResolvedValue({
          id: 'phone_test123',
          forwardTo: null,
        });
        mockPrisma.user.findFirst.mockResolvedValue({
          id: 'user_test123',
          phone: '+15551112222',
          role: 'owner',
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        const result = await vapi.handleToolCall(
          'transfer_to_human',
          { reason: 'Complex question' },
          baseContext
        );

        expect(result).toHaveProperty('success', true);
        expect((result as any).destination.number).toBe('+15551112222');
      });

      it('should fall back to organization phone when owner has no phone', async () => {
        mockPrisma.call.findUnique.mockResolvedValue({
          id: 'call_test123',
          to: '+15551234567',
        });
        mockPrisma.phoneNumber.findUnique.mockResolvedValue({
          id: 'phone_test123',
          forwardTo: null,
        });
        mockPrisma.user.findFirst.mockResolvedValue({
          id: 'user_test123',
          phone: null,
          role: 'owner',
        });
        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          phone: '+15553334444',
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        const result = await vapi.handleToolCall(
          'transfer_to_human',
          { reason: 'Emergency' },
          baseContext
        );

        expect(result).toHaveProperty('success', true);
        expect((result as any).destination.number).toBe('+15553334444');
      });

      it('should return failure with message when no transfer number available', async () => {
        mockPrisma.call.findUnique.mockResolvedValue({
          id: 'call_test123',
          to: '+15551234567',
        });
        mockPrisma.phoneNumber.findUnique.mockResolvedValue({
          id: 'phone_test123',
          forwardTo: null,
        });
        mockPrisma.user.findFirst.mockResolvedValue({
          id: 'user_test123',
          phone: null,
        });
        mockPrisma.organization.findUnique.mockResolvedValue({
          id: 'org_test123',
          phone: null,
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        const result = await vapi.handleToolCall(
          'transfer_to_human',
          { reason: 'Customer frustrated' },
          baseContext
        );

        expect(result).toHaveProperty('success', false);
        expect((result as any).message).toContain('unable to transfer');
        expect(result).not.toHaveProperty('destination');
      });

      it('should update call record with transfer summary', async () => {
        mockPrisma.call.findUnique.mockResolvedValue({
          id: 'call_test123',
          to: '+15551234567',
        });
        mockPrisma.phoneNumber.findUnique.mockResolvedValue({
          id: 'phone_test123',
          forwardTo: '+15559876543',
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        await vapi.handleToolCall(
          'transfer_to_human',
          { reason: 'Pricing question' },
          baseContext
        );

        expect(mockPrisma.call.update).toHaveBeenCalledWith({
          where: { id: 'call_test123' },
          data: {
            summary: expect.stringContaining('Pricing question'),
          },
        });
      });
    });

    describe('book_appointment', () => {
      it('should create customer and job for new caller', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue(null); // New customer
        mockPrisma.customer.create.mockResolvedValue({
          id: 'new_cust_123',
          firstName: 'Jane',
          lastName: 'Smith',
        });
        mockPrisma.job.create.mockResolvedValue({
          id: 'new_job_123',
          title: 'Water heater not working',
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        const result = await vapi.handleToolCall(
          'book_appointment',
          {
            customer_name: 'Jane Smith',
            phone: '+15559998888',
            address: '456 Oak Ave',
            issue_description: 'Water heater not working',
            is_emergency: false,
          },
          baseContext
        );

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('jobId', 'new_job_123');
        expect(mockPrisma.customer.create).toHaveBeenCalled();
        expect(mockPrisma.job.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: 'Water heater not working',
            type: 'repair',
            priority: 'normal',
          }),
        });
      });

      it('should mark emergency jobs correctly', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue({
          id: 'cust_test123',
          firstName: 'John',
          lastName: 'Doe',
        });
        mockPrisma.job.create.mockResolvedValue({
          id: 'emergency_job_123',
          priority: 'emergency',
        });
        mockPrisma.call.update.mockResolvedValue({ id: 'call_test123' });

        const result = await vapi.handleToolCall(
          'book_appointment',
          {
            customer_name: 'John Doe',
            phone: '+15551234567',
            issue_description: 'Flooding in basement!',
            is_emergency: true,
          },
          baseContext
        );

        expect(result).toHaveProperty('success', true);
        expect((result as any).message).toContain('emergency');
        expect(mockPrisma.job.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: 'emergency',
            priority: 'emergency',
          }),
        });
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool name', async () => {
        const result = await vapi.handleToolCall(
          'unknown_tool',
          {},
          baseContext
        );

        expect(result).toHaveProperty('error');
        expect((result as any).error).toContain('Unknown tool');
      });
    });
  });
});

/**
 * Helper function to get the next occurrence of a specific weekday
 * @param dayOfWeek 0=Sunday, 1=Monday, etc.
 */
function getNextWeekday(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7; // At least 1 day ahead
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + daysUntil);
  nextDay.setHours(0, 0, 0, 0);
  return nextDay;
}
