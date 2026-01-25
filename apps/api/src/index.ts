import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Middleware
import { requireAuth, optionalAuth } from './middleware/auth';

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

// Event handlers
import { registerAllHandlers } from './handlers';

const app = express();
const PORT = process.env.PORT || 3001;

// Register event handlers
registerAllHandlers();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));

// Webhooks need raw body for signature verification (Twilio uses application/x-www-form-urlencoded)
app.use('/webhooks', express.raw({ type: '*/*' }), webhookRoutes);

// Regular JSON parsing for other routes
app.use(express.json());

// Public routes (no auth required)
app.use('/health', healthRoutes);

// Public review link (short URL for SMS) - no auth
app.use('/r', reviewRoutes);

// Protected API routes - require authentication
app.use('/api/customers', requireAuth, customerRoutes);
app.use('/api/jobs', requireAuth, jobRoutes);
app.use('/api/conversations', requireAuth, conversationRoutes);
app.use('/api/reviews', requireAuth, reviewRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/appointments', requireAuth, appointmentRoutes);
app.use('/api/calendar', requireAuth, calendarRoutes);
app.use('/api/google', requireAuth, googleRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
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

// Start server (only when not running on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
