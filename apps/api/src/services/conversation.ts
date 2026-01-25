/**
 * Conversation Service
 *
 * Handles conversation operations with proper atomicity to prevent race conditions.
 */

import { prisma } from '@serviceflow/database';

/**
 * Atomically find or create an open conversation.
 *
 * Uses a transaction with serializable isolation to prevent race conditions
 * where two concurrent requests could both create conversations for the same
 * customer/channel combination.
 *
 * @param organizationId - The organization ID
 * @param customerId - The customer ID
 * @param channel - The conversation channel (default: 'sms')
 * @param aiHandled - Whether the conversation is AI-handled (default: true)
 * @returns The existing or newly created conversation
 */
export async function findOrCreateConversation(
  organizationId: string,
  customerId: string,
  channel: 'sms' | 'voice' | 'email' = 'sms',
  aiHandled: boolean = true
): Promise<{ id: string; isNew: boolean }> {
  // Use a transaction to ensure atomicity
  // The serializable isolation level prevents phantom reads
  return await prisma.$transaction(
    async (tx) => {
      // First, try to find an existing open/pending conversation
      const existing = await tx.conversation.findFirst({
        where: {
          organizationId,
          customerId,
          channel,
          status: { in: ['open', 'pending'] },
        },
        select: { id: true },
      });

      if (existing) {
        return { id: existing.id, isNew: false };
      }

      // No existing conversation, create a new one
      const created = await tx.conversation.create({
        data: {
          organizationId,
          customerId,
          channel,
          status: 'open',
          aiHandled,
        },
        select: { id: true },
      });

      return { id: created.id, isNew: true };
    },
    {
      // Use serializable isolation to prevent race conditions
      // This ensures that if two transactions try to create simultaneously,
      // one will retry after the other completes
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/**
 * Get a conversation by ID with ownership verification.
 */
export async function getConversation(
  id: string,
  organizationId: string,
  include?: {
    customer?: boolean;
    messages?: boolean | { orderBy?: { createdAt: 'asc' | 'desc' }; take?: number };
    calls?: boolean | { orderBy?: { startedAt: 'asc' | 'desc' } };
  }
) {
  return prisma.conversation.findFirst({
    where: { id, organizationId },
    include: {
      customer: include?.customer ?? false,
      messages:
        typeof include?.messages === 'object'
          ? include.messages
          : include?.messages
            ? { orderBy: { createdAt: 'asc' as const } }
            : false,
      calls:
        typeof include?.calls === 'object'
          ? include.calls
          : include?.calls
            ? { orderBy: { startedAt: 'desc' as const } }
            : false,
    },
  });
}

/**
 * Update conversation last message time.
 */
export async function updateLastMessageTime(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });
}
