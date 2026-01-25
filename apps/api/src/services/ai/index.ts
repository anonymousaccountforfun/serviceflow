/**
 * AI Service Module
 * Central export point for AI functionality
 */

// Provider abstraction and types
export {
  AIProvider,
  AIProviderOptions,
  AIResponse,
  Message,
  ToolCall,
  ToolDefinition,
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
export {
  aiTools,
  executeToolCall,
  ToolContext,
  ToolResult,
} from './tools';

// Conversation management
export {
  AIConversationManager,
  ConversationConfig,
  ConversationResult,
  createConversation,
} from './conversation';
