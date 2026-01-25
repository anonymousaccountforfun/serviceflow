import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { sms } from '../services/sms';

const router = Router();

// GET /api/conversations - List conversations
router.get('/', async (req, res) => {
  try {
    const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
    const orgId = req.auth!.organizationId;
    const status = req.query.status as string | undefined;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { lastMessageAt: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      success: true,
      data: conversations,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list conversations' },
    });
  }
});

// GET /api/conversations/:id - Get conversation with messages
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } },
        calls: { orderBy: { startedAt: 'desc' } },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Conversation not found' },
      });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get conversation' },
    });
  }
});

// POST /api/conversations/:id/messages - Send message
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Message content is required' },
      });
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
      include: { customer: true },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Conversation not found' },
      });
    }

    if (!conversation.customer.phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2002', message: 'Customer has no phone number' },
      });
    }

    // Send via SMS service (handles Twilio, creates message record, updates conversation)
    const result = await sms.send({
      organizationId: orgId,
      customerId: conversation.customerId,
      conversationId: id,
      to: conversation.customer.phone,
      message: content.trim(),
      senderType: 'user', // Manual reply from dashboard
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Fetch the created message to return
    const message = result.messageId
      ? await prisma.message.findUnique({ where: { id: result.messageId } })
      : null;

    res.status(201).json({
      success: true,
      data: message || { id: result.twilioSid, content, status: 'sent' },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to send message' },
    });
  }
});

// POST /api/conversations - Start new conversation with a customer
router.post('/', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const { customerId, message } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'customerId is required' },
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2002', message: 'Message content is required' },
      });
    }

    // Find customer
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Customer not found' },
      });
    }

    if (!customer.phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2003', message: 'Customer has no phone number' },
      });
    }

    // Check for existing open conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        organizationId: orgId,
        customerId,
        channel: 'sms',
        status: { in: ['open', 'pending'] },
      },
    });

    // Send the message (will create conversation if needed)
    const result = await sms.send({
      organizationId: orgId,
      customerId,
      conversationId: conversation?.id,
      to: customer.phone,
      message: message.trim(),
      senderType: 'user',
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Get the conversation (either existing or newly created)
    conversation = await prisma.conversation.findFirst({
      where: {
        organizationId: orgId,
        customerId,
        channel: 'sms',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to start conversation' },
    });
  }
});

// PATCH /api/conversations/:id - Update conversation status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const { status } = req.body;

    const validStatuses = ['open', 'pending', 'resolved', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Conversation not found' },
      });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update conversation' },
    });
  }
});

export default router;
