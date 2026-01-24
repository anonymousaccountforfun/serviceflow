import { Router, json } from 'express';
import twilioWebhooks from './twilio';
import vapiWebhooks from './vapi';

const router = Router();

// Twilio uses x-www-form-urlencoded (handled by raw body parsing in main app)
router.use('/twilio', twilioWebhooks);

// Vapi uses JSON - need to parse it here since main app uses raw for /webhooks
router.use('/vapi', json(), vapiWebhooks);

export default router;
