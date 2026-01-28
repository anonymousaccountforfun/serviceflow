/**
 * Service Templates API Routes
 *
 * CRUD operations for pre-built service templates that speed up
 * estimate and invoice creation.
 */

import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { asyncHandler, sendSuccess, sendPaginated, sendError, errors, ErrorCodes } from '../utils/api-response';

const router = Router();

// Line item schema for templates
const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(), // quantity * 100 for precision
  unitPrice: z.number().int().nonnegative(), // cents
  total: z.number().int().nonnegative(), // cents
});

type LineItem = z.infer<typeof lineItemSchema>;

// Create service template schema
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  lineItems: z.array(lineItemSchema).min(1),
  category: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Update service template schema
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
  category: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * GET /api/service-templates
 * List service templates for the organization
 */
router.get('/', asyncHandler(async (req, res) => {
  const { page, perPage, sortOrder } = paginationSchema.parse(req.query);
  const orgId = req.auth!.organizationId;

  // Optional filters
  const category = req.query.category as string | undefined;
  const active = req.query.active as string | undefined;

  // Build where clause
  const where: Record<string, unknown> = { organizationId: orgId };

  if (category) {
    where.category = category;
  }

  // Default to only active templates unless explicitly requested
  if (active === 'false') {
    where.isActive = false;
  } else if (active !== 'all') {
    where.isActive = true;
  }

  const [templates, total] = await Promise.all([
    prisma.serviceTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.serviceTemplate.count({ where }),
  ]);

  sendPaginated(res, templates, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

/**
 * GET /api/service-templates/categories
 * List distinct categories for the organization
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;

  const templates = await prisma.serviceTemplate.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { category: true },
    distinct: ['category'],
  });

  const categories = templates
    .map((t) => t.category)
    .filter((c): c is string => c !== null)
    .sort();

  sendSuccess(res, categories);
}));

/**
 * GET /api/service-templates/:id
 * Get a single service template
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const template = await prisma.serviceTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    return errors.notFound(res, 'Service template');
  }

  sendSuccess(res, template);
}));

/**
 * POST /api/service-templates
 * Create a new service template
 */
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const data = createTemplateSchema.parse(req.body);

  // Validate line items totals
  const lineItems = data.lineItems as LineItem[];
  for (const item of lineItems) {
    const expectedTotal = item.quantity * item.unitPrice;
    if (Math.abs(item.total - expectedTotal) > 1) {
      // Allow 1 cent rounding
      return errors.validation(res, `Line item total mismatch for "${item.description}": expected ${expectedTotal}, got ${item.total}`);
    }
  }

  // Check for duplicate name
  const existing = await prisma.serviceTemplate.findUnique({
    where: {
      organizationId_name: {
        organizationId: orgId,
        name: data.name,
      },
    },
  });

  if (existing) {
    return sendError(res, ErrorCodes.DUPLICATE_ENTRY, 'A template with this name already exists', 409);
  }

  const template = await prisma.serviceTemplate.create({
    data: {
      organizationId: orgId,
      name: data.name,
      description: data.description,
      lineItems: data.lineItems,
      category: data.category,
      sortOrder: data.sortOrder ?? 0,
    },
  });

  logger.info('Service template created', {
    templateId: template.id,
    name: template.name,
  });

  sendSuccess(res, template, 201);
}));

/**
 * PATCH /api/service-templates/:id
 * Update a service template
 */
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = updateTemplateSchema.parse(req.body);

  // Verify template exists and belongs to org
  const template = await prisma.serviceTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    return errors.notFound(res, 'Service template');
  }

  // Check for duplicate name if name is being changed
  if (data.name && data.name !== template.name) {
    const existing = await prisma.serviceTemplate.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: data.name,
        },
      },
    });

    if (existing) {
      return sendError(res, ErrorCodes.DUPLICATE_ENTRY, 'A template with this name already exists', 409);
    }
  }

  // Validate line items if provided
  if (data.lineItems) {
    const lineItems = data.lineItems as LineItem[];
    for (const item of lineItems) {
      const expectedTotal = item.quantity * item.unitPrice;
      if (Math.abs(item.total - expectedTotal) > 1) {
        return errors.validation(res, `Line item total mismatch for "${item.description}": expected ${expectedTotal}, got ${item.total}`);
      }
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.lineItems !== undefined) updateData.lineItems = data.lineItems;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const updated = await prisma.serviceTemplate.update({
    where: { id },
    data: updateData,
  });

  logger.info('Service template updated', { templateId: id });

  sendSuccess(res, updated);
}));

/**
 * DELETE /api/service-templates/:id
 * Soft delete a service template (sets isActive to false)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  // Verify template exists and belongs to org
  const template = await prisma.serviceTemplate.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!template) {
    return errors.notFound(res, 'Service template');
  }

  // Soft delete by setting isActive to false
  await prisma.serviceTemplate.update({
    where: { id },
    data: { isActive: false },
  });

  logger.info('Service template deleted (soft)', { templateId: id });

  sendSuccess(res, { deleted: true });
}));

export default router;
