import { Router } from 'express';
import { prisma, Prisma } from '@serviceflow/database';
import { createCustomerSchema, updateCustomerSchema, customerPaginationSchema } from '@serviceflow/shared';
import { asyncHandler, sendSuccess, sendPaginated, sendError, errors, ErrorCodes } from '../utils/api-response';

const router = Router();

// GET /api/customers - List customers
router.get('/', asyncHandler(async (req, res) => {
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

  sendPaginated(res, customers, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}));

// GET /api/customers/:id - Get single customer
router.get('/:id', asyncHandler(async (req, res) => {
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
    return errors.notFound(res, 'Customer');
  }

  sendSuccess(res, customer);
}));

// POST /api/customers - Create customer
router.post('/', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const data = createCustomerSchema.parse(req.body);

  try {
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

    sendSuccess(res, customer, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return sendError(res, ErrorCodes.DUPLICATE_ENTRY, 'Customer with this phone already exists', 409);
    }
    throw error;
  }
}));

// PATCH /api/customers/:id - Update customer
router.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;
  const data = updateCustomerSchema.parse(req.body);

  const customer = await prisma.customer.updateMany({
    where: { id, organizationId: orgId },
    data,
  });

  if (customer.count === 0) {
    return errors.notFound(res, 'Customer');
  }

  const updated = await prisma.customer.findUnique({ where: { id } });
  sendSuccess(res, updated);
}));

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orgId = req.auth!.organizationId;

  const customer = await prisma.customer.deleteMany({
    where: { id, organizationId: orgId },
  });

  if (customer.count === 0) {
    return errors.notFound(res, 'Customer');
  }

  sendSuccess(res, { deleted: true });
}));

export default router;
