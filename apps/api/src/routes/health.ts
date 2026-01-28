import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { asyncHandler } from '../utils/api-response';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running',
      },
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'running',
      },
    });
  }
}));

export default router;
