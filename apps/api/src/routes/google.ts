import { Router } from 'express';
import { gbp, GoogleAuthError } from '../services/google';
import { asyncHandler, sendSuccess, sendError, errors, ErrorCodes } from '../utils/api-response';

const router = Router();

// GET /api/google/status - Check connection status
router.get('/status', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const status = await gbp.getStatus(orgId);
  sendSuccess(res, status);
}));

// GET /api/google/connect - Get OAuth URL to connect Google account
router.get('/connect', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const authUrl = gbp.getAuthUrl(orgId);
  sendSuccess(res, { authUrl });
}));

// GET /api/google/callback - OAuth callback handler
router.get('/callback', asyncHandler(async (req, res) => {
  const { code, state: orgId, error } = req.query;

  if (error) {
    // User denied access or other error
    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/integrations?error=${error}`);
  }

  if (!code || !orgId) {
    return errors.validation(res, 'Missing authorization code or organization ID');
  }

  // Exchange code for tokens
  const tokens = await gbp.exchangeCodeForTokens(code as string);

  // Save credentials
  await gbp.saveCredentials(orgId as string, tokens);

  // Redirect to settings page with success
  res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/integrations?google=connected`);
}));

// GET /api/google/accounts - List GBP accounts
router.get('/accounts', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;

  try {
    const accounts = await gbp.listAccounts(orgId);
    sendSuccess(res, accounts);
  } catch (error) {
    // Handle re-authentication required
    if (error instanceof GoogleAuthError && error.code === 'REAUTH_REQUIRED') {
      return sendError(res, 'E4010', error.message, 401, { requiresReauth: true });
    }
    throw error;
  }
}));

// GET /api/google/accounts/:accountId/locations - List locations for an account
router.get('/accounts/:accountId/locations', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { accountId } = req.params;
  const locations = await gbp.listLocations(orgId, accountId);
  sendSuccess(res, locations);
}));

// POST /api/google/locations/select - Select a location to sync
router.post('/locations/select', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { accountId, locationId, locationName } = req.body;

  if (!accountId || !locationId) {
    return errors.validation(res, 'accountId and locationId are required');
  }

  await gbp.selectLocation(orgId, accountId, locationId, locationName);
  sendSuccess(res, { selected: true });
}));

// GET /api/google/reviews - Get Google reviews
router.get('/reviews', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const reviews = await gbp.getReviews(orgId);
  sendSuccess(res, reviews);
}));

// POST /api/google/reviews/sync - Sync reviews from Google
router.post('/reviews/sync', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const result = await gbp.syncReviews(orgId);
  sendSuccess(res, {
    imported: result.imported,
    updated: result.updated,
    message: `Imported ${result.imported} new reviews, updated ${result.updated} existing reviews`,
  });
}));

// POST /api/google/reviews/:reviewId/reply - Reply to a review
router.post('/reviews/:reviewId/reply', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  const { reviewId } = req.params;
  const { comment } = req.body;

  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return errors.validation(res, 'Reply comment is required');
  }

  await gbp.replyToReview(orgId, reviewId, comment.trim());
  sendSuccess(res, { replied: true });
}));

// DELETE /api/google/disconnect - Disconnect Google account
router.delete('/disconnect', asyncHandler(async (req, res) => {
  const orgId = req.auth!.organizationId;
  await gbp.disconnect(orgId);
  sendSuccess(res, { disconnected: true });
}));

export default router;
