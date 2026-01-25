import { Router } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { createCustomerSchema, updateCustomerSchema, customerPaginationSchema } from '@serviceflow/shared';
import { logger } from '../lib/logger';

const router = Router();

// GET /api/customers - List customers
router.get('/', async (req, res) => {
  try {
    const { page, perPage, sortBy, sortOrder } = customerPaginationSchema.parse(req.query);
    const orgId = req.auth!.organizationId;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { organizationId: orgId },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.customer.count({ where: { organizationId: orgId } }),
    ]);

    res.json({
      success: true,
      data: customers,
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    logger.error('Error listing customers', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to list customers' },
    });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        jobs: { take: 5, orderBy: { createdAt: 'desc' } },
        conversations: { take: 5, orderBy: { lastMessageAt: 'desc' } },
        reviews: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Customer not found' },
      });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    logger.error('Error getting customer', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to get customer' },
    });
  }
});

// POST /api/customers - Create customer
router.post('/', async (req, res) => {
  try {
    const orgId = req.auth!.organizationId;
    const data = createCustomerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        organizationId: orgId,
        email: data.email,
        phone: data.phone,
        address: data.address,
        notes: data.notes,
        tags: data.tags,
        source: data.source || 'manual',
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'E3002', message: 'Customer with this phone already exists' },
      });
    }
    logger.error('Error creating customer', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to create customer' },
    });
  }
});

// PATCH /api/customers/:id - Update customer
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;
    const data = updateCustomerSchema.parse(req.body);

    const customer = await prisma.customer.updateMany({
      where: { id, organizationId: orgId },
      data,
    });

    if (customer.count === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Customer not found' },
      });
    }

    const updated = await prisma.customer.findUnique({ where: { id } });
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating customer', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to update customer' },
    });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.auth!.organizationId;

    const customer = await prisma.customer.deleteMany({
      where: { id, organizationId: orgId },
    });

    if (customer.count === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'E3001', message: 'Customer not found' },
      });
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('Error deleting customer', error);
    res.status(500).json({
      success: false,
      error: { code: 'E9001', message: 'Failed to delete customer' },
    });
  }
});

export default router;
