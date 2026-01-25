/**
 * Twilio Webhooks
 *
 * Handles incoming calls and SMS from Twilio.
 * Uses event-driven architecture - webhooks emit events, handlers process them.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@serviceflow/database';
import twilio from 'twilio';
import { normalizePhone } from '@serviceflow/shared';
import { events, CallMissedEventData, SmsReceivedEventData } from '../services/events';
import { sms } from '../services/sms';
import { vapi } from '../services/vapi';
import { logWebhook, markWebhookProcessed, markWebhookIgnored } from '../services/webhooks';
import { findOrCreateConversation, updateLastMessageTime } from '../services/conversation';

const router = Router();

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Parse Twilio webhook body (x-www-form-urlencoded)
 */
const parseTwilioBody = (req: Request, res: Response, next: NextFunction) => {
  // If body is Buffer (from express.raw), convert to string and parse
  if (Buffer.isBuffer(req.body)) {
    const bodyString = req.body.toString('utf8');
    const params = new URLSearchParams(bodyString);
    req.body = Object.fromEntries(params.entries());
  }
  next();
};

/**
 * Validate Twilio webhook signature
 *
 * SECURITY: Always validates if TWILIO_AUTH_TOKEN is configured.
 * This ensures webhooks are protected in all environments.
 */
const validateTwilioRequest = (req: Request, res: Response, next: NextFunction) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // If no auth token configured, fail secure in production
  if (!authToken) {
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ CRITICAL: TWILIO_AUTH_TOKEN not set in production - rejecting webhook');
      return res.status(503).json({
        success: false,
        error: { code: 'E5001', message: 'Webhook service misconfigured' },
      });
    }
    // Only allow bypass in development/test environments
    console.warn('⚠️ Development mode: Twilio webhook signature validation skipped');
    return next();
  }

  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) {
    console.warn(`⚠️ Twilio webhook rejected: Missing signature from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: { code: 'E4001', message: 'Missing webhook signature' },
    });
  }

  const url = `${process.env.API_URL}${req.originalUrl}`;

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);

  if (!isValid) {
    console.warn(
      `⚠️ Twilio webhook rejected: Invalid signature from ${req.ip}`,
      { url, path: req.path }
    );
    return res.status(403).json({
      success: false,
      error: { code: 'E4001', message: 'Invalid webhook signature' },
    });
  }

  next();
};

// Apply middleware to all routes
router.use(parseTwilioBody);
router.use(validateTwilioRequest);

// ============================================
// VOICE WEBHOOKS
// ============================================

/**
 * POST /webhooks/twilio/voice
 * Incoming call webhook
 */
router.post('/voice', async (req: Request, res: Response) => {
  const { CallSid, From, To, CallStatus } = req.body;

  // Log webhook
  const webhookId = await logWebhook({
    provider: 'twilio',
    eventType: 'voice.incoming',
    externalId: CallSid,
    payload: req.body,
  });

  try {
    // Normalize phone numbers (URLSearchParams converts + to space in form data)
    const normalizedTo = normalizePhone(To);
    console.log(`📞 Incoming call: ${From} -> ${To} (normalized: ${normalizedTo}) (${CallStatus})`);

    // 1. Find organization by phone number
    const phoneNumber = normalizedTo ? await prisma.phoneNumber.findUnique({
      where: { number: normalizedTo },
      include: { organization: true },
    }) : null;

    if (!phoneNumber) {
      console.error(`No organization found for number: ${To}`);
      await markWebhookIgnored(webhookId);

      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, this number is not configured. Please try again later.');
      return res.type('text/xml').send(twiml.toString());
    }

    // 2. Find or create customer
    const normalizedFrom = normalizePhone(From);
    let customer = await prisma.customer.findFirst({
      where: { organizationId: phoneNumber.organizationId, phone: normalizedFrom! },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId: phoneNumber.organizationId,
          firstName: 'Unknown',
          lastName: 'Caller',
          phone: normalizedFrom!,
          source: 'phone_inbound',
        },
      });

      // Emit customer created event
      await events.emit({
        type: 'customer.created',
        organizationId: phoneNumber.organizationId,
        aggregateType: 'customer',
        aggregateId: customer.id,
        data: { customerId: customer.id, source: 'phone_inbound' },
      });
    }

    // 3. Create call record
    const call = await prisma.call.create({
      data: {
        organizationId: phoneNumber.organizationId,
        customerId: customer.id,
        direction: 'inbound',
        status: 'ringing',
        from: From,
        to: To,
        twilioSid: CallSid,
        aiHandled: false, // Will be updated if AI handles
      },
    });

    // Emit call started event
    await events.emit({
      type: 'call.started',
      organizationId: phoneNumber.organizationId,
      aggregateType: 'call',
      aggregateId: call.id,
      data: {
        callId: call.id,
        customerId: customer.id,
        from: From,
        to: To,
      },
    });

    // 4. Build TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    const settings = phoneNumber.organization.settings as any;
    const aiSettings = settings?.aiSettings || {};

    // Check if Vapi AI handling is enabled
    const useVapiAI = aiSettings.voiceEnabled !== false && vapi.isConfigured();

    if (useVapiAI) {
      // Route to Vapi AI assistant
      console.log(`🤖 Routing call to Vapi AI for ${phoneNumber.organization.name}`);

      try {
        // Get or create Vapi assistant for this organization
        const assistantId = await vapi.getOrCreateAssistant(phoneNumber.organizationId);

        // Update call record with Vapi info
        await prisma.call.update({
          where: { id: call.id },
          data: { aiHandled: true },
        });

        // Use Vapi's phoneCallProviderBypass to get TwiML
        const vapiTwiml = await vapi.connectInboundCall({
          assistantId,
          callerNumber: From,
          twilioNumber: To,
        });

        console.log(`📞 Connected call ${call.id} to Vapi assistant ${assistantId}`);

        // Return Vapi's TwiML directly
        await markWebhookProcessed(webhookId);
        return res.type('text/xml').send(vapiTwiml);
      } catch (error) {
        console.error('Error connecting to Vapi:', error);
        // Fall back to voicemail if Vapi fails
        const greeting = aiSettings.greeting ||
          `Thanks for calling ${phoneNumber.organization.name}. We're currently helping another customer.`;
        twiml.say({ voice: 'Polly.Matthew' }, greeting);
        twiml.say(
          { voice: 'Polly.Matthew' },
          'Please leave a message after the tone and we will call you back shortly.'
        );
        twiml.record({
          maxLength: 120,
          action: '/webhooks/twilio/voice/recording',
          transcribe: true,
          transcribeCallback: '/webhooks/twilio/voice/transcription',
        });
      }
    } else {
      // Vapi not configured - use voicemail
      const greeting =
        aiSettings.greeting ||
        `Thanks for calling ${phoneNumber.organization.name}. We're currently helping another customer.`;

      twiml.say({ voice: 'Polly.Matthew' }, greeting);
      twiml.say(
        { voice: 'Polly.Matthew' },
        'Please leave a message after the tone and we will call you back shortly.'
      );
      twiml.record({
        maxLength: 120,
        action: '/webhooks/twilio/voice/recording',
        transcribe: true,
        transcribeCallback: '/webhooks/twilio/voice/transcription',
      });
    }

    await markWebhookProcessed(webhookId);
    res.type('text/xml').send(twiml.toString());
  } catch (error: any) {
    console.error('Error handling voice webhook:', error);
    await markWebhookProcessed(webhookId, error.message);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, we encountered an error. Please try again later.');
    res.type('text/xml').send(twiml.toString());
  }
});

/**
 * POST /webhooks/twilio/voice/status
 * Call status update webhook
 */
router.post('/voice/status', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  const webhookId = await logWebhook({
    provider: 'twilio',
    eventType: 'voice.status',
    externalId: CallSid,
    payload: req.body,
  });

  try {
    console.log(`📞 Call status: ${CallSid} -> ${CallStatus}`);

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      queued: 'ringing',
      ringing: 'ringing',
      'in-progress': 'in_progress',
      completed: 'completed',
      busy: 'busy',
      'no-answer': 'no_answer',
      failed: 'failed',
    };

    // Get current call to check if it's a voicemail (don't overwrite voicemail status)
    const existingCall = await prisma.call.findUnique({
      where: { twilioSid: CallSid },
      select: { status: true },
    });

    // Don't overwrite voicemail status with completed
    const newStatus = existingCall?.status === 'voicemail' && CallStatus === 'completed'
      ? 'voicemail'
      : (statusMap[CallStatus] || 'completed');

    const call = await prisma.call.update({
      where: { twilioSid: CallSid },
      data: {
        status: newStatus as any,
        duration: CallDuration ? parseInt(CallDuration) : undefined,
        endedAt: ['completed', 'busy', 'no-answer', 'failed'].includes(CallStatus)
          ? new Date()
          : undefined,
      },
      include: { customer: true },
    });

    // Emit appropriate event based on status
    if (['no-answer', 'busy'].includes(CallStatus)) {
      // Call was missed
      await events.emit<CallMissedEventData>({
        type: 'call.missed',
        organizationId: call.organizationId,
        aggregateType: 'call',
        aggregateId: call.id,
        data: {
          callId: call.id,
          customerId: call.customerId,
          from: call.from,
          to: call.to,
          duration: call.duration || 0,
          status: CallStatus === 'no-answer' ? 'no_answer' : 'busy',
        },
      });
    } else if (CallStatus === 'completed') {
      await events.emit({
        type: 'call.completed',
        organizationId: call.organizationId,
        aggregateType: 'call',
        aggregateId: call.id,
        data: {
          callId: call.id,
          customerId: call.customerId,
          duration: call.duration,
        },
      });
    }

    await markWebhookProcessed(webhookId);
    res.sendStatus(200);
  } catch (error: any) {
    console.error('Error handling voice status:', error);
    await markWebhookProcessed(webhookId, error.message);
    res.sendStatus(500);
  }
});

/**
 * POST /webhooks/twilio/voice/recording
 * Recording completed webhook
 */
router.post('/voice/recording', async (req: Request, res: Response) => {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body;

  await logWebhook({
    provider: 'twilio',
    eventType: 'voice.recording',
    externalId: CallSid,
    payload: req.body,
  });

  try {
    console.log(`🎙️ Recording received for ${CallSid}: ${RecordingUrl}`);

    // Update call with recording URL
    await prisma.call.update({
      where: { twilioSid: CallSid },
      data: {
        recordingUrl: RecordingUrl,
        status: 'voicemail',
      },
    });

    // Return empty TwiML to end the call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Matthew' }, 'Thank you. We will call you back soon. Goodbye.');
    twiml.hangup();

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error handling recording webhook:', error);
    res.sendStatus(500);
  }
});

/**
 * POST /webhooks/twilio/voice/transcription
 * Transcription completed webhook
 */
router.post('/voice/transcription', async (req: Request, res: Response) => {
  const { CallSid, TranscriptionText, TranscriptionUrl } = req.body;

  await logWebhook({
    provider: 'twilio',
    eventType: 'voice.transcription',
    externalId: CallSid,
    payload: req.body,
  });

  try {
    console.log(`📝 Transcription received for ${CallSid}`);

    // Update call with transcription
    const call = await prisma.call.update({
      where: { twilioSid: CallSid },
      data: {
        transcript: TranscriptionText,
        transcriptUrl: TranscriptionUrl,
      },
    });

    // Emit voicemail event (triggers missed call handler)
    await events.emit<CallMissedEventData>({
      type: 'call.voicemail',
      organizationId: call.organizationId,
      aggregateType: 'call',
      aggregateId: call.id,
      data: {
        callId: call.id,
        customerId: call.customerId,
        from: call.from,
        to: call.to,
        duration: call.duration || 0,
        status: 'voicemail',
      },
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling transcription webhook:', error);
    res.sendStatus(500);
  }
});

// ============================================
// SMS WEBHOOKS
// ============================================

/**
 * POST /webhooks/twilio/sms
 * Incoming SMS webhook
 */
router.post('/sms', async (req: Request, res: Response) => {
  const { MessageSid, From, To, Body } = req.body;

  const webhookId = await logWebhook({
    provider: 'twilio',
    eventType: 'sms.incoming',
    externalId: MessageSid,
    payload: req.body,
  });

  try {
    // Normalize phone numbers (URLSearchParams converts + to space in form data)
    const normalizedTo = normalizePhone(To);
    console.log(`💬 Incoming SMS: ${From} -> ${To} (normalized: ${normalizedTo}): ${Body?.substring(0, 50)}...`);

    // 1. Find organization by phone number
    const phoneNumber = normalizedTo ? await prisma.phoneNumber.findUnique({
      where: { number: normalizedTo },
      include: { organization: true },
    }) : null;

    if (!phoneNumber) {
      console.error(`No organization found for number: ${To}`);
      await markWebhookIgnored(webhookId);
      return res.sendStatus(200);
    }

    // 2. Check for TCPA compliance keywords (STOP, START, HELP)
    const complianceResult = await sms.handleComplianceKeyword(
      phoneNumber.organizationId,
      From,
      Body
    );

    if (complianceResult.handled) {
      // Send compliance response
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(complianceResult.response!);
      await markWebhookProcessed(webhookId);
      return res.type('text/xml').send(twiml.toString());
    }

    // 3. Find or create customer
    const normalizedFrom = normalizePhone(From);
    let customer = await prisma.customer.findFirst({
      where: { organizationId: phoneNumber.organizationId, phone: normalizedFrom! },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId: phoneNumber.organizationId,
          firstName: 'Unknown',
          lastName: 'Sender',
          phone: normalizedFrom!,
          source: 'sms_inbound',
        },
      });
    }

    // 4. Find or create conversation (atomic to prevent race conditions)
    const conversationResult = await findOrCreateConversation(
      phoneNumber.organizationId,
      customer.id,
      'sms',
      false // Not AI-handled by default for inbound
    );
    const conversationId = conversationResult.id;

    // 5. Create message record
    const message = await prisma.message.create({
      data: {
        conversationId,
        direction: 'inbound',
        senderType: 'customer',
        content: Body,
        status: 'delivered',
        metadata: { twilioSid: MessageSid },
      },
    });

    // 6. Update conversation and customer
    await updateLastMessageTime(conversationId);

    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastContactAt: new Date() },
    });

    // 7. Emit event
    await events.emit<SmsReceivedEventData>({
      type: 'sms.received',
      organizationId: phoneNumber.organizationId,
      aggregateType: 'message',
      aggregateId: message.id,
      data: {
        messageId: message.id,
        conversationId,
        customerId: customer.id,
        from: From,
        to: To,
        content: Body,
      },
    });

    // AI response is triggered via the sms.received event handler
    // See: handlers/sms-ai-response.ts

    await markWebhookProcessed(webhookId);

    // Return empty TwiML (we'll respond asynchronously via AI)
    res.type('text/xml').send('<Response></Response>');
  } catch (error: any) {
    console.error('Error handling SMS webhook:', error);
    await markWebhookProcessed(webhookId, error.message);
    res.sendStatus(500);
  }
});

/**
 * POST /webhooks/twilio/sms/status
 * SMS status update webhook
 */
router.post('/sms/status', async (req: Request, res: Response) => {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

  await logWebhook({
    provider: 'twilio',
    eventType: 'sms.status',
    externalId: MessageSid,
    payload: req.body,
  });

  try {
    console.log(`💬 SMS status: ${MessageSid} -> ${MessageStatus}`);

    // Find message by Twilio SID
    const message = await prisma.message.findFirst({
      where: {
        metadata: {
          path: ['twilioSid'],
          equals: MessageSid,
        },
      },
      include: { conversation: true },
    });

    if (message) {
      const statusMap: Record<string, string> = {
        queued: 'pending',
        sending: 'pending',
        sent: 'sent',
        delivered: 'delivered',
        undelivered: 'failed',
        failed: 'failed',
      };

      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: (statusMap[MessageStatus] || 'sent') as any,
          metadata: {
            ...(message.metadata as any),
            errorCode: ErrorCode,
            errorMessage: ErrorMessage,
          },
        },
      });

      // Emit appropriate event
      if (MessageStatus === 'delivered') {
        await events.emit({
          type: 'sms.delivered',
          organizationId: message.conversation.organizationId,
          aggregateType: 'message',
          aggregateId: message.id,
          data: { messageId: message.id },
        });
      } else if (['undelivered', 'failed'].includes(MessageStatus)) {
        await events.emit({
          type: 'sms.failed',
          organizationId: message.conversation.organizationId,
          aggregateType: 'message',
          aggregateId: message.id,
          data: { messageId: message.id, errorCode: ErrorCode, errorMessage: ErrorMessage },
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling SMS status:', error);
    res.sendStatus(500);
  }
});

export default router;
