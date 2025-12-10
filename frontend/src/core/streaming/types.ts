/**
 * Unified Streaming Types
 * 
 * This module defines the type system for the unified streaming architecture.
 * It uses discriminated unions for type-safe event handling and a state machine
 * pattern for predictable state transitions.
 */

import type { RagContextNote } from '../../types/rag';
import type { GroundingSource, CodeExecutionResult, GrokSearchSource, GrokThinkingStep, GeneratedImage } from '../../types/chat';

// ============================================
// Stream Event Types (maps to backend SSE events)
// ============================================

/**
 * All possible stream event type identifiers
 */
export type StreamEventType =
  | 'stream:start'
  | 'stream:end'
  | 'stream:error'
  | 'content:text'
  | 'content:thinking'
  | 'content:thinking:end'
  | 'tool:start'
  | 'tool:end'
  | 'rag:context'
  | 'grounding:sources'
  | 'code:execution'
  | 'status:update'
  | 'grok:search'
  | 'grok:thinking'
  | 'image:start'
  | 'image:progress'
  | 'image:complete'
  | 'image:error';

/**
 * Tool execution state during streaming
 */
export interface StreamToolExecution {
  id: string;
  tool: string;
  arguments: string;
  result?: string;
  status: 'executing' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  error?: string;
}

/**
 * Process event for unified timeline.
 * Tracks thinking, tool, and text events in chronological order.
 * Text events capture content streamed between other events (e.g., before tool calls).
 * Each event has a unique ID for stable React keys.
 */
export type ProcessEvent =
  | { type: 'thinking'; id: string; content: string; timestamp: number; isComplete: boolean }
  | { type: 'tool'; id: string; execution: StreamToolExecution }
  | { type: 'text'; id: string; content: string; timestamp: number };

/**
 * Discriminated union for type-safe event handling.
 * Each event type has a specific payload structure.
 */
export type StreamEvent =
  | { type: 'stream:start'; timestamp: number }
  | { type: 'stream:end'; ragLogId?: string; inputTokens?: number; outputTokens?: number }
  | { type: 'stream:error'; error: string; recoverable: boolean }
  | { type: 'content:text'; delta: string }
  | { type: 'content:thinking'; content: string; isComplete?: boolean }
  | { type: 'content:thinking:end' }
  | { type: 'tool:start'; toolId: string; tool: string; args: string }
  | { type: 'tool:end'; toolId: string; tool: string; result: string; success: boolean }
  | { type: 'rag:context'; notes: RagContextNote[]; ragLogId?: string }
  | { type: 'grounding:sources'; sources: GroundingSource[] }
  | { type: 'code:execution'; result: CodeExecutionResult }
  | { type: 'status:update'; status: string }
  | { type: 'grok:search'; sources: GrokSearchSource[] }
  | { type: 'grok:thinking'; step: GrokThinkingStep }
  | { type: 'image:start'; provider: string; model: string; prompt: string }
  | { type: 'image:progress'; stage: ImageGenerationStage; progress?: number }
  | { type: 'image:complete'; images: GeneratedImage[] }
  | { type: 'image:error'; error: string };

// ============================================
// Stream State Types
// ============================================

/**
 * Image generation stage for progress tracking
 */
export type ImageGenerationStage =
  | 'idle'        // No image generation in progress
  | 'preparing'   // Preparing the request
  | 'generating'  // Actively generating the image
  | 'processing'  // Processing the generated image
  | 'complete'    // Generation complete
  | 'error';      // Generation failed

/**
 * Image generation state during streaming
 */
export interface ImageGenerationState {
  /** Whether image generation is in progress */
  inProgress: boolean;
  /** The provider being used (e.g., "OpenAI", "Gemini", "Grok") */
  provider: string | null;
  /** The model being used (e.g., "dall-e-3") */
  model: string | null;
  /** The prompt used for generation */
  prompt: string | null;
  /** Current stage of image generation */
  stage: ImageGenerationStage;
  /** Progress percentage (0-100), if available */
  progress: number | null;
  /** Generated images */
  images: GeneratedImage[];
  /** Error message if generation failed */
  error: string | null;
}

/**
 * Stream phases (state machine states).
 * Represents the current phase of the streaming process.
 */
export type StreamPhase =
  | 'idle'             // No active stream
  | 'connecting'       // Initiating connection
  | 'streaming'        // Receiving content (text/thinking/etc)
  | 'tool-execution'   // Tool is being executed
  | 'image-generation' // Image is being generated
  | 'finalizing'       // Stream ending, cleanup in progress
  | 'complete'         // Stream finished successfully
  | 'error';           // Stream encountered an error

/**
 * Stream status for UI display
 */
export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'paused' | 'error' | 'complete';

/**
 * Error information with recovery hints
 */
export interface StreamError {
  message: string;
  recoverable: boolean;
  code?: string;
  retryAfterMs?: number;
}

/**
 * Unified stream state.
 * This is the single source of truth for all streaming state.
 */
export interface UnifiedStreamState {
  // Core state
  phase: StreamPhase;
  status: StreamStatus;

  // Content accumulation
  textContent: string;
  /**
   * Length of textContent that has been captured in the timeline as text events.
   * Used to track which text has already been shown in timeline entries
   * so it won't be duplicated in the main response bubble.
   * @deprecated Timeline is now the source of truth - this is kept for backward compatibility
   */
  textContentInTimeline: number;
  /** Current thinking content - kept for backward compatibility with legacy code paths */
  thinkingContent: string;
  /** Whether current thinking block is complete - kept for backward compatibility */
  isThinkingComplete: boolean;

  // Tool executions
  activeTools: Map<string, StreamToolExecution>;
  completedTools: StreamToolExecution[];

  // Unified process timeline (thinking + tools in chronological order)
  processTimeline: ProcessEvent[];

  // Context and sources
  ragContext: RagContextNote[];
  groundingSources: GroundingSource[];
  grokSearchSources: GrokSearchSource[];
  grokThinkingSteps: GrokThinkingStep[];
  codeExecution: CodeExecutionResult | null;

  // Image generation
  imageGeneration: ImageGenerationState;

  // Processing status (agent mode)
  processingStatus: string | null;

  // Token metrics
  inputTokens: number;
  outputTokens: number;

  // Timing
  startTime: number | null;
  duration: number | null;

  // RAG tracking
  ragLogId: string | null;

  // Error handling
  error: StreamError | null;
  retryCount: number;
}

/**
 * Initial image generation state
 */
export const initialImageGenerationState: ImageGenerationState = {
  inProgress: false,
  provider: null,
  model: null,
  prompt: null,
  stage: 'idle',
  progress: null,
  images: [],
  error: null,
};

/**
 * Initial state for the stream reducer
 */
export const initialStreamState: UnifiedStreamState = {
  phase: 'idle',
  status: 'idle',
  textContent: '',
  textContentInTimeline: 0,
  thinkingContent: '',
  isThinkingComplete: false,
  activeTools: new Map(),
  completedTools: [],
  processTimeline: [],
  ragContext: [],
  groundingSources: [],
  grokSearchSources: [],
  grokThinkingSteps: [],
  codeExecution: null,
  imageGeneration: initialImageGenerationState,
  processingStatus: null,
  inputTokens: 0,
  outputTokens: 0,
  startTime: null,
  duration: null,
  ragLogId: null,
  error: null,
  retryCount: 0,
};

// ============================================
// Stream Actions (Reducer Actions)
// ============================================

/**
 * Actions that can be dispatched to the stream reducer
 */
export type StreamAction =
  | { type: 'CONNECT' }
  | { type: 'EVENT'; event: StreamEvent }
  | { type: 'CANCEL' }
  | { type: 'RESET' }
  | { type: 'SET_INPUT_TOKENS'; tokens: number }
  | { type: 'INCREMENT_RETRY' };

// ============================================
// Hook Options and Return Types
// ============================================

/**
 * Options for the useUnifiedStream hook
 */
export interface UseUnifiedStreamOptions {
  /** Streaming mode: 'chat' for regular chat, 'agent' for agent mode */
  mode: 'chat' | 'agent';
  /** The conversation ID to stream messages for */
  conversationId: string;
  /** Callback when stream completes successfully */
  onComplete?: (state: UnifiedStreamState) => void;
  /** Callback when stream encounters an error */
  onError?: (error: StreamError) => void;
  /** Maximum number of automatic retries on failure */
  maxRetries?: number;
}

/**
 * Request payload for sending a streaming message
 */
export interface StreamMessageRequest {
  content: string;
  /** 
   * Override the conversation ID for this request.
   * Useful when the conversation is created dynamically (e.g., new chat).
   */
  conversationId?: string;
  temperature?: number;
  maxTokens?: number;
  /** For chat mode: enable RAG */
  useRag?: boolean;
  /** User ID for RAG context */
  userId?: string;
  /** Vector store provider for RAG */
  vectorStoreProvider?: string;
  /** For agent mode: enabled capabilities */
  capabilities?: string[];
  /** Attached images for multimodal messages */
  images?: Array<{
    base64Data: string;
    mediaType: string;
    fileName?: string;
  }>;
  /** Gemini: Enable grounding with Google Search */
  enableGrounding?: boolean;
  /** Gemini: Enable code execution */
  enableCodeExecution?: boolean;
  /** Gemini: Enable thinking mode */
  enableThinking?: boolean;
  /** Gemini: Context cache name */
  contextCacheName?: string;
  /** Gemini: Thinking budget tokens */
  thinkingBudget?: number;
}

/**
 * Request payload for generating an image via the unified stream
 */
export interface ImageGenerationStreamRequest {
  /** The prompt describing the image to generate */
  prompt: string;
  /** Image generation provider (e.g., "OpenAI", "Gemini", "Grok") */
  provider: string;
  /** Model to use for generation */
  model: string;
  /** 
   * Override the conversation ID for this request.
   * Useful when the conversation is created dynamically (e.g., new chat).
   */
  conversationId?: string;
  /** Image size (e.g., "1024x1024") */
  size?: string;
  /** Quality setting (e.g., "standard", "hd") */
  quality?: string;
  /** Style setting (e.g., "vivid", "natural") */
  style?: string;
  /** Number of images to generate */
  count?: number;
}

/**
 * Return type for the useUnifiedStream hook
 */
export interface UseUnifiedStreamReturn extends UnifiedStreamState {
  /** Send a streaming message */
  send: (request: StreamMessageRequest) => Promise<void>;
  /** Generate an image using the unified stream protocol */
  generateImage: (request: ImageGenerationStreamRequest) => Promise<void>;
  /** Cancel the current stream or image generation */
  cancel: () => void;
  /** Reset the stream state */
  reset: () => void;
  /** Whether the stream is currently active */
  isActive: boolean;
  /** Whether there is any content to display */
  hasContent: boolean;
  /** Whether image generation is in progress */
  isGeneratingImage: boolean;
}

// ============================================
// Backend SSE Event Mapping
// ============================================

/**
 * Backend SSE event names mapped to unified event types.
 * This is used by the StreamEventProcessor to convert backend events.
 */
export const BACKEND_EVENT_MAP: Record<string, StreamEventType | ((data: unknown) => StreamEventType)> = {
  'start': 'stream:start',
  'end': 'stream:end',
  'error': 'stream:error',
  'message': 'content:text',
  'data': 'content:text',
  'thinking': 'content:thinking',
  'tool_start': 'tool:start',
  'tool_end': 'tool:end',
  'rag': 'rag:context',
  'context_retrieval': 'rag:context',
  'grounding': 'grounding:sources',
  'code_execution': 'code:execution',
  'status': 'status:update',
} as const;

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for checking if a value is a valid StreamEvent
 */
export function isStreamEvent(value: unknown): value is StreamEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as { type?: unknown };
  return typeof event.type === 'string';
}

/**
 * Type guard for checking if phase indicates active streaming
 */
export function isActivePhase(phase: StreamPhase): boolean {
  return phase === 'connecting' || phase === 'streaming' || phase === 'tool-execution' || phase === 'image-generation' || phase === 'finalizing';
}

/**
 * Type guard for checking if status indicates streaming
 */
export function isStreamingStatus(status: StreamStatus): boolean {
  return status === 'connecting' || status === 'streaming';
}
