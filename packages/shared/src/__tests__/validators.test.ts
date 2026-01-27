/**
 * AI Settings Validator Tests
 * Tests for the V1 AI voice settings schema
 */

import { describe, it, expect } from 'vitest';
import { aiSettingsSchema } from '../validators';

describe('aiSettingsSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid V1 settings with all fields', () => {
      const valid = {
        voiceEnabled: true,
        textEnabled: true,
        voiceId: 'alloy',
        greeting: 'Thanks for calling!',
        escalationKeywords: ['manager', 'supervisor'],
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        servicesOffered: ['plumbing', 'water heater'],
        servicesNotOffered: ['electrical'],
        afterHoursBehavior: 'emergency_only' as const,
        emergencyCallbackMinutes: 15,
        nonEmergencyCallbackMinutes: 120,
        serviceCallFee: 8900,
        freeEstimates: true,
        recordingDisclosure: true,
        recordingDisclosureText: 'This call is recorded.',
      };
      expect(() => aiSettingsSchema.parse(valid)).not.toThrow();
    });

    it('should accept minimal settings', () => {
      const minimal = {};
      expect(() => aiSettingsSchema.parse(minimal)).not.toThrow();
    });

    it('should accept all afterHoursBehavior enum values', () => {
      const behaviors = ['emergency_only', 'full_service', 'message_only'] as const;
      behaviors.forEach((behavior) => {
        expect(() =>
          aiSettingsSchema.parse({ afterHoursBehavior: behavior })
        ).not.toThrow();
      });
    });
  });

  describe('default values', () => {
    it('should apply defaults for missing optional fields', () => {
      const result = aiSettingsSchema.parse({});

      expect(result.voiceEnabled).toBe(true);
      expect(result.textEnabled).toBe(true);
      expect(result.escalationKeywords).toEqual([]);
      expect(result.servicesOffered).toEqual([]);
      expect(result.servicesNotOffered).toEqual([]);
      expect(result.afterHoursBehavior).toBe('emergency_only');
      expect(result.emergencyCallbackMinutes).toBe(15);
      expect(result.nonEmergencyCallbackMinutes).toBe(120);
      expect(result.freeEstimates).toBe(false);
      expect(result.recordingDisclosure).toBe(true);
    });

    it('should not override provided values with defaults', () => {
      const result = aiSettingsSchema.parse({
        voiceEnabled: false,
        emergencyCallbackMinutes: 10,
        afterHoursBehavior: 'full_service',
      });

      expect(result.voiceEnabled).toBe(false);
      expect(result.emergencyCallbackMinutes).toBe(10);
      expect(result.afterHoursBehavior).toBe('full_service');
    });
  });

  describe('emergencyCallbackMinutes validation', () => {
    it('should accept minimum value of 5', () => {
      expect(() =>
        aiSettingsSchema.parse({ emergencyCallbackMinutes: 5 })
      ).not.toThrow();
    });

    it('should accept maximum value of 60', () => {
      expect(() =>
        aiSettingsSchema.parse({ emergencyCallbackMinutes: 60 })
      ).not.toThrow();
    });

    it('should reject value less than 5', () => {
      expect(() =>
        aiSettingsSchema.parse({ emergencyCallbackMinutes: 4 })
      ).toThrow();
    });

    it('should reject value greater than 60', () => {
      expect(() =>
        aiSettingsSchema.parse({ emergencyCallbackMinutes: 61 })
      ).toThrow();
    });

    it('should reject non-integer values', () => {
      expect(() =>
        aiSettingsSchema.parse({ emergencyCallbackMinutes: 15.5 })
      ).toThrow();
    });
  });

  describe('nonEmergencyCallbackMinutes validation', () => {
    it('should accept minimum value of 30', () => {
      expect(() =>
        aiSettingsSchema.parse({ nonEmergencyCallbackMinutes: 30 })
      ).not.toThrow();
    });

    it('should accept maximum value of 480', () => {
      expect(() =>
        aiSettingsSchema.parse({ nonEmergencyCallbackMinutes: 480 })
      ).not.toThrow();
    });

    it('should reject value less than 30', () => {
      expect(() =>
        aiSettingsSchema.parse({ nonEmergencyCallbackMinutes: 29 })
      ).toThrow();
    });

    it('should reject value greater than 480', () => {
      expect(() =>
        aiSettingsSchema.parse({ nonEmergencyCallbackMinutes: 481 })
      ).toThrow();
    });
  });

  describe('afterHoursBehavior validation', () => {
    it('should reject invalid enum value', () => {
      expect(() =>
        aiSettingsSchema.parse({ afterHoursBehavior: 'invalid' })
      ).toThrow();
    });

    it('should reject null value', () => {
      expect(() =>
        aiSettingsSchema.parse({ afterHoursBehavior: null })
      ).toThrow();
    });
  });

  describe('serviceCallFee validation', () => {
    it('should accept zero', () => {
      expect(() =>
        aiSettingsSchema.parse({ serviceCallFee: 0 })
      ).not.toThrow();
    });

    it('should accept positive integers', () => {
      expect(() =>
        aiSettingsSchema.parse({ serviceCallFee: 8900 })
      ).not.toThrow();
    });

    it('should reject negative values', () => {
      expect(() =>
        aiSettingsSchema.parse({ serviceCallFee: -100 })
      ).toThrow();
    });

    it('should be optional (undefined allowed)', () => {
      const result = aiSettingsSchema.parse({});
      expect(result.serviceCallFee).toBeUndefined();
    });
  });

  describe('recordingDisclosureText validation', () => {
    it('should accept text up to 200 characters', () => {
      const text = 'x'.repeat(200);
      expect(() =>
        aiSettingsSchema.parse({ recordingDisclosureText: text })
      ).not.toThrow();
    });

    it('should reject text over 200 characters', () => {
      const text = 'x'.repeat(201);
      expect(() =>
        aiSettingsSchema.parse({ recordingDisclosureText: text })
      ).toThrow();
    });

    it('should be optional', () => {
      const result = aiSettingsSchema.parse({});
      expect(result.recordingDisclosureText).toBeUndefined();
    });
  });

  describe('quietHours time format validation', () => {
    it('should accept valid 24-hour time format', () => {
      expect(() =>
        aiSettingsSchema.parse({ quietHoursStart: '22:00', quietHoursEnd: '07:00' })
      ).not.toThrow();
    });

    it('should accept midnight', () => {
      expect(() =>
        aiSettingsSchema.parse({ quietHoursStart: '00:00' })
      ).not.toThrow();
    });

    it('should accept 23:59', () => {
      expect(() =>
        aiSettingsSchema.parse({ quietHoursStart: '23:59' })
      ).not.toThrow();
    });

    it('should reject invalid hour (24)', () => {
      expect(() =>
        aiSettingsSchema.parse({ quietHoursStart: '24:00' })
      ).toThrow();
    });

    it('should reject invalid minute (60)', () => {
      expect(() =>
        aiSettingsSchema.parse({ quietHoursStart: '22:60' })
      ).toThrow();
    });

    it('should reject 12-hour format', () => {
      expect(() =>
        aiSettingsSchema.parse({ quietHoursStart: '10:00 PM' })
      ).toThrow();
    });
  });

  describe('array fields validation', () => {
    it('should accept empty arrays for services', () => {
      const result = aiSettingsSchema.parse({
        servicesOffered: [],
        servicesNotOffered: [],
      });
      expect(result.servicesOffered).toEqual([]);
      expect(result.servicesNotOffered).toEqual([]);
    });

    it('should accept arrays with multiple strings', () => {
      const result = aiSettingsSchema.parse({
        servicesOffered: ['plumbing', 'water heaters', 'drain cleaning'],
        escalationKeywords: ['manager', 'supervisor', 'complaint'],
      });
      expect(result.servicesOffered).toHaveLength(3);
      expect(result.escalationKeywords).toHaveLength(3);
    });
  });

  describe('greeting validation', () => {
    it('should accept greeting up to 500 characters', () => {
      const greeting = 'x'.repeat(500);
      expect(() =>
        aiSettingsSchema.parse({ greeting })
      ).not.toThrow();
    });

    it('should reject greeting over 500 characters', () => {
      const greeting = 'x'.repeat(501);
      expect(() =>
        aiSettingsSchema.parse({ greeting })
      ).toThrow();
    });
  });
});
