/**
 * SMS Service
 *
 * Handles all outbound SMS via Twilio with:
 * - TCPA compliance (opt-out checking, quiet hours)
 * - Template management
 * - Delivery tracking
 * - Rate limiting
 */

import twilio from 'twilio';
import { prisma } from '@serviceflow/database';
import { interpolate, isQuietHours, TIMING } from '@serviceflow/shared';
import { events, SmsSentEventData } from './events';
import { findOrCreateConversation, updateLastMessageTime } from './conversation';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export interface SendSmsOptions {
  organizationId: string;
  customerId: string;
  conversationId?: string;
  to: string;
  message: string;
  templateType?: string;
  metadata?: Record<string, unknown>;
  // If true, ignore quiet hours check
  urgent?: boolean;
  // If true, don't create a message record (for system messages)
  skipRecord?: boolean;
  // Who is sending: 'ai' (automated), 'user' (manual from dashboard), 'system'
  senderType?: 'ai' | 'user' | 'system';
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  twilioSid?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface SendTemplatedSmsOptions {
  organizationId: string;
  customerId: string;
  conversationId?: string;
  to: string;
  templateType: string;
  variables: Record<string, string | number>;
  urgent?: boolean;
}

// ============================================
// SMS SERVICE
// ============================================

class SmsService {
  private _client: twilio.Twilio | null = null;

  /**
   * Lazy-load Twilio client to allow app to start without credentials
   */
  private get client(): twilio.Twilio {
    if (!this._client) {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error(
          'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env'
        );
      }
      this._client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    return this._client;
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  }

  /**
   * Send an SMS message
   */
  async send(options: SendSmsOptions): Promise<SendSmsResult> {
    const {
      organizationId,
      customerId,
      conversationId,
      to,
      message,
      templateType,
      metadata,
      urgent = false,
      skipRecord = false,
      senderType = 'ai',
    } = options;

    try {
      // 0. Check if Twilio is configured
      if (!this.isConfigured()) {
        logger.info('MOCK SMS sent', { to, messagePreview: message.substring(0, 50) });
        logger.warn('Twilio not configured - set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');

        // Still create conversation and message records for testing
        let activeConversationId = conversationId;
        if (!activeConversationId && !skipRecord) {
          // Use atomic find-or-create to prevent race conditions
          const result = await findOrCreateConversation(organizationId, customerId, 'sms', true);
          activeConversationId = result.id;
        }

        let messageRecord;
        if (!skipRecord && activeConversationId) {
          messageRecord = await prisma.message.create({
            data: {
              conversationId: activeConversationId,
              direction: 'outbound',
              senderType,
              content: message,
              status: 'sent',
              metadata: {
                twilioSid: `MOCK_${Date.now()}`,
                templateType,
                mock: true,
                ...metadata,
              },
            },
          });
        }

        return {
          success: true,
          messageId: messageRecord?.id,
          twilioSid: `MOCK_${Date.now()}`,
        };
      }

      // 1. Check opt-out status
      const isOptedOut = await this.isOptedOut(organizationId, to);
      if (isOptedOut) {
        logger.debug('SMS blocked - customer opted out', { to });
        return {
          success: false,
          error: { code: 'OPTED_OUT', message: 'Recipient has opted out of SMS' },
        };
      }

      // 2. Check quiet hours (unless urgent)
      if (!urgent) {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { settings: true, timezone: true },
        });

        if (org) {
          const settings = org.settings as any;
          const quietStart = settings?.aiSettings?.quietHoursStart || TIMING.QUIET_HOURS_START;
          const quietEnd = settings?.aiSettings?.quietHoursEnd || TIMING.QUIET_HOURS_END;

          if (isQuietHours(new Date(), quietStart, quietEnd, org.timezone)) {
            logger.debug('SMS queued for quiet hours', { to });
            // Queue for later delivery using the SMS queue service
            const { smsQueue } = await import('./sms-queue.js');
            const queuedId = await smsQueue.queue({
              organizationId,
              customerId,
              conversationId,
              to,
              message,
              templateType,
              senderType,
              metadata,
            });
            return {
              success: true, // Successfully queued
              messageId: queuedId,
              error: { code: 'QUEUED', message: 'Message queued for delivery after quiet hours' },
            };
          }
        }
      }

      // 3. Get organization's phone number
      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { type: 'asc' }, // Prefer 'main' type
      });

      if (!phoneNumber) {
        logger.error('No phone number for organization', { organizationId });
        return {
          success: false,
          error: { code: 'NO_PHONE', message: 'No active phone number for organization' },
        };
      }

      // 4. Send via Twilio
      const twilioMessage = await this.client.messages.create({
        to,
        from: phoneNumber.number,
        body: message,
        statusCallback: `${process.env.API_URL}/webhooks/twilio/sms/status`,
      });

      logger.info('SMS sent', { twilioSid: twilioMessage.sid, to });

      // 5. Create or find conversation (atomic to prevent race conditions)
      let activeConversationId = conversationId;
      if (!activeConversationId && !skipRecord) {
        const result = await findOrCreateConversation(organizationId, customerId, 'sms', true);
        activeConversationId = result.id;
      }

      // 6. Create message record
      let messageRecord;
      if (!skipRecord && activeConversationId) {
        messageRecord = await prisma.message.create({
          data: {
            conversationId: activeConversationId,
            direction: 'outbound',
            senderType,
            content: message,
            status: 'sent',
            metadata: {
              twilioSid: twilioMessage.sid,
              templateType,
              ...metadata,
            },
          },
        });

        // Update conversation last message time
        await updateLastMessageTime(activeConversationId);
      }

      // 7. Emit event
      await events.emit<SmsSentEventData>({
        type: 'sms.sent',
        organizationId,
        aggregateType: 'message',
        aggregateId: messageRecord?.id || twilioMessage.sid,
        data: {
          messageId: messageRecord?.id || '',
          conversationId: activeConversationId || '',
          customerId,
          to,
          content: message,
          templateType,
        },
      });

      return {
        success: true,
        messageId: messageRecord?.id,
        twilioSid: twilioMessage.sid,
      };
    } catch (error: any) {
      logger.error('SMS send error', error);

      // Handle specific Twilio errors
      if (error.code === 21211) {
        return {
          success: false,
          error: { code: 'INVALID_PHONE', message: 'Invalid phone number' },
        };
      }

      if (error.code === 21610) {
        // "Attempt to send to unsubscribed recipient"
        // Record the opt-out
        await this.recordOptOut(organizationId, to, 'twilio_error');
        return {
          success: false,
          error: { code: 'OPTED_OUT', message: 'Recipient has opted out' },
        };
      }

      return {
        success: false,
        error: {
          code: error.code?.toString() || 'UNKNOWN',
          message: error.message || 'Failed to send SMS',
        },
      };
    }
  }

  /**
   * Send a templated SMS
   */
  async sendTemplated(options: SendTemplatedSmsOptions): Promise<SendSmsResult> {
    const { organizationId, customerId, conversationId, to, templateType, variables, urgent } =
      options;

    // 1. Find template (org-specific or system default)
    let template = await prisma.messageTemplate.findFirst({
      where: {
        OR: [
          { organizationId, type: templateType as any, isActive: true },
          { organizationId: null, type: templateType as any, isDefault: true, isActive: true },
        ],
      },
      orderBy: { organizationId: 'desc' }, // Prefer org-specific
    });

    if (!template) {
      logger.error('Template not found', { templateType });
      return {
        success: false,
        error: { code: 'NO_TEMPLATE', message: `Template not found: ${templateType}` },
      };
    }

    // 2. Interpolate variables
    const message = interpolate(template.content, variables);

    // 3. Send
    return this.send({
      organizationId,
      customerId,
      conversationId,
      to,
      message,
      templateType,
      urgent,
    });
  }

  /**
   * Check if a phone number has opted out
   */
  async isOptedOut(organizationId: string, phone: string): Promise<boolean> {
    const optOut = await prisma.smsOptOut.findUnique({
      where: {
        organizationId_phone: { organizationId, phone },
      },
    });
    return !!optOut;
  }

  /**
   * Record an opt-out
   */
  async recordOptOut(organizationId: string, phone: string, source: string): Promise<void> {
    await prisma.smsOptOut.upsert({
      where: {
        organizationId_phone: { organizationId, phone },
      },
      update: {
        optedOutAt: new Date(),
        source,
      },
      create: {
        organizationId,
        phone,
        source,
      },
    });
    logger.info('Opt-out recorded', { phone, source });
  }

  /**
   * Remove an opt-out (when customer texts START)
   */
  async removeOptOut(organizationId: string, phone: string): Promise<void> {
    await prisma.smsOptOut.deleteMany({
      where: { organizationId, phone },
    });
    logger.info('Opt-out removed', { phone });
  }

  /**
   * Handle STOP/START keywords for TCPA compliance
   */
  async handleComplianceKeyword(
    organizationId: string,
    phone: string,
    message: string
  ): Promise<{ handled: boolean; response?: string }> {
    const normalized = message.trim().toUpperCase();

    if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(normalized)) {
      await this.recordOptOut(organizationId, phone, 'stop_keyword');
      return {
        handled: true,
        response: 'You have been unsubscribed and will no longer receive messages. Reply START to resubscribe.',
      };
    }

    if (['START', 'SUBSCRIBE', 'YES'].includes(normalized)) {
      await this.removeOptOut(organizationId, phone);
      return {
        handled: true,
        response: 'You have been resubscribed and will now receive messages.',
      };
    }

    if (normalized === 'HELP') {
      return {
        handled: true,
        response: 'Reply STOP to unsubscribe. Msg & data rates may apply. For help, call us directly.',
      };
    }

    return { handled: false };
  }
}

// Singleton instance
export const sms = new SmsService();

export default sms;
