/**
 * AI Chat API Routes
 * Provides REST endpoints for AI conversations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';
import { sendSuccess, sendError, ErrorCodes } from '../utils/api-response';
import { createConversation, AIConversationManager } from '../services/ai';

const router = Router();

// Store active conversations in memory (in production, use Redis)
const activeConversations = new Map<string, AIConversationManager>();

// Request schemas
const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  context: z.object({
    customerId: z.string().optional(),
    channel: z.enum(['sms', 'voice', 'web']).optional(),
  }).optional(),
});

/**
 * POST /api/ai/chat
 * Send a message to the AI and get a response
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, ErrorCodes.VALIDATION_FAILED, 'Invalid request', 400, {
        errors: validation.error.errors,
      });
    }

    const { message, conversationId, context } = validation.data;
    const organizationId = req.auth!.organizationId;

    let conversation: AIConversationManager;

    if (conversationId && activeConversations.has(conversationId)) {
      // Resume existing conversation
      conversation = activeConversations.get(conversationId)!;
    } else {
      // Start new conversation
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      conversation = await createConversation({
        organizationId,
        customerId: context?.customerId,
        channel: context?.channel || 'web',
      });

      activeConversations.set(newConversationId, conversation);

      // Clean up old conversations after 30 minutes
      setTimeout(() => {
        activeConversations.delete(newConversationId);
      }, 30 * 60 * 1000);

      // Store conversation ID for response
      (conversation as unknown as { id: string }).id = newConversationId;
    }

    // Send message and get response
    const result = await conversation.sendMessage(message);

    // Log usage for tracking
    logger.info('AI chat completed', {
      organizationId,
      conversationId: (conversation as unknown as { id: string }).id,
      toolsUsed: result.toolsUsed,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });

    // Track token usage in database (async, don't wait)
    trackTokenUsage(organizationId, result.usage).catch(err => {
      logger.error('Failed to track token usage', { error: err });
    });

    return sendSuccess(res, {
      response: result.response,
      conversationId: (conversation as unknown as { id: string }).id,
      toolsUsed: result.toolsUsed.length > 0 ? result.toolsUsed : undefined,
      usage: result.usage,
    });
  } catch (err) {
    logger.error('AI chat error', { error: err });

    if (err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')) {
      return sendError(res, ErrorCodes.FEATURE_DISABLED, 'AI service not configured', 503);
    }

    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to process AI request', 500);
  }
});

/**
 * DELETE /api/ai/conversations/:id
 * End a conversation and clean up
 */
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (activeConversations.has(id)) {
    activeConversations.delete(id);
    return sendSuccess(res, { deleted: true });
  }

  return sendError(res, ErrorCodes.RESOURCE_NOT_FOUND, 'Conversation not found', 404);
});

/**
 * GET /api/ai/usage
 * Get AI usage statistics for the organization
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const organizationId = req.auth!.organizationId;

    // Get usage for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Note: AIUsage model needs to be added to schema
    // For now, return placeholder data
    const dailyLimit = parseInt(process.env.AI_MAX_TOKENS_PER_ORG_DAY || '100000');

    // TODO: Uncomment when AIUsage model is added to schema
    /*
    const usage = await prisma.aIUsage.aggregate({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
      _count: true,
    });
    */

    return sendSuccess(res, {
      period: 'month',
      startDate: startOfMonth.toISOString(),
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      conversationCount: 0,
      dailyLimit,
    });
  } catch (err) {
    logger.error('Failed to get AI usage', { error: err });
    return sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to get usage statistics', 500);
  }
});

// Helper function to track token usage
async function trackTokenUsage(
  organizationId: string,
  usage: { inputTokens: number; outputTokens: number }
): Promise<void> {
  // TODO: Add AIUsage model to schema and uncomment
  /*
  try {
    await prisma.aIUsage.create({
      data: {
        organizationId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
  } catch (err) {
    logger.warn('AIUsage model not available', { error: err });
  }
  */
  logger.info('Token usage tracked (in-memory)', { organizationId, ...usage });
}

export default router;
