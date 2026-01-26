/**
 * AI SMS Response Service
 *
 * Generates intelligent SMS responses using OpenAI's API.
 * Handles conversation context, business information, and response formatting.
 */

import { prisma } from '@serviceflow/database';
import { logger } from '../lib/logger';

// ============================================
// TYPES
// ============================================

export interface AIResponseOptions {
  organizationId: string;
  customerId: string;
  conversationId: string;
  customerMessage: string;
}

export interface AIResponseResult {
  success: boolean;
  response?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface ConversationContext {
  customerName: string;
  businessName: string;
  serviceType: string;
  recentMessages: Array<{
    direction: 'inbound' | 'outbound';
    content: string;
    senderType: string;
  }>;
  customerHistory: {
    jobCount: number;
    lifetimeValue: number;
    lastService?: string;
  };
}

// ============================================
// AI SMS SERVICE
// ============================================

class AISmsService {
  /**
   * Check if AI is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Generate an AI response for an incoming SMS
   */
  async generateResponse(options: AIResponseOptions): Promise<AIResponseResult> {
    const { organizationId, customerId, conversationId, customerMessage } = options;

    try {
      // 1. Check if AI is configured
      if (!this.isConfigured()) {
        logger.info('MOCK AI response generation (OpenAI not configured)');
        return this.generateMockResponse(customerMessage);
      }

      // 2. Gather conversation context
      const context = await this.getConversationContext(
        organizationId,
        customerId,
        conversationId
      );

      // 3. Build the prompt
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(customerMessage, context);

      // 4. Call OpenAI
      const response = await this.callOpenAI(systemPrompt, userPrompt);

      // 5. Post-process the response
      const processedResponse = this.postProcessResponse(response);

      return {
        success: true,
        response: processedResponse,
      };
    } catch (error: unknown) {
      logger.error('AI SMS generation error', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'AI_ERROR',
          message,
        },
      };
    }
  }

  /**
   * Get conversation context for better AI responses
   */
  private async getConversationContext(
    organizationId: string,
    customerId: string,
    conversationId: string
  ): Promise<ConversationContext> {
    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });

    // Get customer with job history
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { title: true, type: true, completedAt: true },
        },
      },
    });

    // Get recent messages in conversation
    const recentMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        direction: true,
        content: true,
        senderType: true,
      },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};

    return {
      customerName: customer?.firstName || 'Customer',
      businessName: org?.name || 'Our Business',
      serviceType: (settings.serviceType as string) || 'home services',
      recentMessages: recentMessages.reverse().map((m) => ({
        direction: m.direction as 'inbound' | 'outbound',
        content: m.content,
        senderType: m.senderType,
      })),
      customerHistory: {
        jobCount: customer?.jobCount || 0,
        lifetimeValue: customer?.lifetimeValue || 0,
        lastService: customer?.jobs[0]?.title,
      },
    };
  }

  /**
   * Build the system prompt for the AI
   */
  private buildSystemPrompt(context: ConversationContext): string {
    return `You are a helpful customer service assistant for ${context.businessName}, a ${context.serviceType} company.

Your job is to respond to customer text messages professionally and helpfully.

Guidelines:
- Be friendly, professional, and concise
- Keep responses under 160 characters when possible (SMS length limit)
- Never make up information about pricing, availability, or services you don't know
- If you can't answer something, say you'll have someone follow up
- Use the customer's name (${context.customerName}) when appropriate
- Don't use emojis unless the customer used them first
- For scheduling requests, say you'll have the team reach out to confirm availability
- For emergencies, suggest calling the business directly
- For pricing questions, say you'll have someone provide a quote

Customer history:
- Previous jobs: ${context.customerHistory.jobCount}
- Last service: ${context.customerHistory.lastService || 'None on record'}`;
  }

  /**
   * Build the user prompt with conversation history
   */
  private buildUserPrompt(customerMessage: string, context: ConversationContext): string {
    let prompt = '';

    // Include recent conversation history if available
    if (context.recentMessages.length > 1) {
      prompt += 'Recent conversation:\n';
      for (const msg of context.recentMessages.slice(-5)) {
        const sender = msg.direction === 'inbound' ? 'Customer' : 'Business';
        prompt += `${sender}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `Customer's new message: "${customerMessage}"\n\n`;
    prompt += 'Generate an appropriate response:';

    return prompt;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Post-process the AI response
   */
  private postProcessResponse(response: string): string {
    // Remove any quotation marks that might wrap the response
    let processed = response.trim();
    if (processed.startsWith('"') && processed.endsWith('"')) {
      processed = processed.slice(1, -1);
    }

    // Truncate if too long for SMS (keep under 320 for 2 segments)
    if (processed.length > 320) {
      processed = processed.substring(0, 317) + '...';
    }

    return processed;
  }

  /**
   * Generate a mock response when OpenAI is not configured
   */
  private generateMockResponse(customerMessage: string): AIResponseResult {
    const lowerMessage = customerMessage.toLowerCase();

    let response: string;

    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      response = "Thanks for reaching out! For emergencies, please call us directly. We'll prioritize your request.";
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
      response = "Thanks for your interest! We'll have someone reach out shortly with pricing information.";
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('appointment') || lowerMessage.includes('available')) {
      response = "Thanks for reaching out! Our team will contact you soon to schedule an appointment.";
    } else if (lowerMessage.includes('thank')) {
      response = "You're welcome! Let us know if there's anything else we can help with.";
    } else {
      response = "Thanks for your message! Our team will get back to you shortly. Is there anything specific we can help with?";
    }

    return {
      success: true,
      response,
    };
  }

  /**
   * Check if AI responses should be enabled for this organization
   */
  async shouldRespond(organizationId: string): Promise<{ enabled: boolean; reason?: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) {
      return { enabled: false, reason: 'Organization not found' };
    }

    const settings = (org.settings as Record<string, unknown>) || {};
    const aiSettings = (settings.aiSettings as Record<string, unknown>) || {};

    // Check if text AI is enabled (default to true if not set)
    const textEnabled = aiSettings.textEnabled !== false;

    if (!textEnabled) {
      return { enabled: false, reason: 'AI text responses disabled in settings' };
    }

    return { enabled: true };
  }
}

// Singleton instance
export const aiSms = new AISmsService();

export default aiSms;
