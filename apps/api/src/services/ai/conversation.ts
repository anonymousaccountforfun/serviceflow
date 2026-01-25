/**
 * AI Conversation Manager
 * Manages conversation state, history, and tool execution
 */

import { prisma } from '@serviceflow/database';
import { logger } from '../../lib/logger';
import {
  AIProvider,
  AIProviderOptions,
  AIResponse,
  Message,
  ToolDefinition,
  assistantMessage,
  getDefaultProvider,
  systemMessage,
  toolResultMessage,
  truncateMessages,
  userMessage,
} from './provider';
import { aiTools, executeToolCall, ToolContext, ToolResult } from './tools';

const MAX_TOOL_ITERATIONS = 10;
const MAX_CONTEXT_TOKENS = 8000;

export interface ConversationConfig {
  organizationId: string;
  customerId?: string;
  callId?: string;
  channel: 'sms' | 'voice' | 'web';
  maxIterations?: number;
}

export interface ConversationResult {
  response: string;
  toolsUsed: string[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class AIConversationManager {
  private provider: AIProvider;
  private messages: Message[] = [];
  private config: ConversationConfig;
  private toolsUsed: string[] = [];
  private totalUsage = { inputTokens: 0, outputTokens: 0 };

  constructor(config: ConversationConfig) {
    const provider = getDefaultProvider();
    if (!provider) {
      throw new Error('No AI provider registered');
    }
    this.provider = provider;
    this.config = config;
  }

  async initialize(): Promise<void> {
    const systemPrompt = await this.buildSystemPrompt();
    this.messages = [systemMessage(systemPrompt)];
  }

  async sendMessage(
    userContent: string,
    options?: AIProviderOptions
  ): Promise<ConversationResult> {
    this.messages.push(userMessage(userContent));

    // Truncate messages if needed
    this.messages = truncateMessages(this.messages, MAX_CONTEXT_TOKENS, true);

    let iterations = 0;
    const maxIterations = this.config.maxIterations || MAX_TOOL_ITERATIONS;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.provider.sendMessage(
        this.messages,
        aiTools,
        options
      );

      this.totalUsage.inputTokens += response.usage?.inputTokens || 0;
      this.totalUsage.outputTokens += response.usage?.outputTokens || 0;

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        this.messages.push(assistantMessage(response.content));
        return {
          response: response.content,
          toolsUsed: [...this.toolsUsed],
          usage: { ...this.totalUsage },
        };
      }

      // Add assistant message with tool calls
      this.messages.push(assistantMessage(response.content, response.toolCalls));

      // Execute each tool call
      const toolContext: ToolContext = {
        organizationId: this.config.organizationId,
        callId: this.config.callId,
        customerId: this.config.customerId,
      };

      for (const toolCall of response.toolCalls) {
        this.toolsUsed.push(toolCall.name);

        const result = await executeToolCall(toolCall, toolContext);
        const resultContent = JSON.stringify(result);

        this.messages.push(toolResultMessage(toolCall.id, resultContent));
      }

      // Continue loop to get AI's response to tool results
    }

    // Max iterations reached
    logger.warn('Max tool iterations reached', {
      iterations,
      organizationId: this.config.organizationId,
    });

    return {
      response: 'I apologize, but I encountered an issue processing your request. Let me transfer you to someone who can help.',
      toolsUsed: [...this.toolsUsed],
      usage: { ...this.totalUsage },
    };
  }

  private async buildSystemPrompt(): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { id: this.config.organizationId },
      select: {
        name: true,
        settings: true,
      },
    });

    if (!org) {
      throw new Error(`Organization not found: ${this.config.organizationId}`);
    }

    const settings = org.settings as Record<string, unknown> || {};
    const businessHours = settings.businessHours || '9 AM - 5 PM, Monday - Friday';
    const services = settings.services || 'general services';

    let customerContext = '';
    if (this.config.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: this.config.customerId },
        include: {
          appointments: {
            orderBy: { scheduledAt: 'desc' },
            take: 3,
            include: {
              job: { select: { title: true } },
            },
          },
        },
      });

      if (customer) {
        customerContext = `
RETURNING CUSTOMER:
- Name: ${customer.firstName} ${customer.lastName}
- Phone: ${customer.phone}
- Previous appointments: ${customer.appointments.length > 0
          ? customer.appointments.map(a => `${a.job.title} on ${a.scheduledAt.toLocaleDateString()}`).join(', ')
          : 'None on file'}
`;
      }
    }

    return `You are a helpful, professional phone receptionist for ${org.name}.

BUSINESS INFORMATION:
- Business Name: ${org.name}
- Hours: ${businessHours}
- Services: ${services}
${customerContext}

YOUR ROLE:
- Answer calls professionally and warmly
- Help customers book appointments
- Provide information about services
- Take messages and create leads when needed
- Transfer to a human when the customer asks or when issues are complex

GUIDELINES:
- Be concise and natural - this is a phone conversation
- Confirm details before booking appointments
- If you don't know something, offer to transfer to a team member
- Always be polite and helpful
- Use the tools available to check availability and book appointments
- Today's date is ${new Date().toLocaleDateString()}

IMPORTANT:
- Never make up availability - always use the check_availability tool
- Never confirm appointments without using the book_appointment tool
- If a customer seems frustrated or asks for a human, use transfer_to_human`;
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getUsage(): { inputTokens: number; outputTokens: number } {
    return { ...this.totalUsage };
  }
}

// Factory function for creating conversation managers
export async function createConversation(
  config: ConversationConfig
): Promise<AIConversationManager> {
  const manager = new AIConversationManager(config);
  await manager.initialize();
  return manager;
}
