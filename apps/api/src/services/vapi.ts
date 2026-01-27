/**
 * Vapi AI Voice Service
 *
 * Handles AI-powered phone conversations using Vapi.
 * - Creates and manages AI assistants
 * - Handles call transfers from Twilio
 * - Processes conversation results
 */

import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export interface VapiAssistantConfig {
  organizationId: string;
  name: string;
  greeting: string;
  systemPrompt: string;
  voice?: {
    provider: 'elevenlabs' | 'playht' | 'deepgram';
    voiceId: string;
  };
  tools?: VapiTool[];
}

export interface VapiTool {
  type: 'function' | 'transferCall';
  function?: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
  // For transferCall type
  destinations?: Array<{
    type: 'number';
    number: string;
    message?: string;
    description?: string;
  }>;
  // Server-side handling for transferCall
  async?: boolean;
  server?: {
    url: string;
    secret?: string;
  };
}

export interface VapiCallResult {
  callId: string;
  status: 'completed' | 'failed' | 'no-answer';
  duration: number;
  transcript: string;
  summary?: string;
  toolCalls?: VapiToolCall[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface VapiToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

// ============================================
// VAPI SERVICE
// ============================================

class VapiService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.vapi.ai';

  /**
   * Check if Vapi is configured
   */
  isConfigured(): boolean {
    return !!process.env.VAPI_API_KEY;
  }

  /**
   * Get API key (lazy load)
   */
  private getApiKey(): string {
    if (!this.apiKey) {
      if (!process.env.VAPI_API_KEY) {
        throw new Error('VAPI_API_KEY not configured');
      }
      this.apiKey = process.env.VAPI_API_KEY;
    }
    return this.apiKey;
  }

  /**
   * Make API request to Vapi
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vapi API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Build the system prompt for an organization
   */
  buildSystemPrompt(org: {
    name: string;
    settings: any;
  }): string {
    const settings = org.settings || {};
    const aiSettings = settings.aiSettings || {};
    const serviceArea = settings.serviceArea || {};

    const emergencyMinutes = aiSettings.emergencyCallbackMinutes || 15;
    const nonEmergencyMinutes = aiSettings.nonEmergencyCallbackMinutes || 120;

    return `You are a friendly, professional AI receptionist for ${org.name}.

## Recording Disclosure
${aiSettings.recordingDisclosure ? `START every call with: "${aiSettings.recordingDisclosureText || 'This call may be recorded for quality purposes.'}"` : ''}

## Emergency Protocol

### TIER 0 - LIFE SAFETY (Immediate 911)
Triggers: gas smell, CO detector, electrical fire, sparking near water
Response: "This sounds like an emergency requiring immediate professional help. Please leave the area and call 911. Once safe, call us back."
DO NOT collect info - prioritize their safety.

### TIER 1 - URGENT PROPERTY DAMAGE
Triggers: active flooding, burst pipe, sewage backup, water pouring
Response: Collect name, phone, address FAST. Say: "I'm marking this as urgent. Someone will call within ${emergencyMinutes} minutes."
Add: "This is an AI answering service. Please use your judgment to stay safe."

### TIER 2 - PRIORITY
Triggers: no hot water, water heater issues, main drain blocked
Response: Full collection. Say: "We'll prioritize this. Someone will call within ${Math.min(nonEmergencyMinutes, 60)} minutes."

## Standard Booking Flow
1. Greet warmly
2. Collect: name, phone, address, issue description
3. Ask: "When would be the best time for a technician to visit? We'll do our best to accommodate, but will confirm availability when we call back."
4. Optional: "Any access instructions - gate codes, pets, or anything we should know?"
5. Confirm details
6. Say: "Perfect. Someone will call within ${nonEmergencyMinutes / 60} hours to confirm your appointment."

## Services
${aiSettings.servicesOffered?.length ? `We offer: ${aiSettings.servicesOffered.join(', ')}` : 'Full plumbing services'}
${aiSettings.servicesNotOffered?.length ? `We do NOT handle: ${aiSettings.servicesNotOffered.join(', ')}. Politely suggest they find a specialist.` : ''}

## Pricing Questions
${aiSettings.serviceCallFee ? `Service call fee: $${(aiSettings.serviceCallFee / 100).toFixed(0)}. ` : ''}${aiSettings.freeEstimates ? 'We offer free estimates.' : 'Final pricing depends on diagnosis.'}
Never quote specific repair prices. Say: "Pricing varies by situation. We provide a clear quote on-site before any work."

## After-Hours (${aiSettings.afterHoursBehavior || 'emergency_only'})
${aiSettings.afterHoursBehavior === 'message_only' ? 'Take a message for all calls. Promise callback during business hours.' : aiSettings.afterHoursBehavior === 'full_service' ? 'Handle all calls normally with appropriate callback times.' : 'Only handle emergencies. Non-emergencies: take message for next-day callback.'}

## Service Area
${serviceArea.cities?.length ? `We serve: ${serviceArea.cities.join(', ')}` : 'Local area'}
If outside area: "I'll note your location. Our team will review if we can accommodate."

## Special Scenarios

**Repeat caller**: Use lookup_customer tool. If recent call found: "I see you called recently about [issue]. Is this related or something new?"

**Legal/Complaints/Pricing disputes**: "I understand your concern. This is beyond what I can help with as an AI. Let me take your information for a callback from our team."

**"Is this a robot?"**: "Yes, I'm an AI assistant for ${org.name}. I can help schedule service or take a message. Would you like to proceed?"

**Can't understand after 1 clarification**: "I want to make sure I get this right. Let me note exactly what you said for our team to review."

## Style
- 2-3 sentences max per response
- Warm but efficient
- Always confirm callback number before ending
- Thank them for calling ${org.name}`;
  }

  /**
   * Get the tools available to the AI assistant
   */
  getAssistantTools(): VapiTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'book_appointment',
          description: 'Book a service appointment for the customer',
          parameters: {
            type: 'object',
            properties: {
              customer_name: {
                type: 'string',
                description: 'Full name of the customer',
              },
              phone: {
                type: 'string',
                description: 'Customer phone number',
              },
              address: {
                type: 'string',
                description: 'Service address',
              },
              issue_description: {
                type: 'string',
                description: 'Brief description of the plumbing issue',
              },
              is_emergency: {
                type: 'boolean',
                description: 'Whether this is an emergency situation',
              },
              preferred_date: {
                type: 'string',
                description: 'Preferred appointment date if mentioned',
              },
            },
            required: ['customer_name', 'phone', 'issue_description'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_availability',
          description: 'Check available appointment slots',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date to check availability for (YYYY-MM-DD)',
              },
            },
            required: ['date'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'transfer_to_human',
          description: 'Transfer the call to a human agent when the customer explicitly requests to speak with a person, or for complex issues that require human expertise',
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Brief reason for the transfer (e.g., "customer requested", "complex pricing question", "emergency situation")',
              },
            },
            required: ['reason'],
          },
        },
        // Enable async server-side handling for dynamic transfer destination
        async: true,
      },
    ];
  }

  /**
   * Create a Vapi assistant for an organization
   */
  async createAssistant(config: VapiAssistantConfig): Promise<string> {
    // Build the model config - use gpt-4o-mini for faster responses
    const modelConfig: any = {
      provider: 'openai',
      model: 'gpt-4o-mini', // Faster than gpt-4o, better for real-time voice
      messages: [
        {
          role: 'system',
          content: config.systemPrompt,
        },
      ],
      temperature: 0.5, // Lower for more consistent responses
      maxTokens: 150, // Keep responses concise
    };

    const assistant = await this.request<{ id: string }>('POST', '/assistant', {
      name: config.name,
      firstMessage: config.greeting,
      model: modelConfig,
      // Use Deepgram for transcription - fast and accurate
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
      },
      voice: config.voice || {
        provider: 'openai',
        voiceId: 'alloy',
      },
      // Timing settings to reduce interruptions
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 600,
      responseDelaySeconds: 0.4, // Small delay to avoid cutting off user
      llmRequestDelaySeconds: 0.1,
      numWordsToInterruptAssistant: 2, // Allow user to interrupt with 2+ words
      serverUrl: `${process.env.API_URL}/webhooks/vapi`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,
    });

    return assistant.id;
  }

  /**
   * Get or create assistant for an organization
   */
  async getOrCreateAssistant(organizationId: string): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const settings = org.settings as any;

    // Check if we already have an assistant ID stored
    if (settings?.vapiAssistantId) {
      return settings.vapiAssistantId;
    }

    // Create new assistant
    const aiSettings = settings?.aiSettings || {};
    const greeting = aiSettings.greeting ||
      `Thanks for calling ${org.name}! This is our AI assistant. How can I help you today?`;

    const assistantId = await this.createAssistant({
      organizationId,
      name: `${org.name} AI Receptionist`,
      greeting,
      systemPrompt: this.buildSystemPrompt(org),
      tools: this.getAssistantTools(),
    });

    // Store assistant ID in org settings
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          vapiAssistantId: assistantId,
        },
      },
    });

    logger.info('Created Vapi assistant', { organizationName: org.name, assistantId });
    return assistantId;
  }

  /**
   * Start an outbound call via Vapi
   */
  async startOutboundCall(options: {
    assistantId: string;
    phoneNumber: string;
    customerPhone: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const call = await this.request<{ id: string }>('POST', '/call/phone', {
      assistantId: options.assistantId,
      phoneNumber: {
        twilioPhoneNumber: options.phoneNumber,
      },
      customer: {
        number: options.customerPhone,
      },
      metadata: options.metadata,
    });

    return call.id;
  }

  /**
   * Connect an incoming Twilio call to a Vapi assistant
   * Uses phoneCallProviderBypass to get TwiML for the call
   */
  async connectInboundCall(options: {
    assistantId: string;
    callerNumber: string;
    twilioNumber: string;
  }): Promise<string> {
    const response = await this.request<{
      id: string;
      phoneCallProviderDetails?: {
        twiml: string;
      };
    }>('POST', '/call', {
      assistantId: options.assistantId,
      phoneCallProviderBypassEnabled: true,
      phoneNumber: {
        twilioPhoneNumber: options.twilioNumber,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      },
      customer: {
        number: options.callerNumber,
      },
    });

    if (!response.phoneCallProviderDetails?.twiml) {
      throw new Error('Vapi did not return TwiML for the call');
    }

    return response.phoneCallProviderDetails.twiml;
  }

  /**
   * Handle tool calls from Vapi
   */
  async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
    context: { organizationId: string; callId: string; customerId?: string }
  ): Promise<unknown> {
    logger.info('Vapi tool call', { toolName, args });

    switch (toolName) {
      case 'book_appointment':
        return this.handleBookAppointment(args, context);
      case 'check_availability':
        return this.handleCheckAvailability(args, context);
      case 'transfer_to_human':
        return this.handleTransferToHuman(args, context);
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  /**
   * Handle booking an appointment
   */
  private async handleBookAppointment(
    args: Record<string, unknown>,
    context: { organizationId: string; callId: string; customerId?: string }
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      const { customer_name, phone, address, issue_description, is_emergency, preferred_date } = args;

      // Find or create customer
      let customer = await prisma.customer.findFirst({
        where: { organizationId: context.organizationId, phone: phone as string },
      });

      if (!customer) {
        const nameParts = (customer_name as string).split(' ');
        customer = await prisma.customer.create({
          data: {
            organizationId: context.organizationId,
            firstName: nameParts[0] || 'Unknown',
            lastName: nameParts.slice(1).join(' ') || 'Customer',
            phone: phone as string,
            address: address ? { street: address as string } : undefined,
            source: 'phone_ai',
          },
        });
      }

      // Create job
      const job = await prisma.job.create({
        data: {
          organizationId: context.organizationId,
          customerId: customer.id,
          title: issue_description as string,
          description: `Booked via AI phone call. ${is_emergency ? 'EMERGENCY - Requires immediate attention.' : ''}`,
          type: is_emergency ? 'emergency' : 'repair',
          status: 'lead',
          priority: is_emergency ? 'emergency' : 'normal',
          scheduledAt: preferred_date ? new Date(preferred_date as string) : undefined,
        },
      });

      // Update call record to mark as AI handled
      if (context.callId) {
        await prisma.call.update({
          where: { id: context.callId },
          data: { aiHandled: true },
        });
      }

      logger.info('AI booked appointment', { jobId: job.id, customerName: customer_name });

      return {
        success: true,
        message: is_emergency
          ? "I've marked this as an emergency. Someone will call you back within 15 minutes."
          : "Great, I've scheduled that for you. Someone from our team will call to confirm the exact time.",
        jobId: job.id,
      };
    } catch (error) {
      logger.error('Error booking appointment', error);
      return {
        success: false,
        message: "I'm having trouble booking that right now. Let me take your information and have someone call you back.",
      };
    }
  }

  /**
   * Handle checking availability
   * Queries actual appointments and business hours to return real available slots
   */
  private async handleCheckAvailability(
    args: Record<string, unknown>,
    context: { organizationId: string }
  ): Promise<{ available: boolean; slots: string[]; message: string }> {
    try {
      const dateStr = args.date as string;
      // Parse date as local time (not UTC) by adding time component
      // This prevents timezone issues where "2026-01-26" UTC becomes "2026-01-25" local
      const requestedDate = new Date(dateStr + 'T12:00:00');

      // Validate date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (requestedDate < today) {
        return {
          available: false,
          slots: [],
          message: "That date is in the past. Would you like to check availability for today or a future date?",
        };
      }

      // Get organization settings for business hours
      const org = await prisma.organization.findUnique({
        where: { id: context.organizationId },
        select: { settings: true, timezone: true },
      });

      if (!org) {
        return {
          available: false,
          slots: [],
          message: "I'm having trouble checking our schedule. Let me take your information and have someone call you back to confirm the appointment.",
        };
      }

      const settings = org.settings as any;
      const businessHours = settings?.businessHours || {};

      // Get day of week
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[requestedDate.getDay()];

      // Default business hours if not configured
      const defaultHours: Record<string, { open: string; close: string } | null> = {
        sunday: null,
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '09:00', close: '14:00' },
      };

      const dayHours = businessHours[dayName] ?? defaultHours[dayName];

      if (!dayHours) {
        const dayDisplayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        return {
          available: false,
          slots: [],
          message: `We're closed on ${dayDisplayName}s. Would you like to check a different day?`,
        };
      }

      // Parse business hours
      const [openHour, openMin] = dayHours.open.split(':').map(Number);
      const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

      const dayStart = new Date(requestedDate);
      dayStart.setHours(openHour, openMin, 0, 0);
      const dayEnd = new Date(requestedDate);
      dayEnd.setHours(closeHour, closeMin, 0, 0);

      // Get existing appointments for the day
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          organizationId: context.organizationId,
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { notIn: ['canceled', 'completed', 'no_show'] },
        },
        select: { scheduledAt: true, scheduledEndAt: true },
        orderBy: { scheduledAt: 'asc' },
      }) || [];

      // Generate 2-hour service windows (typical for plumbing)
      const slotDurationMs = 2 * 60 * 60 * 1000; // 2 hours
      const availableSlots: string[] = [];

      let currentSlot = new Date(dayStart);
      while (currentSlot.getTime() + slotDurationMs <= dayEnd.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + slotDurationMs);

        // Check if this slot conflicts with any existing appointment
        const hasConflict = existingAppointments.some((apt) => {
          const aptStart = apt.scheduledAt.getTime();
          const aptEnd = apt.scheduledEndAt.getTime();
          return currentSlot.getTime() < aptEnd && slotEnd.getTime() > aptStart;
        });

        if (!hasConflict) {
          // Format slot in human-readable form (e.g., "9:00 AM - 11:00 AM")
          const formatTime = (date: Date): string => {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`;
            return `${displayHours}${displayMinutes} ${ampm}`;
          };
          availableSlots.push(`${formatTime(currentSlot)} - ${formatTime(slotEnd)}`);
        }

        // Move to next slot (2-hour increments)
        currentSlot = new Date(currentSlot.getTime() + slotDurationMs);
      }

      if (availableSlots.length === 0) {
        return {
          available: false,
          slots: [],
          message: `We're fully booked on ${this.formatDateForSpeech(requestedDate)}. Would you like to check a different day?`,
        };
      }

      // Return up to 3 best slots for clarity in voice
      const displaySlots = availableSlots.slice(0, 3);
      const slotsText = displaySlots.length === 1
        ? displaySlots[0]
        : displaySlots.slice(0, -1).join(', ') + ', or ' + displaySlots[displaySlots.length - 1];

      return {
        available: true,
        slots: displaySlots,
        message: `We have availability on ${this.formatDateForSpeech(requestedDate)}. I have ${slotsText}. Which time works best for you?`,
      };
    } catch (error) {
      logger.error('Error checking availability', error);
      return {
        available: false,
        slots: [],
        message: "I'm having trouble checking our schedule right now. Let me take your information and have someone call you back to schedule.",
      };
    }
  }

  /**
   * Format a date for natural speech
   */
  private formatDateForSpeech(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return 'today';
    if (isTomorrow) return 'tomorrow';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // If within 7 days, just say the day name
    const daysAway = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAway <= 7) {
      return dayNames[date.getDay()];
    }

    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  }

  /**
   * Handle transfer to human
   * Finds the appropriate phone number and returns transfer destination for Vapi
   */
  private async handleTransferToHuman(
    args: Record<string, unknown>,
    context: { organizationId: string; callId: string }
  ): Promise<{
    success: boolean;
    message: string;
    destination?: { type: string; number: string; message?: string };
  }> {
    const reason = args.reason as string || 'Customer requested transfer';
    logger.info('Transfer requested', { reason, organizationId: context.organizationId });

    try {
      // Find the phone number to transfer to
      // Priority: 1) forwardTo on phone number, 2) owner's phone, 3) organization phone
      let transferNumber: string | null = null;

      // First, try to get the phone number record's forwardTo setting
      const call = context.callId ? await prisma.call.findUnique({
        where: { id: context.callId },
        select: { to: true },
      }) : null;

      if (call?.to) {
        const phoneNumber = await prisma.phoneNumber.findUnique({
          where: { number: call.to },
          select: { forwardTo: true },
        });
        if (phoneNumber?.forwardTo) {
          transferNumber = phoneNumber.forwardTo;
        }
      }

      // If no forwardTo, try to get the owner's phone
      if (!transferNumber) {
        const owner = await prisma.user.findFirst({
          where: { organizationId: context.organizationId, role: 'owner', isActive: true },
          select: { phone: true },
        });
        if (owner?.phone) {
          transferNumber = owner.phone;
        }
      }

      // If still no number, try organization's main phone
      if (!transferNumber) {
        const org = await prisma.organization.findUnique({
          where: { id: context.organizationId },
          select: { phone: true },
        });
        if (org?.phone) {
          transferNumber = org.phone;
        }
      }

      // Update call record with transfer info
      if (context.callId) {
        await prisma.call.update({
          where: { id: context.callId },
          data: {
            summary: `Transfer requested: ${reason}. ${transferNumber ? `Transferring to ${transferNumber}` : 'No transfer number available'}`,
          },
        });
      }

      // If we found a number, return transfer destination for Vapi
      if (transferNumber) {
        logger.info('Transferring call', { to: transferNumber, reason });

        return {
          success: true,
          message: "I understand. Let me connect you with someone who can help. Please hold for just a moment while I transfer you.",
          destination: {
            type: 'number',
            number: transferNumber,
            message: `Incoming transfer from AI assistant. Reason: ${reason}`,
          },
        };
      }

      // No transfer number available - take a message instead
      logger.warn('No transfer number available', { organizationId: context.organizationId });
      return {
        success: false,
        message: "I apologize, but I'm unable to transfer you right now. Let me take your information and have someone call you back within the next 15 minutes. What's the best number to reach you?",
      };
    } catch (error) {
      logger.error('Error handling transfer', error);
      return {
        success: false,
        message: "I'm sorry, I'm having trouble connecting you right now. Let me take your information and have someone call you back shortly.",
      };
    }
  }
}

// Singleton instance
export const vapi = new VapiService();
export default vapi;
