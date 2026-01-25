/**
 * Phone Numbers API Routes
 *
 * Handles phone number provisioning via Twilio:
 * - Search available numbers by area code
 * - Purchase/provision a new number
 * - Configure webhooks
 * - List organization's phone numbers
 */

import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

const router = Router();

// ============================================
// TWILIO CLIENT
// ============================================

function getTwilioClient(): twilio.Twilio | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/phone-numbers
 * List organization's phone numbers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;

    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: phoneNumbers,
    });
  } catch (error) {
    logger.error('Get phone numbers error', error);
    res.status(500).json({
      success: false,
      error: { code: 'E5001', message: 'Failed to get phone numbers' },
    });
  }
});

/**
 * GET /api/phone-numbers/search
 * Search for available phone numbers by area code
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { areaCode } = req.query;

    if (!areaCode || typeof areaCode !== 'string' || areaCode.length !== 3) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4001', message: 'Valid 3-digit area code is required' },
      });
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        error: { code: 'E5002', message: 'Twilio not configured' },
      });
    }

    // Search for available local numbers in the area code
    const availableNumbers = await client.availablePhoneNumbers('US')
      .local.list({
        areaCode: parseInt(areaCode),
        smsEnabled: true,
        voiceEnabled: true,
        limit: 10,
      });

    const formattedNumbers = availableNumbers.map(num => ({
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      locality: num.locality,
      region: num.region,
      capabilities: {
        voice: num.capabilities.voice,
        sms: num.capabilities.sms,
        mms: num.capabilities.mms,
      },
    }));

    res.json({
      success: true,
      data: formattedNumbers,
    });
  } catch (error: any) {
    logger.error('Search phone numbers error', error);

    // Handle Twilio-specific errors
    if (error.code === 20404) {
      return res.json({
        success: true,
        data: [],
        message: 'No numbers available in this area code',
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'E5003', message: error.message || 'Failed to search phone numbers' },
    });
  }
});

/**
 * POST /api/phone-numbers/provision
 * Purchase and provision a new phone number
 */
router.post('/provision', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;
    const { phoneNumber, label } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'E4002', message: 'Phone number is required' },
      });
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        error: { code: 'E5002', message: 'Twilio not configured' },
      });
    }

    // Check if organization already has a main number
    const existingMain = await prisma.phoneNumber.findFirst({
      where: { organizationId: orgId, type: 'main' },
    });

    // Purchase the phone number
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber,
      voiceUrl: `${process.env.API_URL}/webhooks/twilio/voice`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.API_URL}/webhooks/twilio/voice/status`,
      statusCallbackMethod: 'POST',
      smsUrl: `${process.env.API_URL}/webhooks/twilio/sms`,
      smsMethod: 'POST',
      friendlyName: label || `ServiceFlow - ${orgId.substring(0, 8)}`,
    });

    // Create phone number record in database
    const newPhoneNumber = await prisma.phoneNumber.create({
      data: {
        organizationId: orgId,
        number: purchasedNumber.phoneNumber,
        twilioSid: purchasedNumber.sid,
        type: existingMain ? 'tracking' : 'main',
        label: label || 'Main Business Line',
        isActive: true,
      },
    });

    // Update organization settings to mark phone as provisioned
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as any) || {};
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          phoneSetup: {
            ...currentSettings.phoneSetup,
            provisioned: true,
            twilioPhoneNumber: purchasedNumber.phoneNumber,
          },
        },
      },
    });

    logger.info('Provisioned phone number', { phoneNumber: purchasedNumber.phoneNumber, organizationId: orgId });

    res.json({
      success: true,
      data: {
        id: newPhoneNumber.id,
        number: newPhoneNumber.number,
        twilioSid: newPhoneNumber.twilioSid,
        type: newPhoneNumber.type,
        label: newPhoneNumber.label,
        isActive: newPhoneNumber.isActive,
      },
    });
  } catch (error) {
    logger.error('Provision phone number error', error);

    // Handle Twilio-specific errors
    if (error.code === 21422) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4003', message: 'Phone number is not available for purchase' },
      });
    }

    if (error.code === 21452) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4004', message: 'Invalid phone number format' },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'E5004', message: error.message || 'Failed to provision phone number' },
    });
  }
});

/**
 * POST /api/phone-numbers/use-existing
 * Configure an existing phone number (user provides their own)
 */
router.post('/use-existing', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;
    const { phoneNumber, label } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'E4002', message: 'Phone number is required' },
      });
    }

    // Normalize the phone number
    let normalizedNumber = phoneNumber.replace(/\D/g, '');
    if (normalizedNumber.length === 10) {
      normalizedNumber = `+1${normalizedNumber}`;
    } else if (normalizedNumber.length === 11 && normalizedNumber.startsWith('1')) {
      normalizedNumber = `+${normalizedNumber}`;
    } else if (!normalizedNumber.startsWith('+')) {
      normalizedNumber = `+${normalizedNumber}`;
    }

    // Check if number already exists
    const existing = await prisma.phoneNumber.findUnique({
      where: { number: normalizedNumber },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'E4005', message: 'Phone number is already registered' },
      });
    }

    // Check if organization already has a main number
    const existingMain = await prisma.phoneNumber.findFirst({
      where: { organizationId: orgId, type: 'main' },
    });

    // Create phone number record (without Twilio SID since it's external)
    const newPhoneNumber = await prisma.phoneNumber.create({
      data: {
        organizationId: orgId,
        number: normalizedNumber,
        twilioSid: `EXTERNAL_${Date.now()}`, // Placeholder for external numbers
        type: existingMain ? 'tracking' : 'main',
        label: label || 'External Business Line',
        isActive: true,
      },
    });

    // Update organization settings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as any) || {};
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          phoneSetup: {
            ...currentSettings.phoneSetup,
            useExisting: true,
            externalPhoneNumber: normalizedNumber,
          },
        },
      },
    });

    logger.info('Registered external phone number', { phoneNumber: normalizedNumber, organizationId: orgId });

    res.json({
      success: true,
      data: {
        id: newPhoneNumber.id,
        number: newPhoneNumber.number,
        type: newPhoneNumber.type,
        label: newPhoneNumber.label,
        isActive: newPhoneNumber.isActive,
        isExternal: true,
      },
    });
  } catch (error) {
    logger.error('Register existing phone number error', error);
    res.status(500).json({
      success: false,
      error: { code: 'E5005', message: error.message || 'Failed to register phone number' },
    });
  }
});

/**
 * DELETE /api/phone-numbers/:id
 * Release/delete a phone number
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;
    const { id } = req.params;

    const phoneNumber = await prisma.phoneNumber.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!phoneNumber) {
      return res.status(404).json({
        success: false,
        error: { code: 'E4006', message: 'Phone number not found' },
      });
    }

    // If it's a Twilio number (not external), release it
    if (!phoneNumber.twilioSid.startsWith('EXTERNAL_')) {
      const client = getTwilioClient();
      if (client) {
        try {
          await client.incomingPhoneNumbers(phoneNumber.twilioSid).remove();
          logger.info('Released Twilio number', { phoneNumber: phoneNumber.number });
        } catch (twilioError) {
          logger.error('Failed to release Twilio number', twilioError);
          // Continue with deletion even if Twilio release fails
        }
      }
    }

    // Delete from database
    await prisma.phoneNumber.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Phone number released successfully',
    });
  } catch (error: any) {
    logger.error('Delete phone number error', error);
    res.status(500).json({
      success: false,
      error: { code: 'E5006', message: error.message || 'Failed to delete phone number' },
    });
  }
});

/**
 * GET /api/phone-numbers/status
 * Check Twilio configuration status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const orgId = req.auth!.organizationId;

    const client = getTwilioClient();
    const isConfigured = !!client;

    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { organizationId: orgId, isActive: true },
    });

    const hasMainNumber = phoneNumbers.some(p => p.type === 'main');

    res.json({
      success: true,
      data: {
        twilioConfigured: isConfigured,
        hasPhoneNumber: phoneNumbers.length > 0,
        hasMainNumber,
        phoneNumbers: phoneNumbers.map(p => ({
          id: p.id,
          number: p.number,
          type: p.type,
          label: p.label,
          isExternal: p.twilioSid.startsWith('EXTERNAL_'),
        })),
      },
    });
  } catch (error: any) {
    logger.error('Get phone status error', error);
    res.status(500).json({
      success: false,
      error: { code: 'E5007', message: error.message || 'Failed to get phone status' },
    });
  }
});

export default router;
