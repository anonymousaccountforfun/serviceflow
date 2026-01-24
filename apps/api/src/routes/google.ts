import { Router } from 'express';
import { gbp } from '../services/google';

const router = Router();

// GET /api/google/status - Check connection status
router.get('/status', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const status = await gbp.getStatus(orgId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting Google status:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: 'Failed to get Google status' },
    });
  }
});

// GET /api/google/connect - Get OAuth URL to connect Google account
router.get('/connect', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const authUrl = gbp.getAuthUrl(orgId);
    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    console.error('Error generating auth URL:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: error instanceof Error ? error.message : 'Failed to generate auth URL' },
    });
  }
});

// GET /api/google/callback - OAuth callback handler
router.get('/callback', async (req, res) => {
  try {
    const { code, state: orgId, error } = req.query;

    if (error) {
      // User denied access or other error
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/integrations?error=${error}`);
    }

    if (!code || !orgId) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Missing authorization code or organization ID' },
      });
    }

    // Exchange code for tokens
    const tokens = await gbp.exchangeCodeForTokens(code as string);

    // Save credentials
    await gbp.saveCredentials(orgId as string, tokens);

    // Redirect to settings page with success
    res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/integrations?google=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error instanceof Error ? error.message : error);
    res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/integrations?error=auth_failed`);
  }
});

// GET /api/google/accounts - List GBP accounts
router.get('/accounts', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const accounts = await gbp.listAccounts(orgId);
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Error listing accounts:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: error instanceof Error ? error.message : 'Failed to list accounts' },
    });
  }
});

// GET /api/google/accounts/:accountId/locations - List locations for an account
router.get('/accounts/:accountId/locations', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const { accountId } = req.params;
    const locations = await gbp.listLocations(orgId, accountId);
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Error listing locations:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: error instanceof Error ? error.message : 'Failed to list locations' },
    });
  }
});

// POST /api/google/locations/select - Select a location to sync
router.post('/locations/select', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const { accountId, locationId, locationName } = req.body;

    if (!accountId || !locationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'accountId and locationId are required' },
      });
    }

    await gbp.selectLocation(orgId, accountId, locationId, locationName);
    res.json({ success: true, data: { selected: true } });
  } catch (error) {
    console.error('Error selecting location:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: 'Failed to select location' },
    });
  }
});

// GET /api/google/reviews - Get Google reviews
router.get('/reviews', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const reviews = await gbp.getReviews(orgId);
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error getting reviews:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: error instanceof Error ? error.message : 'Failed to get reviews' },
    });
  }
});

// POST /api/google/reviews/sync - Sync reviews from Google
router.post('/reviews/sync', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const result = await gbp.syncReviews(orgId);
    res.json({
      success: true,
      data: {
        imported: result.imported,
        updated: result.updated,
        message: `Imported ${result.imported} new reviews, updated ${result.updated} existing reviews`,
      },
    });
  } catch (error) {
    console.error('Error syncing reviews:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: error instanceof Error ? error.message : 'Failed to sync reviews' },
    });
  }
});

// POST /api/google/reviews/:reviewId/reply - Reply to a review
router.post('/reviews/:reviewId/reply', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'E2001', message: 'Reply comment is required' },
      });
    }

    await gbp.replyToReview(orgId, reviewId, comment.trim());
    res.json({ success: true, data: { replied: true } });
  } catch (error) {
    console.error('Error replying to review:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: error instanceof Error ? error.message : 'Failed to reply to review' },
    });
  }
});

// DELETE /api/google/disconnect - Disconnect Google account
router.delete('/disconnect', async (req, res) => {
  try {
    const orgId = req.headers['x-organization-id'] as string;
    await gbp.disconnect(orgId);
    res.json({ success: true, data: { disconnected: true } });
  } catch (error) {
    console.error('Error disconnecting:', error instanceof Error ? error.message : error);
    res.status(500).json({
      success: false,
      error: { code: 'E4004', message: 'Failed to disconnect Google account' },
    });
  }
});

export default router;
