/**
 * SMS Queue Service
 *
 * Handles queuing SMS messages during quiet hours and processing
 * them when quiet hours end. Uses the database as a simple queue.
 */

import { prisma, Prisma } from '@serviceflow/database';
import { isQuietHours, TIMING } from '@serviceflow/shared';
import { sms, SendSmsOptions } from './sms';

// ============================================
// TYPES
// ============================================

export interface QueuedSmsMessage {
  id: string;
  organizationId: string;
  customerId: string;
  conversationId?: string;
  to: string;
  message: string;
  templateType?: string;
  senderType: 'ai' | 'user' | 'system';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  processAfter: Date;
  attempts: number;
  lastError?: string;
}

// ============================================
// SMS QUEUE SERVICE
// ============================================

class SmsQueueService {
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Start the queue processor
   * Runs every minute to check for messages to send
   */
  start(): void {
    if (this.processingInterval) {
      return; // Already running
    }

    console.log('📬 SMS queue processor started');

    // Process immediately on start
    this.processQueue().catch(console.error);

    // Then process every minute
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(console.error);
    }, 60000); // Every minute
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('📬 SMS queue processor stopped');
    }
  }

  /**
   * Queue an SMS for later delivery (during quiet hours)
   */
  async queue(options: SendSmsOptions): Promise<string> {
    const {
      organizationId,
      customerId,
      conversationId,
      to,
      message,
      templateType,
      senderType = 'ai',
      metadata,
    } = options;

    // Calculate when to process (end of quiet hours)
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true, timezone: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const aiSettings = (settings.aiSettings as Record<string, unknown>) || {};
    const quietEnd = (aiSettings.quietHoursEnd as string) || TIMING.QUIET_HOURS_END;

    // Parse quiet end time and create next occurrence
    const [endHour, endMinute] = quietEnd.split(':').map(Number);
    const processAfter = new Date();
    processAfter.setHours(endHour, endMinute, 0, 0);

    // If we're already past quiet end time today, schedule for tomorrow
    if (processAfter <= new Date()) {
      processAfter.setDate(processAfter.getDate() + 1);
    }

    // Create queued message record
    const queuedMessage = await prisma.queuedSms.create({
      data: {
        organizationId,
        customerId,
        conversationId,
        to,
        message,
        templateType,
        senderType,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        processAfter,
        attempts: 0,
      },
    });

    console.log(`📬 SMS queued for delivery at ${processAfter.toISOString()}: ${queuedMessage.id}`);

    return queuedMessage.id;
  }

  /**
   * Process queued messages that are ready to send
   */
  async processQueue(): Promise<number> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      // Get messages ready to process (with limit to prevent overwhelming)
      const queuedMessages = await prisma.queuedSms.findMany({
        where: {
          processAfter: { lte: new Date() },
          processedAt: null,
          attempts: { lt: 3 }, // Max 3 attempts
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      if (queuedMessages.length === 0) {
        return 0;
      }

      console.log(`📬 Processing ${queuedMessages.length} queued SMS messages`);

      for (const queued of queuedMessages) {
        try {
          // Check if we're still in quiet hours for this org
          const org = await prisma.organization.findUnique({
            where: { id: queued.organizationId },
            select: { settings: true, timezone: true },
          });

          if (org) {
            const settings = (org.settings as Record<string, unknown>) || {};
            const aiSettings = (settings.aiSettings as Record<string, unknown>) || {};
            const quietStart = (aiSettings.quietHoursStart as string) || TIMING.QUIET_HOURS_START;
            const quietEnd = (aiSettings.quietHoursEnd as string) || TIMING.QUIET_HOURS_END;

            // If still in quiet hours, skip this message
            if (isQuietHours(new Date(), quietStart, quietEnd, org.timezone)) {
              continue;
            }
          }

          // Send the message
          const result = await sms.send({
            organizationId: queued.organizationId,
            customerId: queued.customerId,
            conversationId: queued.conversationId || undefined,
            to: queued.to,
            message: queued.message,
            templateType: queued.templateType || undefined,
            senderType: queued.senderType as 'ai' | 'user' | 'system',
            metadata: {
              ...(queued.metadata as Record<string, unknown>),
              queuedMessageId: queued.id,
              wasQueued: true,
            },
            urgent: true, // Bypass quiet hours check since we already checked
          });

          if (result.success) {
            // Mark as processed
            await prisma.queuedSms.update({
              where: { id: queued.id },
              data: {
                processedAt: new Date(),
                twilioSid: result.twilioSid,
                messageId: result.messageId,
              },
            });

            processedCount++;
            console.log(`✅ Queued SMS sent: ${queued.id} -> ${result.twilioSid}`);
          } else {
            // Record failure
            await prisma.queuedSms.update({
              where: { id: queued.id },
              data: {
                attempts: { increment: 1 },
                lastError: result.error?.message,
              },
            });

            console.error(`❌ Queued SMS failed: ${queued.id} - ${result.error?.message}`);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          // Record error
          await prisma.queuedSms.update({
            where: { id: queued.id },
            data: {
              attempts: { increment: 1 },
              lastError: message,
            },
          });

          console.error(`❌ Error processing queued SMS ${queued.id}:`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Get count of pending queued messages
   */
  async getPendingCount(organizationId?: string): Promise<number> {
    return prisma.queuedSms.count({
      where: {
        ...(organizationId && { organizationId }),
        processedAt: null,
        attempts: { lt: 3 },
      },
    });
  }

  /**
   * Cancel a queued message
   */
  async cancel(queuedMessageId: string): Promise<boolean> {
    try {
      await prisma.queuedSms.update({
        where: { id: queuedMessageId },
        data: {
          processedAt: new Date(),
          lastError: 'Canceled by user',
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old processed messages (older than 30 days)
   */
  async cleanup(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.queuedSms.deleteMany({
      where: {
        processedAt: { lt: thirtyDaysAgo },
      },
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} old queued SMS records`);
    }

    return result.count;
  }
}

// Singleton instance
export const smsQueue = new SmsQueueService();

export default smsQueue;
