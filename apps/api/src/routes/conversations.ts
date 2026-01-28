import { Router } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { sms } from '../services/sms';
import { findOrCreateConversation } from '../services/conversation';
import { asyncHandler, sendSuccess, sendPaginated, errors } from '../utils/api-response';

const router = Router();

// GET /api/conversations - List conversations
router.get('/', asyncHandler(async (req, res) => {
  const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
  const orgId = req.auth!.organizationId;
  const status = req.query.status as string | undefined;

  const where: Prisma.ConversationWhereInput = { organizationId: orgId };
  if (status) where.status = status as Prisma.ConversationWhereInput['status'];

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

  sendPaginated(res, conversations, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

// GET /api/conversations/:id - Get conversation with messages
router.get('/:id', asyncHandler(async (req, res) => {
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
    return errors.notFound(res, 'Conversation');
  }

  sendSuccess(res, conversation);
}));

// POST /api/conversations/:id/messages - Send message
router.post('/:id/messages', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return errors.validation(res, 'Message content is required');
  }

  // Verify conversation exists
  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId: orgId },
    include: { customer: true },
  });

  if (!conversation) {
    return errors.notFound(res, 'Conversation');
  }

  if (!conversation.customer.phone) {
    return errors.validation(res, 'Customer has no phone number');
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

  sendSuccess(res, message || { id: result.twilioSid, content, status: 'sent' }, 201);
}));

// POST /api/conversations - Start new conversation with a customer
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { customerId, message } = req.body;

  if (!customerId) {
    return errors.validation(res, 'customerId is required');
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return errors.validation(res, 'Message content is required');
  }

  // Find customer
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
  });

  if (!customer) {
    return errors.notFound(res, 'Customer');
  }

  if (!customer.phone) {
    return errors.validation(res, 'Customer has no phone number');
  }

  // Find or create conversation atomically to prevent race conditions
  const conversationResult = await findOrCreateConversation(orgId, customerId, 'sms', false);

  // Send the message
  const result = await sms.send({
    organizationId: orgId,
    customerId,
    conversationId: conversationResult.id,
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

  // Get the full conversation with messages
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationResult.id },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  sendSuccess(res, conversation, 201);
}));

// PATCH /api/conversations/:id - Update conversation status
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const { status } = req.body;

  const validStatuses = ['open', 'pending', 'resolved', 'archived'];
  if (status && !validStatuses.includes(status)) {
    return errors.validation(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!conversation) {
    return errors.notFound(res, 'Conversation');
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: { status },
    include: { customer: true },
  });

  sendSuccess(res, updated);
}));

export default router;
