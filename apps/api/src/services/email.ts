/**
 * Email Service
 *
 * Handles all outbound email via Resend with:
 * - Template-based sending
 * - HTML and plain text support
 * - Delivery tracking
 * - Rate limiting awareness
 */

import { Resend } from 'resend';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export interface SendEmailOptions {
  organizationId: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface SendTemplatedEmailOptions {
  organizationId: string;
  to: string | string[];
  templateName: string;
  variables: Record<string, string | number>;
  subject?: string;
  from?: string;
  replyTo?: string;
}

export interface ROIReportData {
  businessName: string;
  periodLabel: string;
  roiDollars: number;
  roiMultiplier: number;
  callsRecovered: number;
  callsAnsweredByAI: number;
  callsRecoveredByTextBack: number;
  revenueCaptured: number;
  hoursSaved: number;
  missedCallsWithoutServiceFlow: number;
  lostRevenueWithoutServiceFlow: number;
  dashboardUrl: string;
}

// ============================================
// EMAIL SERVICE
// ============================================

class EmailService {
  private _client: Resend | null = null;
  private defaultFrom: string = 'ServiceFlow <notifications@serviceflow.app>';

  /**
   * Lazy-load Resend client to allow app to start without credentials
   */
  private get client(): Resend {
    if (!this._client) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error(
          'Resend API key not configured. Set RESEND_API_KEY in .env'
        );
      }
      this._client = new Resend(process.env.RESEND_API_KEY);
    }
    return this._client;
  }

  /**
   * Check if Resend is configured
   */
  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY;
  }

  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const {
      organizationId,
      to,
      subject,
      html,
      text,
      from = this.defaultFrom,
      replyTo,
      tags = [],
    } = options;

    try {
      // Check if Resend is configured
      if (!this.isConfigured()) {
        logger.info('MOCK EMAIL sent', {
          to,
          subject,
          preview: html.substring(0, 100),
        });
        logger.warn('Resend not configured - set RESEND_API_KEY');

        return {
          success: true,
          emailId: `MOCK_${Date.now()}`,
        };
      }

      // Send via Resend
      const result = await this.client.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo,
        tags: [
          { name: 'organization_id', value: organizationId },
          ...tags,
        ],
      });

      if (result.error) {
        logger.error('Email send error', { error: result.error });
        return {
          success: false,
          error: {
            code: result.error.name || 'SEND_ERROR',
            message: result.error.message,
          },
        };
      }

      logger.info('Email sent', { emailId: result.data?.id, to, subject });

      return {
        success: true,
        emailId: result.data?.id,
      };
    } catch (error: any) {
      logger.error('Email send error', error);

      return {
        success: false,
        error: {
          code: error.code?.toString() || 'UNKNOWN',
          message: error.message || 'Failed to send email',
        },
      };
    }
  }

  /**
   * Send a weekly ROI report email
   */
  async sendROIReport(
    to: string,
    data: ROIReportData
  ): Promise<SendEmailResult> {
    const html = this.generateROIReportHTML(data);
    const text = this.generateROIReportText(data);

    return this.send({
      organizationId: '', // Will be added from context
      to,
      subject: `Your ServiceFlow Impact: $${data.roiDollars.toLocaleString()} ROI ${data.periodLabel}`,
      html,
      text,
      tags: [{ name: 'email_type', value: 'roi_report' }],
    });
  }

  /**
   * Send welcome email after onboarding
   */
  async sendWelcomeEmail(
    to: string,
    businessName: string,
    dashboardUrl: string
  ): Promise<SendEmailResult> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ServiceFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155;">
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #22c55e; font-size: 28px; margin: 0;">ServiceFlow</h1>
      </div>

      <!-- Welcome message -->
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Welcome to ServiceFlow!</h2>
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi there! Your ${businessName} account is all set up and ready to help you never miss another call.
      </p>

      <!-- Quick start section -->
      <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #ffffff; font-size: 18px; margin: 0 0 16px 0;">Quick Start Guide</h3>
        <ul style="color: #94a3b8; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Your AI receptionist is ready to answer calls 24/7</li>
          <li>Missed calls automatically trigger a text-back</li>
          <li>View all leads and jobs in your dashboard</li>
          <li>Track your ROI in the Impact section</li>
        </ul>
      </div>

      <!-- CTA button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
          Go to Dashboard
        </a>
      </div>

      <!-- Support -->
      <p style="color: #64748b; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
        Questions? Reply to this email or visit our <a href="https://serviceflow.app/help" style="color: #3b82f6;">help center</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #475569; font-size: 12px; margin: 0;">
        ServiceFlow Inc. | Never miss another call.
      </p>
    </div>
  </div>
</body>
</html>`;

    const text = `
Welcome to ServiceFlow!

Hi there! Your ${businessName} account is all set up and ready to help you never miss another call.

Quick Start Guide:
- Your AI receptionist is ready to answer calls 24/7
- Missed calls automatically trigger a text-back
- View all leads and jobs in your dashboard
- Track your ROI in the Impact section

Go to your dashboard: ${dashboardUrl}

Questions? Reply to this email or visit our help center at https://serviceflow.app/help

---
ServiceFlow Inc. | Never miss another call.
`;

    return this.send({
      organizationId: '',
      to,
      subject: `Welcome to ServiceFlow, ${businessName}!`,
      html,
      text,
      tags: [{ name: 'email_type', value: 'welcome' }],
    });
  }

  /**
   * Generate HTML for ROI report email
   */
  private generateROIReportHTML(data: ROIReportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ServiceFlow Impact Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155;">
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #22c55e; font-size: 28px; margin: 0;">ServiceFlow</h1>
        <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0;">Weekly Impact Report</p>
      </div>

      <!-- ROI Hero -->
      <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Your ROI ${data.periodLabel}</p>
        <h2 style="color: #ffffff; font-size: 48px; font-weight: 700; margin: 0;">$${data.roiDollars.toLocaleString()}</h2>
        ${data.roiMultiplier > 0 ? `<p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 8px 0 0 0;">${data.roiMultiplier}x return on investment</p>` : ''}
      </div>

      <!-- Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
        <!-- Calls Recovered -->
        <div style="background: #1e293b; border-radius: 12px; padding: 20px;">
          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">Calls Recovered</p>
          <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">${data.callsRecovered}</p>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">
            ${data.callsAnsweredByAI} AI · ${data.callsRecoveredByTextBack} Text-back
          </p>
        </div>

        <!-- Revenue Captured -->
        <div style="background: #1e293b; border-radius: 12px; padding: 20px;">
          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">Revenue Captured</p>
          <p style="color: #22c55e; font-size: 28px; font-weight: 700; margin: 0;">$${data.revenueCaptured.toLocaleString()}</p>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">From recovered calls</p>
        </div>

        <!-- Hours Saved -->
        <div style="background: #1e293b; border-radius: 12px; padding: 20px;">
          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">Hours Saved</p>
          <p style="color: #f59e0b; font-size: 28px; font-weight: 700; margin: 0;">${data.hoursSaved.toFixed(1)}</p>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Through automation</p>
        </div>

        <!-- Missed Calls Prevented -->
        <div style="background: #1e293b; border-radius: 12px; padding: 20px;">
          <p style="color: #64748b; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">Missed Calls Prevented</p>
          <p style="color: #3b82f6; font-size: 28px; font-weight: 700; margin: 0;">${data.missedCallsWithoutServiceFlow}</p>
          <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">vs. industry average</p>
        </div>
      </div>

      <!-- Counterfactual -->
      <div style="background: #7f1d1d20; border: 1px solid #7f1d1d40; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #fca5a5; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Without ServiceFlow</p>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">
          You would have missed ${data.missedCallsWithoutServiceFlow} calls worth an estimated
          <span style="color: #ef4444; font-weight: 600;">$${data.lostRevenueWithoutServiceFlow.toLocaleString()}</span>
          in potential revenue.
        </p>
      </div>

      <!-- CTA button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
          View Full Report
        </a>
      </div>

      <!-- Footer text -->
      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 24px 0 0 0;">
        You're receiving this because you're subscribed to weekly reports.
        <a href="${data.dashboardUrl}/settings" style="color: #3b82f6;">Manage preferences</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #475569; font-size: 12px; margin: 0;">
        ${data.businessName} | Powered by ServiceFlow
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generate plain text for ROI report email
   */
  private generateROIReportText(data: ROIReportData): string {
    return `
SERVICEFLOW WEEKLY IMPACT REPORT
================================

Your ROI ${data.periodLabel}: $${data.roiDollars.toLocaleString()}
${data.roiMultiplier > 0 ? `(${data.roiMultiplier}x return on investment)` : ''}

KEY METRICS
-----------
Calls Recovered: ${data.callsRecovered}
  - ${data.callsAnsweredByAI} answered by AI
  - ${data.callsRecoveredByTextBack} via text-back

Revenue Captured: $${data.revenueCaptured.toLocaleString()}
Hours Saved: ${data.hoursSaved.toFixed(1)} hours

WITHOUT SERVICEFLOW
-------------------
You would have missed ${data.missedCallsWithoutServiceFlow} calls worth an estimated $${data.lostRevenueWithoutServiceFlow.toLocaleString()} in potential revenue.

View your full report: ${data.dashboardUrl}

---
${data.businessName} | Powered by ServiceFlow
Manage preferences: ${data.dashboardUrl}/settings
`;
  }

  /**
   * Send email to multiple recipients with personalization
   */
  async sendBatch(
    emails: Array<{
      organizationId: string;
      to: string;
      subject: string;
      html: string;
      text?: string;
    }>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const result = await this.send(email);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    logger.info('Batch email complete', { sent, failed, total: emails.length });
    return { sent, failed };
  }
}

// Singleton instance
export const email = new EmailService();

export default email;
