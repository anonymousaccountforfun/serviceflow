/**
 * Message Templates API Routes
 *
 * CRUD operations for SMS/email templates with variable support.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { asyncHandler, sendSuccess, sendPaginated, errors, sendError, ErrorCodes } from '../utils/api-response';

const router = Router();

// Template types matching the Prisma enum
const templateTypes = [
  'missed_call_textback',
  'missed_call_after_hours',
  'review_request',
  'review_request_followup',
  'review_sentiment_check',
  'estimate_sent',
  'estimate_followup',
  'estimate_expiring',
  'appointment_confirmation',
  'appointment_reminder',
  'appointment_on_my_way',
  'invoice_sent',
] as const;

// Create template schema
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(templateTypes),
  channel: z.enum(['sms', 'email']).default('sms'),
  subject: z.string().optional(), // For email
  content: z.string().min(1).max(1000),
});

// Update template schema
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().optional(),
  content: z.string().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Extract variables from template content
 * Matches {{variableName}} pattern
 */
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

// GET /api/templates - List templates
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
  const orgId = req.auth!.organizationId;
  const type = req.query.type as string | undefined;
  const channel = req.query.channel as string | undefined;
  const includeDefaults = req.query.includeDefaults !== 'false';

  // Get org-specific templates
  const where: Record<string, unknown> = { organizationId: orgId };
  if (type) where.type = type;
  if (channel) where.channel = channel;

  const [orgTemplates, total] = await Promise.all([
    prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.messageTemplate.count({ where }),
  ]);

  // Optionally include system defaults that the org hasn't overridden
  let defaultTemplates: typeof orgTemplates = [];
  if (includeDefaults) {
    const orgTemplateTypes = orgTemplates.map((t) => t.type);
    const defaultWhere: Record<string, unknown> = {
      organizationId: null,
      isDefault: true,
      isActive: true,
      type: { notIn: orgTemplateTypes },
    };
    if (type) defaultWhere.type = type;
    if (channel) defaultWhere.channel = channel;

    defaultTemplates = await prisma.messageTemplate.findMany({
      where: defaultWhere,
      orderBy: { type: 'asc' },
    });
  }

  // Combine and mark which are defaults
  const templates = [
    ...orgTemplates.map((t) => ({ ...t, isSystemDefault: false })),
    ...defaultTemplates.map((t) => ({ ...t, isSystemDefault: true })),
  ];

  sendPaginated(res, templates, {
    page,
    perPage,
    total: total + defaultTemplates.length,
    totalPages: Math.ceil((total + defaultTemplates.length) / perPage),
  });
}));

// GET /api/templates/:id - Get single template
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  // Try org template first, then system default
  let template = await prisma.messageTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId: null, isDefault: true },
    });
  }

  if (!template) {
    return errors.notFound(res, 'Template');
  }

  sendSuccess(res, {
    ...template,
    variables: extractVariables(template.content),
    isSystemDefault: template.organizationId === null,
  });
}));

// GET /api/templates/type/:type - Get template by type (used by SMS service)
router.get('/type/:type', asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params;
  const orgId = req.auth!.organizationId;

  if (!templateTypes.includes(type as typeof templateTypes[number])) {
    return errors.validation(res, 'Invalid template type');
  }

  // Try org-specific first, then system default
  let template = await prisma.messageTemplate.findFirst({
    where: {
      organizationId: orgId,
      type: type as typeof templateTypes[number],
      isActive: true,
    },
  });

  if (!template) {
    template = await prisma.messageTemplate.findFirst({
      where: {
        organizationId: null,
        type: type as typeof templateTypes[number],
        isDefault: true,
        isActive: true,
      },
    });
  }

  if (!template) {
    return errors.notFound(res, 'No template found for this type');
  }

  sendSuccess(res, {
    ...template,
    variables: extractVariables(template.content),
    isSystemDefault: template.organizationId === null,
  });
}));

// POST /api/templates - Create template
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.auth!.organizationId;

  let data;
  try {
    data = createTemplateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validation(res, 'Validation error', { details: error.errors });
    }
    throw error;
  }

  // Check if org already has a template of this type
  const existing = await prisma.messageTemplate.findFirst({
    where: { organizationId: orgId, type: data.type },
  });

  if (existing) {
    return sendError(res, ErrorCodes.DUPLICATE_ENTRY, 'A template of this type already exists', 409);
  }

  const template = await prisma.messageTemplate.create({
    data: {
      organizationId: orgId,
      name: data.name,
      type: data.type,
      channel: data.channel,
      subject: data.subject,
      content: data.content,
      isActive: true,
      isDefault: false,
    },
  });

  sendSuccess(res, {
    ...template,
    variables: extractVariables(template.content),
  }, 201);
}));

// PATCH /api/templates/:id - Update template
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  let data;
  try {
    data = updateTemplateSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errors.validation(res, 'Validation error', { details: error.errors });
    }
    throw error;
  }

  const template = await prisma.messageTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    return errors.notFound(res, 'Template');
  }

  const updated = await prisma.messageTemplate.update({
    where: { id },
    data: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      isActive: data.isActive,
    },
  });

  sendSuccess(res, {
    ...updated,
    variables: extractVariables(updated.content),
  });
}));

// DELETE /api/templates/:id - Delete template
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const template = await prisma.messageTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    return errors.notFound(res, 'Template');
  }

  await prisma.messageTemplate.delete({ where: { id } });

  sendSuccess(res, { deleted: true });
}));

// POST /api/templates/:id/preview - Preview template with sample data
router.post('/:id/preview', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const { variables } = req.body;

  // Get template
  let template = await prisma.messageTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId: null, isDefault: true },
    });
  }

  if (!template) {
    return errors.notFound(res, 'Template');
  }

  // Replace variables in content
  let preview = template.content;
  const templateVars = extractVariables(template.content);

  for (const varName of templateVars) {
    const value = variables?.[varName] || `[${varName}]`;
    preview = preview.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
  }

  sendSuccess(res, {
    original: template.content,
    preview,
    variables: templateVars,
    subject: template.subject,
  });
}));

export default router;
