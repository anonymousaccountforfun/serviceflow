/**
 * Rate Limiting Middleware
 *
 * Protects against abuse and DoS attacks with configurable rate limits
 * for different endpoint types.
 *
 * Implements multiple limiting strategies:
 * - IP-based limiting (default)
 * - User-based limiting (for authenticated endpoints)
 * - Resource-based limiting (for specific IDs like invoices)
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Standard error response for rate limit exceeded
 */
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'E4290',
      message: 'Too many requests. Please try again later.',
    },
  });
};

/**
 * General API rate limiter
 * 100 requests per minute per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for public endpoints
 * 10 requests per minute per IP
 * Used for: review submissions, public forms
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Very strict rate limiter for sensitive actions
 * 5 requests per 15 minutes per IP
 * Used for: review submissions, password resets, etc.
 */
export const reviewSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'E4291',
        message: 'Too many review submissions. Please try again in a few minutes.',
      },
    });
  },
  // Key by IP + review request ID to prevent abuse of specific review links
  keyGenerator: (req) => {
    const reviewId = req.params.id || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}-${reviewId}`;
  },
});

/**
 * Auth endpoint rate limiter
 * 20 requests per minute per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'E4292',
        message: 'Too many authentication attempts. Please try again later.',
      },
    });
  },
});

/**
 * Webhook rate limiter
 * 200 requests per minute per IP
 * Higher limit for webhook providers (Twilio, Stripe, etc.)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Public invoice payment rate limiter
 * 20 requests per minute per IP + invoice ID combination
 * Stricter than general limiter since these are unauthenticated endpoints
 * that rely on UUID unpredictability for security
 */
export const invoicePaymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'E4293',
        message: 'Too many payment requests. Please try again in a minute.',
      },
    });
  },
  // Key by IP + invoice ID to prevent enumeration attacks
  keyGenerator: (req) => {
    const invoiceId = req.params.id || 'unknown';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `invoice-${ip}-${invoiceId}`;
  },
});

/**
 * Per-user rate limiter for authenticated endpoints
 * 200 requests per minute per user (falls back to IP if not authenticated)
 * Prevents abuse from authenticated users sharing corporate IPs
 */
export const userLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = (req as any).auth?.userId;
    if (userId) {
      return `user-${userId}`;
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Combined IP + User rate limiter
 * Applies both IP-based and user-based limits
 * Use this for sensitive authenticated endpoints
 */
export const combinedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    const userId = (req as any).auth?.userId;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    // Combine both to limit per-user AND per-IP
    return userId ? `combined-${ip}-${userId}` : `combined-${ip}`;
  },
});
