/**
 * Vapi Webhooks
 *
 * Handles events from Vapi AI voice calls:
 * - Call status updates
 * - Transcripts
 * - Tool calls (function calling)
 * - End of call reports
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { events } from '../services/events';
import { vapi } from '../services/vapi';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();

// ============================================
// TYPES
// ============================================

interface VapiWebhookPayload {
  message: {
    type: string;
    call?: {
      id: string;
      orgId: string;
      createdAt: string;
      updatedAt: string;
      status: string;
      endedReason?: string;
      metadata?: Record<string, unknown>;
    };
    timestamp?: string;
    transcript?: string;
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
    toolCalls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
    analysis?: {
      summary?: string;
      structuredData?: Record<string, unknown>;
      successEvaluation?: string;
    };
    artifact?: {
      transcript?: string;
      messages?: Array<{
        role: string;
        content: string;
        time: number;
      }>;
      recordingUrl?: string;
    };
    endedReason?: string;
  };
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Verify Vapi webhook signature
 *
 * SECURITY: Always validates if VAPI_WEBHOOK_SECRET is configured.
 * This ensures webhooks are protected in all environments.
 */
const verifySignature = (req: Request, res: Response, next: Function) => {
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  // If no secret configured, fail secure in production
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('CRITICAL: VAPI_WEBHOOK_SECRET not set in production - rejecting webhook');
      return res.status(503).json({
        success: false,
        error: { code: 'E5002', message: 'Webhook service misconfigured' },
      });
    }
    // Only allow bypass in development/test environments
    logger.warn('Development mode: Vapi webhook signature validation skipped');
    return next();
  }

  const signature = req.headers['x-vapi-signature'] as string;
  if (!signature) {
    logger.warn('Vapi webhook rejected: Missing signature', { ip: req.ip });
    return res.status(401).json({
      success: false,
      error: { code: 'E4007', message: 'Missing webhook signature' },
    });
  }

  // Get raw body for signature verification
  const payload = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('Vapi webhook rejected: Invalid signature', { ip: req.ip, path: req.path });
    return res.status(403).json({
      success: false,
      error: { code: 'E4007', message: 'Invalid webhook signature' },
    });
  }

  next();
};

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * POST /webhooks/vapi
 * Main webhook endpoint for all Vapi events
 */
router.post('/', verifySignature, async (req: Request, res: Response) => {
  // Parse body if it's a Buffer (from express.raw middleware)
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString());
    } catch (e) {
      logger.error('Failed to parse Vapi webhook body', e);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const payload = body as VapiWebhookPayload;

  // Vapi sends type inside message object
  const messageType = payload.message?.type;

  // Only log non-frequent events
  if (messageType && !['speech-update', 'conversation-update', 'model-output', 'voice-input', 'user-interrupted'].includes(messageType)) {
    logger.info('Vapi webhook received', { type: messageType });
  }

  try {
    // Normalize payload - Vapi sometimes sends data at top level
    const normalizedPayload: VapiWebhookPayload = payload.message
      ? payload
      : { message: body as any };

    switch (messageType) {
      case 'status-update':
        await handleStatusUpdate(normalizedPayload);
        break;

      case 'transcript':
        await handleTranscript(normalizedPayload);
        break;

      case 'function-call':
        // Handle legacy function calls
        const functionResult = await handleFunctionCall(normalizedPayload);
        return res.json({ result: functionResult });

      case 'tool-calls':
        // Handle new tool calls format
        const toolResults = await handleToolCalls(normalizedPayload);
        return res.json({ results: toolResults });

      case 'end-of-call-report':
        await handleEndOfCall(normalizedPayload);
        break;

      case 'hang':
        await handleHangup(normalizedPayload);
        break;

      case 'speech-update':
      case 'conversation-update':
      case 'model-output':
      case 'voice-input':
        // Ignore these frequent events
        break;

      default:
        if (messageType) {
          logger.debug('Unhandled Vapi event type', { type: messageType });
        }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error handling Vapi webhook', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle call status updates
 */
async function handleStatusUpdate(payload: VapiWebhookPayload): Promise<void> {
  const { call } = payload.message;
  if (!call) return;

  logger.info('Vapi call status', { callId: call.id, status: call.status });

  // Find our call record by vapiCallId
  const callRecord = await prisma.call.findFirst({
    where: { vapiCallId: call.id },
  });

  if (!callRecord) {
    logger.warn('No call record found for Vapi call', { callId: call.id });
    return;
  }

  // Map Vapi status to our status
  const statusMap: Record<string, string> = {
    'queued': 'ringing',
    'ringing': 'ringing',
    'in-progress': 'in_progress',
    'forwarding': 'in_progress',
    'ended': 'completed',
  };

  const newStatus = statusMap[call.status] || 'completed';

  await prisma.call.update({
    where: { id: callRecord.id },
    data: {
      status: newStatus as any,
      aiHandled: true,
    },
  });
}

/**
 * Handle real-time transcript updates
 */
async function handleTranscript(payload: VapiWebhookPayload): Promise<void> {
  const { call, transcript } = payload.message;
  if (!call || !transcript) return;

  // Find our call record
  const callRecord = await prisma.call.findFirst({
    where: { vapiCallId: call.id },
  });

  if (!callRecord) return;

  // Update transcript (this will be called multiple times, always overwriting)
  await prisma.call.update({
    where: { id: callRecord.id },
    data: { transcript },
  });
}

/**
 * Handle legacy function calls
 */
async function handleFunctionCall(
  payload: VapiWebhookPayload
): Promise<unknown> {
  const { call, functionCall } = payload.message;
  if (!functionCall) return { error: 'No function call data' };

  // Get context from call metadata
  const metadata = call?.metadata as any || {};
  const context = {
    organizationId: metadata.organizationId || '',
    callId: metadata.callId || '',
    customerId: metadata.customerId,
  };

  return vapi.handleToolCall(functionCall.name, functionCall.parameters, context);
}

/**
 * Handle new tool calls format
 */
async function handleToolCalls(
  payload: VapiWebhookPayload
): Promise<Array<{ toolCallId: string; result: unknown }>> {
  const { call, toolCalls } = payload.message;
  if (!toolCalls || toolCalls.length === 0) {
    return [];
  }

  const metadata = call?.metadata as any || {};
  const context = {
    organizationId: metadata.organizationId || '',
    callId: metadata.callId || '',
    customerId: metadata.customerId,
  };

  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await vapi.handleToolCall(toolCall.function.name, args, context);
      return {
        toolCallId: toolCall.id,
        result,
      };
    })
  );

  return results;
}

/**
 * Handle end of call report
 */
async function handleEndOfCall(payload: VapiWebhookPayload): Promise<void> {
  const { call, analysis, artifact, endedReason } = payload.message;
  if (!call) return;

  logger.info('Vapi call ended', { callId: call.id, reason: endedReason });

  // Find our call record
  const callRecord = await prisma.call.findFirst({
    where: { vapiCallId: call.id },
    include: { customer: true },
  });

  if (!callRecord) {
    logger.warn('No call record found for Vapi call', { callId: call.id });
    return;
  }

  // Calculate duration from messages if available
  let duration = 0;
  if (artifact?.messages && artifact.messages.length > 1) {
    const firstMessage = artifact.messages[0];
    const lastMessage = artifact.messages[artifact.messages.length - 1];
    duration = Math.round((lastMessage.time - firstMessage.time) / 1000);
  }

  // Update call record with final data
  await prisma.call.update({
    where: { id: callRecord.id },
    data: {
      status: 'completed',
      duration,
      transcript: artifact?.transcript || callRecord.transcript,
      summary: analysis?.summary,
      recordingUrl: artifact?.recordingUrl,
      aiHandled: true,
      endedAt: new Date(),
    },
  });

  // Emit call completed event
  await events.emit({
    type: 'call.completed',
    organizationId: callRecord.organizationId,
    aggregateType: 'call',
    aggregateId: callRecord.id,
    data: {
      callId: callRecord.id,
      customerId: callRecord.customerId,
      duration,
      aiHandled: true,
      summary: analysis?.summary,
    },
  });

  logger.info('Vapi call completed', { callId: callRecord.id, durationSeconds: duration });
}

/**
 * Handle hangup events
 */
async function handleHangup(payload: VapiWebhookPayload): Promise<void> {
  const { call } = payload.message;
  if (!call) return;

  // Find our call record
  const callRecord = await prisma.call.findFirst({
    where: { vapiCallId: call.id },
  });

  if (!callRecord) return;

  // If call was hung up early (customer hung up), mark as no_answer
  await prisma.call.update({
    where: { id: callRecord.id },
    data: {
      status: call.endedReason === 'customer-ended-call' ? 'completed' : 'no_answer',
      endedAt: new Date(),
    },
  });
}

/**
 * POST /webhooks/vapi/assistant-request
 * Dynamic assistant configuration endpoint
 * Vapi calls this to get assistant config for each call
 */
router.post('/assistant-request', async (req: Request, res: Response) => {
  const { call } = req.body;

  logger.info('Vapi assistant request', { callId: call?.id });

  try {
    // Get organization from call metadata or phone number
    const metadata = call?.metadata as any || {};
    let organizationId = metadata.organizationId;

    if (!organizationId && call?.phoneNumber?.number) {
      const phoneNumber = await prisma.phoneNumber.findUnique({
        where: { number: call.phoneNumber.number },
      });
      organizationId = phoneNumber?.organizationId;
    }

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const settings = org.settings as any;
    const aiSettings = settings?.aiSettings || {};

    // Return dynamic assistant configuration
    res.json({
      assistant: {
        name: `${org.name} AI`,
        firstMessage: aiSettings.greeting ||
          `Thanks for calling ${org.name}! I'm the AI assistant. How can I help you today?`,
        model: {
          provider: 'openai',
          model: 'gpt-4-turbo',
          systemPrompt: vapi.buildSystemPrompt(org),
          temperature: 0.7,
        },
        voice: {
          provider: 'playht',
          voiceId: 'jennifer',
        },
        tools: vapi.getAssistantTools(),
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
        serverUrl: `${process.env.API_URL}/webhooks/vapi`,
        metadata: {
          organizationId: org.id,
          callId: metadata.callId,
        },
      },
    });
  } catch (error) {
    logger.error('Error handling assistant request', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
