/**
 * Event Handlers Index
 *
 * Registers all event handlers on startup
 */

import { registerMissedCallHandler } from './missed-call';
import { registerReviewRequestHandler } from './review-request';

/**
 * Register all event handlers
 * Called on server startup
 */
export function registerAllHandlers(): void {
  console.log('📡 Registering event handlers...');

  registerMissedCallHandler();
  registerReviewRequestHandler();

  // Future handlers will be registered here:
  // registerEstimateFollowupHandler();
  // registerAppointmentReminderHandler();
  // registerPaymentReminderHandler();

  console.log('📡 All event handlers registered');
}

export { registerMissedCallHandler, registerReviewRequestHandler };
