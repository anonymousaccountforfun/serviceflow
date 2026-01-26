import { Router, json } from 'express';
import twilioWebhooks from './twilio';
import vapiWebhooks from './vapi';
import stripeWebhooks from './stripe';

const router = Router();

// Twilio uses x-www-form-urlencoded (handled by raw body parsing in main app)
router.use('/twilio', twilioWebhooks);

// Vapi uses JSON - need to parse it here since main app uses raw for /webhooks
router.use('/vapi', json(), vapiWebhooks);

// Stripe needs raw body for signature verification (already handled by main app)
router.use('/stripe', stripeWebhooks);

export default router;
