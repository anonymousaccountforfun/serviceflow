import 'dotenv/config';

// Initialize Sentry early, before other imports
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler, captureException } from './lib/sentry';
initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Validate environment variables at startup
import { initEnv } from './config/env';
initEnv();

// Middleware
import { requireAuth, optionalAuth } from './middleware/auth';
import { generalLimiter, strictLimiter, webhookLimiter } from './middleware/rate-limit';
import { requestLogger, logger } from './lib/logger';

// Routes
import healthRoutes from './routes/health';
import webhookRoutes from './webhooks';
import customerRoutes from './routes/customers';
import jobRoutes from './routes/jobs';
import conversationRoutes from './routes/conversations';
import reviewRoutes from './routes/reviews';
import analyticsRoutes from './routes/analytics';
import appointmentRoutes from './routes/appointments';
import calendarRoutes from './routes/calendar';
import googleRoutes from './routes/google';
import phoneNumberRoutes from './routes/phone-numbers';
import estimateRoutes from './routes/estimates';
import invoiceRoutes from './routes/invoices';
import templateRoutes from './routes/templates';
import technicianRoutes from './routes/technician';
import teamRoutes from './routes/team';
import jobCompletionRoutes from './routes/job-completion';
import pushRoutes from './routes/push';
import aiRoutes from './routes/ai';
import billingRoutes from './routes/billing';
import paymentRoutes from './routes/payments';
import serviceTemplateRoutes from './routes/service-templates';
import onboardingRoutes from './routes/onboarding';
import cronRoutes from './routes/cron';
import shareRoutes from './routes/share';
import rescheduleRoutes from './routes/reschedule';

// Event handlers
import { registerAllHandlers } from './handlers';

// Services
import { smsQueue } from './services/sms-queue';
import { jobQueue } from './services/job-queue';

const app = express();
const PORT = process.env.PORT || 3001;

// Register event handlers
registerAllHandlers();

// Start queue processors (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  smsQueue.start();
  jobQueue.start();
}

// Sentry request handling (must be first)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Use structured logging in production, morgan in development
if (process.env.NODE_ENV === 'production') {
  app.use(requestLogger);
} else {
  app.use(morgan('dev'));
  app.use(requestLogger);
}

// Webhooks need raw body for signature verification (Twilio uses application/x-www-form-urlencoded)
// Higher rate limit for webhooks from trusted providers
app.use('/webhooks', webhookLimiter, express.raw({ type: '*/*' }), webhookRoutes);

// Regular JSON parsing for other routes
app.use(express.json());

// Public routes (no auth required)
app.use('/health', healthRoutes);

// Public review link (short URL for SMS) - strict rate limiting, no auth
app.use('/r', strictLimiter, reviewRoutes);

// Protected API routes - require authentication with general rate limiting
app.use('/api/customers', generalLimiter, requireAuth, customerRoutes);
app.use('/api/jobs', generalLimiter, requireAuth, jobRoutes);
app.use('/api/conversations', generalLimiter, requireAuth, conversationRoutes);
app.use('/api/reviews', generalLimiter, requireAuth, reviewRoutes);
app.use('/api/analytics', generalLimiter, requireAuth, analyticsRoutes);
app.use('/api/appointments', generalLimiter, requireAuth, appointmentRoutes);
app.use('/api/calendar', generalLimiter, requireAuth, calendarRoutes);
app.use('/api/google', generalLimiter, requireAuth, googleRoutes);
app.use('/api/phone-numbers', generalLimiter, requireAuth, phoneNumberRoutes);
app.use('/api/estimates', generalLimiter, requireAuth, estimateRoutes);
app.use('/api/invoices', generalLimiter, requireAuth, invoiceRoutes);
app.use('/api/templates', generalLimiter, requireAuth, templateRoutes);
app.use('/api/technician', generalLimiter, requireAuth, technicianRoutes);
app.use('/api/team', generalLimiter, requireAuth, teamRoutes);
app.use('/api/jobs', generalLimiter, requireAuth, jobCompletionRoutes); // Job completion extends jobs routes
app.use('/api/push', generalLimiter, requireAuth, pushRoutes);
app.use('/api/ai', generalLimiter, requireAuth, aiRoutes);
app.use('/api/billing', generalLimiter, requireAuth, billingRoutes);
app.use('/api/service-templates', generalLimiter, requireAuth, serviceTemplateRoutes);
app.use('/api/onboarding', generalLimiter, requireAuth, onboardingRoutes);

// Public payment routes (for customers paying invoices - no auth required)
app.use('/api/payments', generalLimiter, paymentRoutes);

// Cron routes (protected by CRON_SECRET, not user auth)
app.use('/api/cron', generalLimiter, cronRoutes);

// Share routes (public read, authenticated create/delete)
app.use('/api/share', generalLimiter, shareRoutes);

// Reschedule routes (public - validated by token)
app.use('/api/reschedule', generalLimiter, rescheduleRoutes);

// Sentry error handler (must be before custom error handler)
app.use(sentryErrorHandler());

// Custom error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Capture error for tracking (Sentry handler already captured, this is for logging)
  captureException(err, {
    path: req.path,
    method: req.method,
    userId: req.auth?.userId,
    organizationId: req.auth?.organizationId,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'E9001',
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    },
  });
});

// Start server (only when not running on Vercel or in test mode)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info('API server running', { port: PORT, environment: process.env.NODE_ENV || 'development' });
  });
}

export default app;
