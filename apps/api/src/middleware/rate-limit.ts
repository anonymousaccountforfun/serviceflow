/**
 * Rate Limiting Middleware
 *
 * Protects against abuse and DoS attacks with configurable rate limits
 * for different endpoint types.
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
