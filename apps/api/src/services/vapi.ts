/**
 * Vapi AI Voice Service
 *
 * Handles AI-powered phone conversations using Vapi.
 * - Creates and manages AI assistants
 * - Handles call transfers from Twilio
 * - Processes conversation results
 */

import { prisma } from '@serviceflow/database';

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
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
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

    return response.json();
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
    const businessHours = settings.businessHours || {};

    // Format business hours
    const hoursText = Object.entries(businessHours)
      .filter(([_, hours]) => hours !== null)
      .map(([day, hours]: [string, any]) =>
        `${day}: ${hours.open} - ${hours.close}`
      )
      .join(', ');

    // Format service area
    const citiesText = serviceArea.cities?.join(', ') || 'the local area';

    return `You are a friendly and professional AI receptionist for ${org.name}, a plumbing company.

## Your Role
- Answer incoming calls professionally
- Help callers with scheduling, questions, and emergencies
- Collect information to help the team follow up
- Be warm, helpful, and efficient

## Business Information
- Company: ${org.name}
- Service Area: ${citiesText}
- Business Hours: ${hoursText || 'Monday-Friday 8am-6pm'}

## Services Offered
- Emergency repairs (flooding, burst pipes, no hot water)
- Water heater installation and repair
- Drain cleaning and unclogging
- Faucet and fixture repair
- Toilet repair and installation
- Sewer line services
- General plumbing maintenance

## Key Guidelines
1. **Emergencies**: If caller mentions flooding, burst pipe, gas smell, or no water - treat as urgent. Collect their address and phone number immediately.
2. **Scheduling**: Collect name, phone, address, and brief description of the issue. Let them know someone will call back to confirm the appointment.
3. **Pricing**: Don't quote specific prices. Say "pricing depends on the specific situation, but we offer free estimates."
4. **After Hours**: If calling outside business hours, let them know and offer to take a message for callback first thing in the morning.
5. **Escalation**: If caller asks for a manager or seems frustrated, apologize and assure them someone will call back within the hour.

## Conversation Flow
1. Greet warmly and ask how you can help
2. Listen to their need
3. Ask clarifying questions if needed
4. Collect contact info (name, phone, address)
5. Summarize next steps
6. Thank them and end professionally

## Important
- Keep responses concise (2-3 sentences max)
- Be conversational, not robotic
- If you don't know something, say you'll have someone call them back
- Always confirm the callback number before ending`;
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
          description: 'Transfer the call to a human agent when requested or for complex issues',
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Reason for transfer',
              },
            },
            required: ['reason'],
          },
        },
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

    console.log(`🤖 Created Vapi assistant for ${org.name}: ${assistantId}`);
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
    console.log(`🔧 Vapi tool call: ${toolName}`, args);

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

      console.log(`📅 AI booked appointment: ${job.id} for ${customer_name}`);

      return {
        success: true,
        message: is_emergency
          ? "I've marked this as an emergency. Someone will call you back within 15 minutes."
          : "Great, I've scheduled that for you. Someone from our team will call to confirm the exact time.",
        jobId: job.id,
      };
    } catch (error) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        message: "I'm having trouble booking that right now. Let me take your information and have someone call you back.",
      };
    }
  }

  /**
   * Handle checking availability
   */
  private async handleCheckAvailability(
    args: Record<string, unknown>,
    context: { organizationId: string }
  ): Promise<{ available: boolean; slots: string[]; message: string }> {
    // For now, return mock availability
    // In production, integrate with actual scheduling system
    const date = args.date as string;

    return {
      available: true,
      slots: ['9:00 AM - 11:00 AM', '1:00 PM - 3:00 PM', '3:00 PM - 5:00 PM'],
      message: `We have availability on ${date}. Would morning or afternoon work better for you?`,
    };
  }

  /**
   * Handle transfer to human
   */
  private async handleTransferToHuman(
    args: Record<string, unknown>,
    context: { organizationId: string; callId: string }
  ): Promise<{ success: boolean; message: string }> {
    console.log(`📞 Transfer requested: ${args.reason}`);

    // In production, this would trigger an actual transfer
    // For now, we'll just note it
    if (context.callId) {
      await prisma.call.update({
        where: { id: context.callId },
        data: {
          summary: `Transfer requested: ${args.reason}`,
        },
      });
    }

    return {
      success: true,
      message: "I understand. Let me connect you with someone who can help. Please hold for just a moment.",
    };
  }
}

// Singleton instance
export const vapi = new VapiService();
export default vapi;
