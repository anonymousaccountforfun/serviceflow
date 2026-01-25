/**
 * Structured Logger
 *
 * Provides structured JSON logging with:
 * - Request correlation IDs
 * - Organization/user context
 * - Log levels (debug, info, warn, error)
 * - Environment-based configuration
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Async local storage for request context
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

interface RequestContext {
  correlationId: string;
  organizationId?: string;
  userId?: string;
  path?: string;
  method?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  organizationId?: string;
  userId?: string;
  path?: string;
  method?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

// Log level priorities
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Get minimum log level from environment
function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const MIN_LOG_LEVEL = getMinLogLevel();

/**
 * Check if a log level should be logged based on minimum level
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * Get current request context from async local storage
 */
function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Format log entry as JSON
 */
function formatLog(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const context = getContext();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId: context?.correlationId,
    organizationId: context?.organizationId,
    userId: context?.userId,
    path: context?.path,
    method: context?.method,
    ...data,
  };

  // Clean undefined values
  Object.keys(entry).forEach((key) => {
    if (entry[key] === undefined) {
      delete entry[key];
    }
  });

  // In development, use pretty format
  if (process.env.NODE_ENV !== 'production') {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = levelColors[level];
    const prefix = context?.correlationId ? `[${context.correlationId.slice(0, 8)}] ` : '';
    return `${color}${level.toUpperCase().padEnd(5)}${reset} ${prefix}${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  }

  return JSON.stringify(entry);
}

/**
 * Logger with context-aware structured logging
 */
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, data));
    }
  },

  info: (message: string, data?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, data));
    }
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, data));
    }
  },

  error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      const errorData: Record<string, unknown> = { ...data };

      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        };
      } else if (error) {
        errorData.error = { message: String(error) };
      }

      console.error(formatLog('error', message, errorData));
    }
  },

  /**
   * Create a child logger with additional context
   */
  child: (context: Record<string, unknown>) => ({
    debug: (message: string, data?: Record<string, unknown>) =>
      logger.debug(message, { ...context, ...data }),
    info: (message: string, data?: Record<string, unknown>) =>
      logger.info(message, { ...context, ...data }),
    warn: (message: string, data?: Record<string, unknown>) =>
      logger.warn(message, { ...context, ...data }),
    error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) =>
      logger.error(message, error, { ...context, ...data }),
  }),
};

/**
 * Middleware to add correlation ID and request context
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  const startTime = Date.now();

  // Set correlation ID on response
  res.setHeader('x-correlation-id', correlationId);

  // Create request context
  const context: RequestContext = {
    correlationId,
    organizationId: req.auth?.organizationId,
    userId: req.auth?.userId,
    path: req.path,
    method: req.method,
  };

  // Run the rest of the request in async context
  asyncLocalStorage.run(context, () => {
    // Log request start
    logger.info(`${req.method} ${req.path}`, {
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level: LogLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger[level](`${req.method} ${req.path} ${res.statusCode}`, {
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  });
}

/**
 * Update context with auth info (call after auth middleware)
 */
export function updateLogContext(req: Request) {
  const store = asyncLocalStorage.getStore();
  if (store && req.auth) {
    store.organizationId = req.auth.organizationId;
    store.userId = req.auth.userId;
  }
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | undefined {
  return getContext()?.correlationId;
}

export default logger;
