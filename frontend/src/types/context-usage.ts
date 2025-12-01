/**
 * Context Usage Types
 * Types for tracking and displaying AI model context window usage.
 */

/**
 * Breakdown of context usage by category
 */
export interface ContextUsageBreakdown {
  /** System prompt tokens (instructions, personality, etc.) */
  systemPrompt: number;
  /** Message history tokens (all previous messages in conversation) */
  messageHistory: number;
  /** Tool/function definitions tokens (when agent mode enabled) */
  toolDefinitions: number;
  /** Tool execution results tokens (accumulated tool outputs) */
  toolResults: number;
  /** RAG context tokens (retrieved notes/documents) */
  ragContext: number;
  /** Current user input tokens (the message being sent) */
  currentInput: number;
  /** Total tokens used */
  total: number;
}

/**
 * Complete context usage state
 */
export interface ContextUsageState {
  /** Detailed breakdown by category */
  breakdown: ContextUsageBreakdown;
  /** Maximum tokens available for the current model */
  maxTokens: number;
  /** Percentage of context used (0-100) */
  percentUsed: number;
  /** Warning level based on usage */
  warningLevel: 'normal' | 'warning' | 'critical';
}

/**
 * Context usage display configuration
 */
export interface ContextUsageDisplayConfig {
  /** Show detailed breakdown on hover/click */
  showBreakdown: boolean;
  /** Show percentage vs token counts */
  showPercentage: boolean;
  /** Animate progress bar changes */
  animate: boolean;
  /** Compact mode for smaller displays */
  compact: boolean;
}

/**
 * Default empty context usage breakdown
 */
export const EMPTY_CONTEXT_BREAKDOWN: ContextUsageBreakdown = {
  systemPrompt: 0,
  messageHistory: 0,
  toolDefinitions: 0,
  toolResults: 0,
  ragContext: 0,
  currentInput: 0,
  total: 0,
};

/**
 * Estimated token counts for system components
 * These are approximations based on typical usage patterns
 */
export const CONTEXT_ESTIMATION_CONSTANTS = {
  /** Base system prompt tokens (without agent mode) */
  BASE_SYSTEM_PROMPT: 150,
  /** Additional system prompt tokens when agent mode is enabled */
  AGENT_SYSTEM_PROMPT_ADDITION: 500,
  /** Tokens per enabled agent capability */
  TOKENS_PER_CAPABILITY: 200,
  /** Average tokens per tool definition */
  TOKENS_PER_TOOL_DEFINITION: 250,
  /** Overhead tokens per message (role, formatting, etc.) */
  MESSAGE_OVERHEAD: 10,
  /** RAG context header/footer tokens */
  RAG_CONTEXT_OVERHEAD: 50,
} as const;

