/**
 * Event Handlers Index
 *
 * Registers all event handlers on startup
 */

import { registerMissedCallHandler } from './missed-call';
import { registerReviewRequestHandler } from './review-request';
import { registerSmsAIResponseHandler } from './sms-ai-response';
import { logger } from '../lib/logger';

/**
 * Register all event handlers
 * Called on server startup
 */
export function registerAllHandlers(): void {
  logger.info('Registering event handlers');

  registerMissedCallHandler();
  registerReviewRequestHandler();
  registerSmsAIResponseHandler();

  // Future handlers will be registered here:
  // registerEstimateFollowupHandler();
  // registerAppointmentReminderHandler();
  // registerPaymentReminderHandler();

  logger.info('All event handlers registered');
}

export { registerMissedCallHandler, registerReviewRequestHandler, registerSmsAIResponseHandler };
