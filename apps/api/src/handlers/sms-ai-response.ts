/**
 * SMS AI Response Handler
 *
 * Handles incoming SMS messages by generating AI-powered responses.
 * Checks organization settings, quiet hours, and conversation context
 * before sending automated replies.
 */

import { prisma } from '@serviceflow/database';
import { events, DomainEvent, SmsReceivedEventData } from '../services/events';
import { sms } from '../services/sms';
import { aiSms } from '../services/ai-sms';
import { isQuietHours, TIMING } from '@serviceflow/shared';
import { logger } from '../lib/logger';

// Delay before sending AI response (allows for quick follow-up messages)
const AI_RESPONSE_DELAY_MS = 3000;

/**
 * Register the SMS AI response handler
 */
export function registerSmsAIResponseHandler(): void {
  events.on('sms.received', handleSmsReceived);
  logger.info('SMS AI response handler registered');
}

/**
 * Handle an incoming SMS by generating and sending an AI response
 */
async function handleSmsReceived(event: DomainEvent<SmsReceivedEventData>): Promise<void> {
  const { messageId, conversationId, customerId, content, from } = event.data;
  const { organizationId } = event;

  logger.info('Processing AI response', { messageId });

  try {
    // 1. Check if AI responses are enabled for this organization
    const shouldRespond = await aiSms.shouldRespond(organizationId);
    if (!shouldRespond.enabled) {
      logger.debug('AI response skipped', { reason: shouldRespond.reason });
      return;
    }

    // 2. Get organization for settings
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true, timezone: true },
    });

    if (!org) {
      logger.error('Organization not found', { organizationId });
      return;
    }

    const settings = (org.settings as Record<string, unknown>) || {};
    const aiSettings = (settings.aiSettings as Record<string, unknown>) || {};

    // 3. Check quiet hours (don't respond during quiet hours)
    const quietStart = (aiSettings.quietHoursStart as string) || TIMING.QUIET_HOURS_START;
    const quietEnd = (aiSettings.quietHoursEnd as string) || TIMING.QUIET_HOURS_END;

    if (isQuietHours(new Date(), quietStart, quietEnd, org.timezone)) {
      logger.debug('AI response skipped - quiet hours', { messageId });
      // Queue for later delivery will be handled by Task #13
      await prisma.message.update({
        where: { id: messageId },
        data: {
          metadata: {
            ...(await getMessageMetadata(messageId)),
            aiResponseQueued: true,
            queuedAt: new Date().toISOString(),
          },
        },
      });
      return;
    }

    // 4. Check for recent AI responses (avoid duplicate responses)
    const recentAIMessage = await prisma.message.findFirst({
      where: {
        conversationId,
        direction: 'outbound',
        senderType: 'ai',
        createdAt: { gte: new Date(Date.now() - 60000) }, // Last minute
      },
    });

    if (recentAIMessage) {
      logger.debug('AI response skipped - recent AI message exists', { conversationId });
      return;
    }

    // 5. Wait for brief delay (allows user to send follow-up messages)
    await new Promise((resolve) => setTimeout(resolve, AI_RESPONSE_DELAY_MS));

    // 6. Check if conversation was claimed by a human during delay
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { assignedToId: true, status: true },
    });

    if (conversation?.assignedToId) {
      logger.debug('AI response skipped - conversation claimed by human', { conversationId });
      return;
    }

    if (conversation?.status === 'resolved') {
      logger.debug('AI response skipped - conversation already resolved', { conversationId });
      return;
    }

    // 7. Check if customer sent more messages during delay (batch them together)
    const newerMessages = await prisma.message.findMany({
      where: {
        conversationId,
        direction: 'inbound',
        createdAt: { gt: new Date(Date.now() - AI_RESPONSE_DELAY_MS) },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Use the most recent message if multiple were sent
    const customerMessage = newerMessages.length > 0
      ? newerMessages.map((m) => m.content).reverse().join(' ')
      : content;

    // 8. Generate AI response
    logger.info('Generating AI response', { conversationId });
    const aiResult = await aiSms.generateResponse({
      organizationId,
      customerId,
      conversationId,
      customerMessage,
    });

    if (!aiResult.success || !aiResult.response) {
      logger.error('AI response generation failed', { error: aiResult.error });
      return;
    }

    // 9. Get customer phone number
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { phone: true },
    });

    if (!customer?.phone) {
      logger.error('Customer phone not found', { customerId });
      return;
    }

    // 10. Send the AI response
    const sendResult = await sms.send({
      organizationId,
      customerId,
      conversationId,
      to: customer.phone,
      message: aiResult.response,
      senderType: 'ai',
      metadata: {
        aiGenerated: true,
        triggerMessageId: messageId,
      },
    });

    if (sendResult.success) {
      // 11. Mark conversation as AI-handled
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          aiHandled: true,
          lastMessageAt: new Date(),
        },
      });

      logger.info('AI response sent', { messageId, sentMessageId: sendResult.messageId });
    } else {
      logger.error('Failed to send AI response', { error: sendResult.error });
    }
  } catch (error) {
    logger.error('Error handling AI response', { messageId, error });
    // Don't throw - we don't want to break the event pipeline
  }
}

/**
 * Helper to get existing message metadata
 */
async function getMessageMetadata(messageId: string): Promise<Record<string, unknown>> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { metadata: true },
  });
  return (message?.metadata as Record<string, unknown>) || {};
}

export default registerSmsAIResponseHandler;
