import { prisma } from '@serviceflow/database';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback';

// Google API endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GBP_API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_ACCOUNTS_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';

// Required scopes for Google Business Profile
const GBP_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GBPAccount {
  name: string;
  accountName: string;
  type: string;
  role: string;
  state: { status: string };
}

interface GBPLocation {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
  };
  phoneNumbers?: { primaryPhone: string };
  websiteUri?: string;
}

interface GBPReview {
  name: string;
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

class GoogleBusinessProfileService {
  /**
   * Generate OAuth URL for connecting Google account
   */
  getAuthUrl(organizationId: string): string {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth not configured');
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: GBP_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: organizationId, // Pass org ID through OAuth flow
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth not configured');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth not configured');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getValidAccessToken(organizationId: string): Promise<string> {
    const credential = await prisma.googleCredential.findUnique({
      where: { organizationId },
    });

    if (!credential) {
      throw new Error('Google account not connected');
    }

    // Check if token is expired (with 5 min buffer)
    const now = new Date();
    const expiresAt = new Date(credential.tokenExpiresAt);
    const bufferMs = 5 * 60 * 1000;

    if (now.getTime() + bufferMs >= expiresAt.getTime()) {
      // Token expired, refresh it
      const tokens = await this.refreshAccessToken(credential.refreshToken);

      await prisma.googleCredential.update({
        where: { organizationId },
        data: {
          accessToken: tokens.access_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return tokens.access_token;
    }

    return credential.accessToken;
  }

  /**
   * Save OAuth credentials after successful authorization
   */
  async saveCredentials(
    organizationId: string,
    tokens: GoogleTokenResponse
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.googleCredential.upsert({
      where: { organizationId },
      create: {
        organizationId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        tokenExpiresAt: expiresAt,
        scopes: tokens.scope.split(' '),
        syncStatus: 'pending',
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt: expiresAt,
        scopes: tokens.scope.split(' '),
        syncStatus: 'pending',
        syncError: null,
      },
    });
  }

  /**
   * List GBP accounts for the connected Google account
   */
  async listAccounts(organizationId: string): Promise<GBPAccount[]> {
    const accessToken = await this.getValidAccessToken(organizationId);

    const response = await fetch(`${GBP_ACCOUNTS_API}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list accounts: ${error}`);
    }

    const data = await response.json() as { accounts?: GBPAccount[] };
    return data.accounts || [];
  }

  /**
   * List locations for a GBP account
   */
  async listLocations(organizationId: string, accountId: string): Promise<GBPLocation[]> {
    const accessToken = await this.getValidAccessToken(organizationId);

    const response = await fetch(
      `${GBP_API_BASE}/accounts/${accountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list locations: ${error}`);
    }

    const data = await response.json() as { locations?: GBPLocation[] };
    return data.locations || [];
  }

  /**
   * Select a location to sync with this organization
   */
  async selectLocation(
    organizationId: string,
    accountId: string,
    locationId: string,
    locationName: string
  ): Promise<void> {
    await prisma.googleCredential.update({
      where: { organizationId },
      data: {
        accountId,
        locationId,
        locationName,
        syncStatus: 'pending',
      },
    });
  }

  /**
   * Get reviews for the connected location
   */
  async getReviews(organizationId: string): Promise<GBPReview[]> {
    const credential = await prisma.googleCredential.findUnique({
      where: { organizationId },
    });

    if (!credential?.accountId || !credential?.locationId) {
      throw new Error('No location selected');
    }

    const accessToken = await this.getValidAccessToken(organizationId);

    // GBP Reviews API endpoint
    const reviewsUrl = `https://mybusiness.googleapis.com/v4/accounts/${credential.accountId}/locations/${credential.locationId}/reviews`;

    const response = await fetch(reviewsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get reviews: ${error}`);
    }

    const data = await response.json() as { reviews?: GBPReview[] };
    return data.reviews || [];
  }

  /**
   * Sync reviews from Google to local database
   */
  async syncReviews(organizationId: string): Promise<{ imported: number; updated: number }> {
    const credential = await prisma.googleCredential.findUnique({
      where: { organizationId },
    });

    if (!credential) {
      throw new Error('Google account not connected');
    }

    if (!credential.accountId || !credential.locationId) {
      throw new Error('No Google Business Profile location selected');
    }

    await prisma.googleCredential.update({
      where: { organizationId },
      data: { syncStatus: 'syncing' },
    });

    try {
      const reviews = await this.getReviews(organizationId);
      let imported = 0;
      let updated = 0;

      for (const review of reviews) {
        const rating = this.starRatingToNumber(review.starRating);
        const externalId = review.reviewId;

        const existing = await prisma.review.findFirst({
          where: { organizationId, platform: 'google', externalId },
        });

        if (existing) {
          // Update existing review
          await prisma.review.update({
            where: { id: existing.id },
            data: {
              rating,
              content: review.comment,
              reviewerName: review.reviewer.displayName,
              response: review.reviewReply?.comment,
              respondedAt: review.reviewReply ? new Date(review.reviewReply.updateTime) : null,
            },
          });
          updated++;
        } else {
          // Create new review
          await prisma.review.create({
            data: {
              organizationId,
              platform: 'google',
              externalId,
              rating,
              content: review.comment,
              reviewerName: review.reviewer.displayName,
              response: review.reviewReply?.comment,
              respondedAt: review.reviewReply ? new Date(review.reviewReply.updateTime) : null,
              createdAt: new Date(review.createTime),
            },
          });
          imported++;
        }
      }

      await prisma.googleCredential.update({
        where: { organizationId },
        data: {
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      return { imported, updated };
    } catch (error) {
      await prisma.googleCredential.update({
        where: { organizationId },
        data: {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  /**
   * Reply to a Google review
   */
  async replyToReview(
    organizationId: string,
    reviewId: string,
    comment: string
  ): Promise<void> {
    const credential = await prisma.googleCredential.findUnique({
      where: { organizationId },
    });

    if (!credential?.accountId || !credential?.locationId) {
      throw new Error('No location selected');
    }

    const accessToken = await this.getValidAccessToken(organizationId);

    // Find the review to get the external ID
    const review = await prisma.review.findFirst({
      where: { organizationId, id: reviewId, platform: 'google' },
    });

    if (!review?.externalId) {
      throw new Error('Review not found or not a Google review');
    }

    const replyUrl = `https://mybusiness.googleapis.com/v4/accounts/${credential.accountId}/locations/${credential.locationId}/reviews/${review.externalId}/reply`;

    const response = await fetch(replyUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to reply to review: ${error}`);
    }

    // Update local record
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        response: comment,
        respondedAt: new Date(),
      },
    });
  }

  /**
   * Disconnect Google account
   */
  async disconnect(organizationId: string): Promise<void> {
    await prisma.googleCredential.delete({
      where: { organizationId },
    });
  }

  /**
   * Get connection status
   */
  async getStatus(organizationId: string): Promise<{
    connected: boolean;
    locationName?: string;
    lastSyncAt?: Date;
    syncStatus?: string;
    syncError?: string;
  }> {
    const credential = await prisma.googleCredential.findUnique({
      where: { organizationId },
      select: {
        locationName: true,
        lastSyncAt: true,
        syncStatus: true,
        syncError: true,
      },
    });

    if (!credential) {
      return { connected: false };
    }

    return {
      connected: true,
      locationName: credential.locationName || undefined,
      lastSyncAt: credential.lastSyncAt || undefined,
      syncStatus: credential.syncStatus,
      syncError: credential.syncError || undefined,
    };
  }

  /**
   * Convert Google star rating to number
   */
  private starRatingToNumber(rating: string): number {
    const ratings: Record<string, number> = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };
    return ratings[rating] || 0;
  }
}

export const gbp = new GoogleBusinessProfileService();
