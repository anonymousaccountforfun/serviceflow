import { Router } from 'express';
import { prisma } from '@serviceflow/database';
import { events } from '../services/events';
import { sms } from '../services/sms';
import { reviewSubmitLimiter } from '../middleware/rate-limit';
import { logger } from '../lib/logger';
import { asyncHandler, sendSuccess, errors } from '../utils/api-response';

const router = Router();

/**
 * Escape HTML entities to prevent XSS attacks
 */
function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * GET /r/:id - Review link landing page (public, no auth)
 * Tracks the click and redirects to Google review or shows feedback form
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reviewRequest = await prisma.reviewRequest.findUnique({
    where: { id },
    include: {
      organization: true,
      customer: true,
      job: true,
    },
  });

  if (!reviewRequest) {
    return res.status(404).send('Review request not found');
  }

  // Track the click atomically (only update if not already clicked)
  // Using updateMany with a condition prevents race conditions
  const clickUpdate = await prisma.reviewRequest.updateMany({
    where: {
      id,
      clickedAt: null, // Only update if not already clicked
    },
    data: {
      status: 'clicked',
      clickedAt: new Date(),
    },
  });

  // Only log if this was the first click (update actually happened)
  if (clickUpdate.count > 0) {
    logger.info('Review link clicked', { reviewRequestId: id });
  }

  // Get organization's Google review link from settings
  const settings = reviewRequest.organization.settings as Record<string, unknown>;
  const reviewSettings = settings?.reviewSettings as Record<string, unknown> | undefined;
  const googleReviewUrl = reviewSettings?.googleReviewUrl as string | undefined;

  // If organization has a Google review URL, redirect directly
  if (googleReviewUrl) {
    return res.redirect(googleReviewUrl);
  }

  // Otherwise, show a simple review landing page
  // Escape organization name to prevent XSS
  const orgName = escapeHtml(reviewRequest.organization.name);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Leave a Review - ${orgName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    h1 { color: #1a1a2e; margin-bottom: 8px; font-size: 24px; }
    p { color: #666; margin-bottom: 24px; }
    .stars { font-size: 40px; margin: 20px 0; }
    .star {
      cursor: pointer;
      transition: transform 0.2s;
      display: inline-block;
    }
    .star:hover { transform: scale(1.2); }
    .star.selected { color: #ffc107; }
    .star.unselected { color: #ddd; }
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #eee;
      border-radius: 8px;
      margin: 16px 0;
      font-size: 16px;
      resize: vertical;
      min-height: 100px;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s;
    }
    button:hover { background: #5a6fd6; }
    .thank-you { display: none; }
    .thank-you.show { display: block; }
    .form.hide { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="form">
      <h1>How was your experience?</h1>
      <p>with ${orgName}</p>

      <div class="stars" id="stars">
        <span class="star unselected" data-rating="1">★</span>
        <span class="star unselected" data-rating="2">★</span>
        <span class="star unselected" data-rating="3">★</span>
        <span class="star unselected" data-rating="4">★</span>
        <span class="star unselected" data-rating="5">★</span>
      </div>

      <textarea id="feedback" placeholder="Tell us more (optional)..."></textarea>

      <button onclick="submitReview()">Submit Review</button>
    </div>

    <div class="thank-you">
      <h1>Thank you! 🎉</h1>
      <p>Your feedback means a lot to us.</p>
    </div>
  </div>

  <script>
    let selectedRating = 0;
    const stars = document.querySelectorAll('.star');

    stars.forEach(star => {
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.rating);
        updateStars();
      });
    });

    function updateStars() {
      stars.forEach(star => {
        const rating = parseInt(star.dataset.rating);
        star.classList.toggle('selected', rating <= selectedRating);
        star.classList.toggle('unselected', rating > selectedRating);
      });
    }

    async function submitReview() {
      if (selectedRating === 0) {
        alert('Please select a rating');
        return;
      }

      const feedback = document.getElementById('feedback').value;

      try {
        await fetch('/api/reviews/${id}/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: selectedRating, feedback })
        });

        document.querySelector('.form').classList.add('hide');
        document.querySelector('.thank-you').classList.add('show');
      } catch (err) {
        alert('Something went wrong. Please try again.');
      }
    }
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

/**
 * POST /api/reviews/:id/submit - Submit a review (public)
 * Rate limited: 5 submissions per 15 minutes per IP+review combination
 */
router.post('/:id/submit', reviewSubmitLimiter, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;

  // Validate rating is an integer between 1-5
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return errors.validation(res, 'Rating must be an integer between 1 and 5');
  }

  const reviewRequest = await prisma.reviewRequest.findUnique({
    where: { id },
    include: { organization: true, customer: true, job: true },
  });

  if (!reviewRequest) {
    return errors.notFound(res, 'Review request');
  }

  // Create the review
  const review = await prisma.review.create({
    data: {
      organizationId: reviewRequest.organizationId,
      customerId: reviewRequest.customerId,
      jobId: reviewRequest.jobId,
      platform: 'internal',
      rating,
      content: feedback || null,
      reviewerName: reviewRequest.customer
        ? `${reviewRequest.customer.firstName} ${reviewRequest.customer.lastName}`
        : 'Customer',
      requestSentAt: reviewRequest.sentAt,
    },
  });

  // Update review request status
  await prisma.reviewRequest.update({
    where: { id },
    data: {
      status: 'completed',
      sentimentResponse: rating,
      reviewId: review.id,
    },
  });

  // Emit review received event
  await events.emit({
    type: 'review.received',
    organizationId: reviewRequest.organizationId,
    aggregateType: 'review',
    aggregateId: review.id,
    data: {
      reviewId: review.id,
      reviewRequestId: id,
      customerId: reviewRequest.customerId,
      jobId: reviewRequest.jobId,
      rating,
      platform: 'internal',
    },
  });

  logger.info('Review submitted', { rating, jobId: reviewRequest.jobId });

  // If high rating (4-5), suggest leaving a Google review
  const settings = reviewRequest.organization.settings as Record<string, unknown>;
  const reviewSettings = settings?.reviewSettings as Record<string, unknown> | undefined;
  const googleReviewUrl = reviewSettings?.googleReviewUrl as string | undefined;

  if (rating >= 4 && googleReviewUrl) {
    // Send follow-up SMS asking for Google review
    if (reviewRequest.customer) {
      await sms.sendTemplated({
        organizationId: reviewRequest.organizationId,
        customerId: reviewRequest.customerId,
        to: reviewRequest.customer.phone,
        templateType: 'review_request_followup',
        variables: {
          businessName: reviewRequest.organization.name,
          customerName: reviewRequest.customer.firstName,
          reviewLink: googleReviewUrl,
        },
      });
    }

    return sendSuccess(res, {
      message: 'Thank you for your feedback!',
      googleReviewUrl,
    });
  }

  // If low rating (1-3), send apology/follow-up
  if (rating <= 3 && reviewRequest.customer) {
    await sms.sendTemplated({
      organizationId: reviewRequest.organizationId,
      customerId: reviewRequest.customerId,
      to: reviewRequest.customer.phone,
      templateType: 'review_sentiment_check',
      variables: {
        businessName: reviewRequest.organization.name,
        customerName: reviewRequest.customer.firstName,
      },
    });
  }

  sendSuccess(res, { message: 'Thank you for your feedback!' });
}));

/**
 * Handle SMS replies with sentiment (1-5 rating)
 * This is called from the SMS webhook when we detect a numeric reply
 */
export async function handleSentimentReply(
  organizationId: string,
  customerId: string,
  phone: string,
  rating: number
): Promise<boolean> {
  try {
    // Find the most recent pending/sent review request for this customer
    const reviewRequest = await prisma.reviewRequest.findFirst({
      where: {
        organizationId,
        customerId,
        status: { in: ['sent', 'clicked'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { organization: true, customer: true },
    });

    if (!reviewRequest) {
      return false;
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        organizationId,
        customerId,
        jobId: reviewRequest.jobId,
        platform: 'internal',
        rating,
        reviewerName: reviewRequest.customer
          ? `${reviewRequest.customer.firstName} ${reviewRequest.customer.lastName}`
          : 'Customer',
        requestSentAt: reviewRequest.sentAt,
      },
    });

    // Update review request
    await prisma.reviewRequest.update({
      where: { id: reviewRequest.id },
      data: {
        status: 'completed',
        sentimentResponse: rating,
        reviewId: review.id,
      },
    });

    logger.info('Review received via SMS', { rating });

    // Send appropriate follow-up based on rating
    const settings = reviewRequest.organization.settings as Record<string, unknown>;
    const reviewSettings = settings?.reviewSettings as Record<string, unknown> | undefined;
    const googleReviewUrl = reviewSettings?.googleReviewUrl as string | undefined;

    if (rating >= 4 && googleReviewUrl && reviewRequest.customer) {
      await sms.sendTemplated({
        organizationId,
        customerId,
        to: reviewRequest.customer.phone,
        templateType: 'review_request_followup',
        variables: {
          businessName: reviewRequest.organization.name,
          customerName: reviewRequest.customer.firstName,
          reviewLink: googleReviewUrl,
        },
      });
    } else if (rating <= 3 && reviewRequest.customer) {
      await sms.sendTemplated({
        organizationId,
        customerId,
        to: reviewRequest.customer.phone,
        templateType: 'review_sentiment_check',
        variables: {
          businessName: reviewRequest.organization.name,
          customerName: reviewRequest.customer.firstName,
        },
      });
    }

    return true;
  } catch (error) {
    logger.error('Error handling sentiment reply', error);
    return false;
  }
}

export default router;
