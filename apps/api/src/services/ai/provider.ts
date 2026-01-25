/**
 * AI Provider Abstraction
 * Defines the interface for AI providers (Claude, GPT, etc.)
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens';
}

export interface AIProviderOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIProvider {
  name: string;
  sendMessage(
    messages: Message[],
    tools?: ToolDefinition[],
    options?: AIProviderOptions
  ): Promise<AIResponse>;

  streamMessage?(
    messages: Message[],
    tools?: ToolDefinition[],
    options?: AIProviderOptions
  ): AsyncGenerator<string, AIResponse>;
}

// Provider registry
const providers: Map<string, AIProvider> = new Map();
let defaultProviderName: string | null = null;

export function registerProvider(provider: AIProvider, isDefault = false): void {
  providers.set(provider.name, provider);
  if (isDefault || !defaultProviderName) {
    defaultProviderName = provider.name;
  }
}

export function getProvider(name: string): AIProvider | undefined {
  return providers.get(name);
}

export function getDefaultProvider(): AIProvider | undefined {
  if (!defaultProviderName) return undefined;
  return providers.get(defaultProviderName);
}

// Utility functions
export function systemMessage(content: string): Message {
  return { role: 'system', content };
}

export function userMessage(content: string): Message {
  return { role: 'user', content };
}

export function assistantMessage(content: string, toolCalls?: ToolCall[]): Message {
  return { role: 'assistant', content, toolCalls };
}

export function toolResultMessage(toolCallId: string, content: string): Message {
  return { role: 'tool', toolCallId, content };
}

// Token estimation (rough approximation: ~4 chars per token)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateMessages(
  messages: Message[],
  maxTokens: number,
  preserveSystem = true
): Message[] {
  const systemMessages = preserveSystem
    ? messages.filter(m => m.role === 'system')
    : [];
  const otherMessages = preserveSystem
    ? messages.filter(m => m.role !== 'system')
    : [...messages];

  let totalTokens = systemMessages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0
  );

  const result: Message[] = [];

  // Add messages from the end (most recent first)
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const msg = otherMessages[i];
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens <= maxTokens) {
      result.unshift(msg);
      totalTokens += msgTokens;
    } else {
      break;
    }
  }

  return [...systemMessages, ...result];
}
