/**
 * Service Templates API Routes
 *
 * CRUD operations for pre-built service templates that speed up
 * estimate and invoice creation.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@serviceflow/database';
import { paginationSchema } from '@serviceflow/shared';
import { z } from 'zod';
import { logger } from '../lib/logger';

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
router.get('/', async (req: Request, res: Response) => {
  try {
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

    res.json({
      success: true,
      data: templates,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    logger.error('Error listing service templates', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list service templates' },
    });
  }
});

/**
 * GET /api/service-templates/categories
 * List distinct categories for the organization
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
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

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error('Error listing categories', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list categories' },
    });
  }
});

/**
 * GET /api/service-templates/:id
 * Get a single service template
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const template = await prisma.serviceTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Service template not found' },
      });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Error getting service template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get service template' },
    });
  }
});

/**
 * POST /api/service-templates
 * Create a new service template
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = createTemplateSchema.parse(req.body);

    // Validate line items totals
    const lineItems = data.lineItems as LineItem[];
    for (const item of lineItems) {
      const expectedTotal = item.quantity * item.unitPrice;
      if (Math.abs(item.total - expectedTotal) > 1) {
        // Allow 1 cent rounding
        return res.status(400).json({
          success: false,
          error: {
            code: 'E2001',
            message: `Line item total mismatch for "${item.description}": expected ${expectedTotal}, got ${item.total}`,
          },
        });
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'E4001',
          message: 'A template with this name already exists',
        },
      });
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

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    logger.error('Error creating service template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to create service template' },
    });
  }
});

/**
 * PATCH /api/service-templates/:id
 * Update a service template
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = updateTemplateSchema.parse(req.body);

    // Verify template exists and belongs to org
    const template = await prisma.serviceTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Service template not found' },
      });
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
        return res.status(400).json({
          success: false,
          error: {
            code: 'E4001',
            message: 'A template with this name already exists',
          },
        });
      }
    }

    // Validate line items if provided
    if (data.lineItems) {
      const lineItems = data.lineItems as LineItem[];
      for (const item of lineItems) {
        const expectedTotal = item.quantity * item.unitPrice;
        if (Math.abs(item.total - expectedTotal) > 1) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'E2001',
              message: `Line item total mismatch for "${item.description}": expected ${expectedTotal}, got ${item.total}`,
            },
          });
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

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating service template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update service template' },
    });
  }
});

/**
 * DELETE /api/service-templates/:id
 * Soft delete a service template (sets isActive to false)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    // Verify template exists and belongs to org
    const template = await prisma.serviceTemplate.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Service template not found' },
      });
    }

    // Soft delete by setting isActive to false
    await prisma.serviceTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Service template deleted (soft)', { templateId: id });

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error('Error deleting service template', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to delete service template' },
    });
  }
});

export default router;
