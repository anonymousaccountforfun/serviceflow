import { Request, Response, NextFunction } from 'express';
import { createClerkClient } from '@clerk/backend';
import { prisma } from '@serviceflow/database';

// Extend Express Request type to include auth context
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        clerkId: string;
        organizationId: string;
        user: {
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          role: string;
        };
        organization: {
          id: string;
          name: string;
          subscriptionTier: string;
          subscriptionStatus: string;
        };
      };
    }
  }
}

// Initialize Clerk client
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Authentication middleware that validates Clerk JWT and attaches user/org to request
 *
 * Usage:
 *   app.use('/api', requireAuth, routes);
 *   // or for specific routes:
 *   router.get('/protected', requireAuth, handler);
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1001',
          message: 'Missing or invalid authorization header',
        },
      });
    }

    const token = authHeader.substring(7);

    // Verify the JWT with Clerk
    let clerkId: string;
    try {
      const payload = await clerk.verifyToken(token);
      clerkId = payload.sub;
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1002',
          message: 'Invalid or expired token',
        },
      });
    }

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1003',
          message: 'User not found. Please complete registration.',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1004',
          message: 'User account is deactivated',
        },
      });
    }

    // Validate organization header if present
    // This prevents users from attempting to access other organizations' data
    const orgHeader = req.headers['x-organization-id'] as string | undefined;
    if (orgHeader && orgHeader !== user.organizationId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1009',
          message: 'Organization access denied',
        },
      });
    }

    // Attach auth context to request
    req.auth = {
      userId: user.id,
      clerkId: user.clerkId,
      organizationId: user.organizationId,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: user.organization,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'E1099',
        message: 'Authentication error',
      },
    });
  }
}

/**
 * Optional authentication middleware - attaches user if token present, but doesn't require it
 * Useful for routes that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header - continue without auth context
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = await clerk.verifyToken(token);
      const clerkId = payload.sub;

      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              subscriptionTier: true,
              subscriptionStatus: true,
            },
          },
        },
      });

      if (user && user.isActive) {
        req.auth = {
          userId: user.id,
          clerkId: user.clerkId,
          organizationId: user.organizationId,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          organization: user.organization,
        };
      }
    } catch (error) {
      // Token invalid - continue without auth context
      console.warn('Optional auth token invalid:', error);
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}

/**
 * Role-based authorization middleware
 * Use after requireAuth to check user role
 *
 * Usage:
 *   router.delete('/admin-only', requireAuth, requireRole('owner', 'admin'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(req.auth.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1006',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
}

/**
 * Subscription tier check middleware
 * Use after requireAuth to ensure user has required subscription tier
 *
 * Usage:
 *   router.post('/premium-feature', requireAuth, requireTier('growth', 'scale'), handler);
 */
export function requireTier(...allowedTiers: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'E1005',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedTiers.includes(req.auth.organization.subscriptionTier)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1007',
          message: 'This feature requires a higher subscription tier',
          requiredTiers: allowedTiers,
          currentTier: req.auth.organization.subscriptionTier,
        },
      });
    }

    // Also check subscription status
    if (req.auth.organization.subscriptionStatus === 'canceled') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'E1008',
          message: 'Subscription is canceled. Please reactivate to use this feature.',
        },
      });
    }

    next();
  };
}
