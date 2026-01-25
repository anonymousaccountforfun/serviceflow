/**
 * Message Templates API Routes
 *
 * CRUD operations for SMS/email templates with variable support.
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { z } from 'zod';
import { logger } from '../lib/logger';

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
router.get('/', async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: templates,
      meta: {
        page,
        perPage,
        total: total + defaultTemplates.length,
        totalPages: Math.ceil((total + defaultTemplates.length) / perPage),
      },
    });
  } catch (error) {
    logger.error('Error listing templates', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list templates' },
    });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Template not found' },
      });
    }

    res.json({
      success: true,
      data: {
        ...template,
        variables: extractVariables(template.content),
        isSystemDefault: template.organizationId === null,
      },
    });
  } catch (error) {
    logger.error('Error getting template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get template' },
    });
  }
});

// GET /api/templates/type/:type - Get template by type (used by SMS service)
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const orgId = req.auth!.organizationId;

    if (!templateTypes.includes(type as typeof templateTypes[number])) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Invalid template type' },
      });
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
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'No template found for this type' },
      });
    }

    res.json({
      success: true,
      data: {
        ...template,
        variables: extractVariables(template.content),
        isSystemDefault: template.organizationId === null,
      },
    });
  } catch (error) {
    logger.error('Error getting template by type', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get template' },
    });
  }
});

// POST /api/templates - Create template
router.post('/', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = createTemplateSchema.parse(req.body);

    // Check if org already has a template of this type
    const existing = await prisma.messageTemplate.findFirst({
      where: { organizationId: orgId, type: data.type },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'E2004', message: 'A template of this type already exists' },
      });
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

    res.status(201).json({
      success: true,
      data: {
        ...template,
        variables: extractVariables(template.content),
      },
    });
  } catch (error) {
    logger.error('Error creating template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to create template' },
    });
  }
});

// PATCH /api/templates/:id - Update template
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = updateTemplateSchema.parse(req.body);

    const template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Template not found' },
      });
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

    res.json({
      success: true,
      data: {
        ...updated,
        variables: extractVariables(updated.content),
      },
    });
  } catch (error) {
    logger.error('Error updating template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update template' },
    });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const template = await prisma.messageTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Template not found' },
      });
    }

    await prisma.messageTemplate.delete({ where: { id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to delete template' },
    });
  }
});

// POST /api/templates/:id/preview - Preview template with sample data
router.post('/:id/preview', async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Template not found' },
      });
    }

    // Replace variables in content
    let preview = template.content;
    const templateVars = extractVariables(template.content);

    for (const varName of templateVars) {
      const value = variables?.[varName] || `[${varName}]`;
      preview = preview.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
    }

    res.json({
      success: true,
      data: {
        original: template.content,
        preview,
        variables: templateVars,
        subject: template.subject,
      },
    });
  } catch (error) {
    logger.error('Error previewing template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to preview template' },
    });
  }
});

export default router;
