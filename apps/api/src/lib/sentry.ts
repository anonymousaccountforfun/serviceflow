/**
 * Sentry Error Tracking Integration
 *
 * This module provides error tracking for the API server.
 * Initialize early in the app lifecycle before other imports.
 *
 * Required environment variables:
 * - SENTRY_DSN: Your Sentry project DSN
 * - NODE_ENV: Environment name (development, staging, production)
 */

import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';
import { logger } from './logger';

let initialized = false;

/**
 * Initialize Sentry error tracking
 * Should be called early in app startup, before other imports
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('SENTRY_DSN not configured - error tracking disabled');
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || 'unknown',

      // Sample rate for performance monitoring (0-1)
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Don't send PII by default
      sendDefaultPii: false,

      // Filter sensitive data from events
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }

        // Remove sensitive data from request body
        if (event.request?.data) {
          const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
          for (const field of sensitiveFields) {
            if (typeof event.request.data === 'object' && field in event.request.data) {
              event.request.data[field] = '[REDACTED]';
            }
          }
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Network errors that aren't actionable
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        // Client-side errors
        'ERR_INTERNET_DISCONNECTED',
      ],

      // Integration options
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
    });

    initialized = true;
    logger.info('Sentry error tracking initialized', { environment: process.env.NODE_ENV });
  } catch (error) {
    logger.error('Failed to initialize Sentry', error);
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return initialized;
}

/**
 * Add Sentry request handler middleware
 * Should be added early in the middleware chain
 * Note: In Sentry v8, request handling is automatic via expressIntegration
 */
export function sentryRequestHandler() {
  // In Sentry v8, expressIntegration handles request instrumentation automatically
  return (req: Request, res: Response, next: NextFunction) => next();
}

/**
 * Add Sentry tracing middleware
 * Should be added early in the middleware chain
 * Note: In Sentry v8, tracing is automatic via httpIntegration
 */
export function sentryTracingHandler() {
  // In Sentry v8, httpIntegration handles tracing automatically
  return (req: Request, res: Response, next: NextFunction) => next();
}

/**
 * Add Sentry error handler middleware
 * Should be added after all routes but before custom error handlers
 */
export function sentryErrorHandler() {
  if (!initialized) {
    return (err: Error, req: Request, res: Response, next: NextFunction) => next(err);
  }
  // In Sentry v8, use setupExpressErrorHandler approach
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Only capture 4xx and 5xx errors
    const statusCode = 'statusCode' in err ? (err as any).statusCode : 500;
    if (statusCode >= 400) {
      Sentry.captureException(err);
    }
    next(err);
  };
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>): string | undefined {
  if (!initialized) {
    logger.error('Error captured (Sentry disabled)', error, context);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): string | undefined {
  if (!initialized) {
    logger.info(`Message captured (Sentry disabled): ${message}`);
    return undefined;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; organizationId?: string }): void {
  if (!initialized) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Custom attributes
    organizationId: user.organizationId,
  } as Sentry.User & { organizationId?: string });
}

/**
 * Clear user context (on logout)
 */
export function clearUser(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}

/**
 * Set extra context for the current scope
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.setContext(name, context);
}

/**
 * Add a breadcrumb for the current scope
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  if (!initialized) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Span | undefined {
  if (!initialized) return undefined;
  return Sentry.startInactiveSpan({ name, op });
}

export { Sentry };
