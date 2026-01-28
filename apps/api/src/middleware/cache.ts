/**
 * Cache Control Middleware
 *
 * Adds appropriate Cache-Control headers to API responses.
 * Helps reduce redundant requests and improve perceived performance.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Cache durations in seconds
 */
export const CacheDuration = {
  /** No caching - for sensitive or frequently changing data */
  NONE: 0,
  /** Very short cache - 10 seconds (for real-time data) */
  VERY_SHORT: 10,
  /** Short cache - 30 seconds (for frequently updated lists) */
  SHORT: 30,
  /** Medium cache - 5 minutes (for moderately stable data) */
  MEDIUM: 300,
  /** Long cache - 1 hour (for rarely changing reference data) */
  LONG: 3600,
  /** Static cache - 24 hours (for static reference data) */
  STATIC: 86400,
} as const;

/**
 * Apply private caching (browser only, not CDN/proxy)
 * Use for user-specific data that shouldn't be shared
 */
export function privateCache(maxAge: number = CacheDuration.SHORT) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (maxAge === 0) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    }
    next();
  };
}

/**
 * Apply public caching (can be cached by CDN/proxy)
 * Use for non-sensitive, shared data
 */
export function publicCache(maxAge: number = CacheDuration.MEDIUM) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (maxAge === 0) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
    }
    next();
  };
}

/**
 * Disable caching entirely
 * Use for mutations, sensitive data, or real-time endpoints
 */
export function noCache() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  };
}

/**
 * Smart caching based on HTTP method
 * - GET/HEAD: Apply cache
 * - POST/PUT/PATCH/DELETE: No cache
 */
export function smartCache(maxAge: number = CacheDuration.SHORT) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    } else {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
    next();
  };
}

/**
 * Default API cache headers
 * Applies smart caching with short duration for authenticated endpoints
 */
export const defaultApiCache = smartCache(CacheDuration.SHORT);

/**
 * Cache configuration by route pattern
 * Used to automatically apply appropriate caching
 */
export const routeCacheConfig: Record<string, number> = {
  // Real-time data - no caching
  '/api/inbox': CacheDuration.NONE,
  '/api/notifications': CacheDuration.NONE,

  // Frequently updated - very short cache
  '/api/calendar': CacheDuration.VERY_SHORT,
  '/api/dashboard': CacheDuration.VERY_SHORT,

  // Lists - short cache
  '/api/jobs': CacheDuration.SHORT,
  '/api/customers': CacheDuration.SHORT,
  '/api/appointments': CacheDuration.SHORT,

  // Reference data - longer cache
  '/api/service-templates': CacheDuration.MEDIUM,
  '/api/users': CacheDuration.MEDIUM,

  // Static reference - long cache
  '/api/organization/settings': CacheDuration.LONG,
};

/**
 * Auto-configure cache based on route
 */
export function autoCacheByRoute() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next();
    }

    // Find matching route config
    const path = req.path;
    let maxAge: number = CacheDuration.SHORT; // Default

    for (const [pattern, duration] of Object.entries(routeCacheConfig)) {
      if (path.startsWith(pattern)) {
        maxAge = duration;
        break;
      }
    }

    if (maxAge === CacheDuration.NONE) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else {
      res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
    }

    next();
  };
}
