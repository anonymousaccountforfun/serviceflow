/**
 * Simple Logger for Next.js
 *
 * Provides structured logging for API routes and server components.
 * In development, logs are formatted for readability.
 * In production, logs are JSON for parsing by log aggregators.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: unknown;
}

function formatMessage(level: LogLevel, message: string, data?: LogData): string {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'production') {
    // JSON format for production log aggregators
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...data,
    });
  }

  // Readable format for development
  const levelIcons: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  };

  const icon = levelIcons[level];
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `${icon} [${level.toUpperCase()}] ${message}${dataStr}`;
}

export const logger = {
  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatMessage('debug', message, data));
    }
  },

  info(message: string, data?: LogData): void {
    console.log(formatMessage('info', message, data));
  },

  warn(message: string, data?: LogData): void {
    console.warn(formatMessage('warn', message, data));
  },

  error(message: string, error?: unknown): void {
    const errorData: LogData = {};

    if (error instanceof Error) {
      errorData.errorName = error.name;
      errorData.errorMessage = error.message;
      if (process.env.NODE_ENV !== 'production') {
        errorData.stack = error.stack;
      }
    } else if (error !== undefined) {
      errorData.error = error;
    }

    console.error(formatMessage('error', message, errorData));
  },
};

export default logger;
