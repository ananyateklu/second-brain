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
 * Estimated token counts for system components.
 * These values are calibrated against actual backend implementations:
 * - Agent system prompt: ~3200 chars in AgentService.GetSystemPrompt()
 * - Notes capability prompt: ~5000 chars in NotesPlugin.GetSystemPromptAddition()
 * - RAG wrapper: ~800+ chars in RagService.EnhancePromptWithContext()
 */
export const CONTEXT_ESTIMATION_CONSTANTS = {
  /** Base system prompt tokens (regular chat has no system prompt, agent mode adds ~3200 chars) */
  BASE_SYSTEM_PROMPT: 0,
  /** Additional system prompt tokens when agent mode is enabled (~3200 chars / 3.5 ≈ 914 tokens) */
  AGENT_SYSTEM_PROMPT_ADDITION: 900,
  /** Tokens per enabled agent capability (notes: ~5000 chars / 3.5 ≈ 1429 tokens) */
  TOKENS_PER_CAPABILITY: 1400,
  /** Average tokens per tool definition (function schema with description and parameters) */
  TOKENS_PER_TOOL_DEFINITION: 150,
  /** Overhead tokens per message (role, formatting, etc.) */
  MESSAGE_OVERHEAD: 10,
  /** RAG context instruction wrapper tokens (~800 chars / 3.5 ≈ 229 tokens) */
  RAG_CONTEXT_OVERHEAD: 230,
} as const;

