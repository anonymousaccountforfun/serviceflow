/**
 * Claude/Anthropic AI Provider Implementation
 *
 * Note: Tool support requires @anthropic-ai/sdk >= 0.20.0
 * Currently using 0.14.x which has limited tool support.
 * Tools are disabled until SDK is upgraded.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../lib/logger';
import {
  AIProvider,
  AIProviderOptions,
  AIResponse,
  Message,
  ToolCall,
  ToolDefinition,
  registerProvider,
} from './provider';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const DEFAULT_MAX_TOKENS = 4096;

// Type for message content blocks
interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ToolUseBlock;

class ClaudeProvider implements AIProvider {
  name = 'claude';
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async sendMessage(
    messages: Message[],
    _tools?: ToolDefinition[],
    options?: AIProviderOptions
  ): Promise<AIResponse> {
    const client = this.getClient();
    const model = options?.model || process.env.AI_MODEL || DEFAULT_MODEL;
    const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

    // Separate system message from conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Convert messages to Anthropic format
    const anthropicMessages = this.convertMessages(conversationMessages);

    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemMessages.map(m => m.content).join('\n\n') || undefined,
        messages: anthropicMessages,
        // Note: tools parameter requires SDK >= 0.20.0
        // tools: anthropicTools,
        temperature: options?.temperature,
      });

      return this.convertResponse(response);
    } catch (error) {
      logger.error('Claude API error', { error });
      throw error;
    }
  }

  async *streamMessage(
    messages: Message[],
    _tools?: ToolDefinition[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, AIResponse> {
    const client = this.getClient();
    const model = options?.model || process.env.AI_MODEL || DEFAULT_MODEL;
    const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const anthropicMessages = this.convertMessages(conversationMessages);

    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemMessages.map(m => m.content).join('\n\n') || undefined,
      messages: anthropicMessages,
      // Note: tools parameter requires SDK >= 0.20.0
      temperature: options?.temperature,
    });

    let fullContent = '';
    const toolCalls: ToolCall[] = [];
    let currentToolCall: Partial<ToolCall> | null = null;
    let toolInputJson = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type: string; text?: string; partial_json?: string };
        if (delta.type === 'text_delta' && delta.text) {
          fullContent += delta.text;
          yield delta.text;
        } else if (delta.type === 'input_json_delta' && delta.partial_json) {
          toolInputJson += delta.partial_json;
        }
      } else if (event.type === 'content_block_start') {
        const block = event.content_block as { type: string; id?: string; name?: string };
        if (block.type === 'tool_use') {
          currentToolCall = {
            id: block.id,
            name: block.name,
          };
          toolInputJson = '';
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolCall && currentToolCall.id && currentToolCall.name) {
          try {
            currentToolCall.arguments = JSON.parse(toolInputJson || '{}');
            toolCalls.push(currentToolCall as ToolCall);
          } catch {
            logger.error('Failed to parse tool arguments', { toolInputJson });
          }
          currentToolCall = null;
        }
      }
    }

    const finalMessage = await stream.finalMessage();

    return {
      content: fullContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      },
      stopReason: this.convertStopReason(finalMessage.stop_reason),
    };
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          // For SDK 0.14.x, we need to format tool calls as text
          // since the SDK doesn't fully support tool_use content blocks
          let content = msg.content || '';
          for (const tc of msg.toolCalls) {
            content += `\n[Tool Call: ${tc.name}(${JSON.stringify(tc.arguments)})]`;
          }
          result.push({ role: 'assistant', content });
        } else {
          result.push({ role: 'assistant', content: msg.content });
        }
      } else if (msg.role === 'tool') {
        // Tool results formatted as user messages for SDK 0.14.x
        result.push({
          role: 'user',
          content: `[Tool Result for ${msg.toolCallId}]: ${msg.content}`,
        });
      }
    }

    return result;
  }

  private convertResponse(response: Anthropic.Message): AIResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      // Type guard to handle both text and tool_use blocks
      const typedBlock = block as ContentBlock;
      if (typedBlock.type === 'text') {
        content += typedBlock.text;
      } else if (typedBlock.type === 'tool_use') {
        toolCalls.push({
          id: typedBlock.id,
          name: typedBlock.name,
          arguments: typedBlock.input,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: this.convertStopReason(response.stop_reason),
    };
  }

  private convertStopReason(
    reason: string | null
  ): 'end_turn' | 'tool_use' | 'max_tokens' | undefined {
    switch (reason) {
      case 'end_turn':
        return 'end_turn';
      case 'tool_use':
        return 'tool_use';
      case 'max_tokens':
        return 'max_tokens';
      default:
        return undefined;
    }
  }
}

// Create and register the Claude provider
const claudeProvider = new ClaudeProvider();
registerProvider(claudeProvider, true);

export { claudeProvider };
