/**
 * AI Chat API Routes
 * Provides REST endpoints for AI conversations
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';
import { success, error } from '../utils/api-response';
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
router.post('/chat', async (req, res) => {
  try {
    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(
        error('E4001', 'Invalid request', validation.error.errors)
      );
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

    return res.json(
      success({
        response: result.response,
        conversationId: (conversation as unknown as { id: string }).id,
        toolsUsed: result.toolsUsed.length > 0 ? result.toolsUsed : undefined,
        usage: result.usage,
      })
    );
  } catch (err) {
    logger.error('AI chat error', { error: err });

    if (err instanceof Error && err.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(503).json(
        error('E5003', 'AI service not configured')
      );
    }

    return res.status(500).json(
      error('E5001', 'Failed to process AI request')
    );
  }
});

/**
 * DELETE /api/ai/conversations/:id
 * End a conversation and clean up
 */
router.delete('/conversations/:id', async (req, res) => {
  const { id } = req.params;

  if (activeConversations.has(id)) {
    activeConversations.delete(id);
    return res.json(success({ deleted: true }));
  }

  return res.status(404).json(
    error('E4004', 'Conversation not found')
  );
});

/**
 * GET /api/ai/usage
 * Get AI usage statistics for the organization
 */
router.get('/usage', async (req, res) => {
  try {
    const organizationId = req.auth!.organizationId;

    // Get usage for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

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

    const dailyLimit = parseInt(process.env.AI_MAX_TOKENS_PER_ORG_DAY || '100000');

    return res.json(
      success({
        period: 'month',
        startDate: startOfMonth.toISOString(),
        totalInputTokens: usage._sum.inputTokens || 0,
        totalOutputTokens: usage._sum.outputTokens || 0,
        totalTokens: (usage._sum.inputTokens || 0) + (usage._sum.outputTokens || 0),
        conversationCount: usage._count,
        dailyLimit,
      })
    );
  } catch (err) {
    logger.error('Failed to get AI usage', { error: err });
    return res.status(500).json(
      error('E5001', 'Failed to get usage statistics')
    );
  }
});

// Helper function to track token usage
async function trackTokenUsage(
  organizationId: string,
  usage: { inputTokens: number; outputTokens: number }
): Promise<void> {
  try {
    await prisma.aIUsage.create({
      data: {
        organizationId,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    });
  } catch (err) {
    // AIUsage model might not exist yet - log but don't fail
    logger.warn('AIUsage model not available', { error: err });
  }
}

export default router;
