/**
 * AI Service Module
 * Central export point for AI functionality
 */

// Provider abstraction and types
export type {
  AIProvider,
  AIProviderOptions,
  AIResponse,
  Message,
  ToolCall,
  ToolDefinition,
} from './provider';

export {
  getDefaultProvider,
  getProvider,
  registerProvider,
  systemMessage,
  userMessage,
  assistantMessage,
  toolResultMessage,
  estimateTokens,
  truncateMessages,
} from './provider';

// Claude provider (registers itself on import)
export { claudeProvider } from './claude';

// Tool definitions and execution
export type { ToolContext, ToolResult } from './tools';
export { aiTools, executeToolCall } from './tools';

// Conversation management
export type { ConversationConfig, ConversationResult } from './conversation';
export { AIConversationManager, createConversation } from './conversation';
