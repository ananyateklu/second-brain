/**
 * useUnifiedStream Hook
 * 
 * Unified streaming hook that handles both chat and agent streaming modes.
 * Replaces the separate useChatStream, useAgentStream, and useCombinedStreaming hooks.
 * 
 * @example
 * ```tsx
 * import { useUnifiedStream } from '@/hooks/use-unified-stream';
 * 
 * function ChatComponent({ conversationId, agentMode }) {
 *   const stream = useUnifiedStream({
 *     mode: agentMode ? 'agent' : 'chat',
 *     conversationId,
 *   });
 * 
 *   const handleSend = async (message: string) => {
 *     await stream.send({ content: message });
 *   };
 * 
 *   return (
 *     <div>
 *       {stream.textContent}
 *       {stream.isActive && <LoadingSpinner />}
 *     </div>
 *   );
 * }
 * ```
 */

import { useReducer, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { getApiBaseUrl, API_ENDPOINTS, RETRY, conversationKeys, noteKeys } from '../lib/constants';
import { estimateTokenCount } from '../utils/token-utils';
import {
  streamReducer,
  getInitialStreamState,
  isStreamActive,
  hasStreamContent,
  isImageGenerationActive,
} from '../core/streaming/stream-reducer';
import { StreamEventProcessor } from '../core/streaming/stream-event-processor';
import { chatService } from '../services';
import type {
  UnifiedStreamState,
  UseUnifiedStreamOptions,
  StreamMessageRequest,
  ImageGenerationStreamRequest,
  UseUnifiedStreamReturn,
  StreamEvent,
} from '../core/streaming/types';

// ============================================
// Hook Implementation
// ============================================

/**
 * Unified streaming hook for chat and agent modes
 */
export function useUnifiedStream(options: UseUnifiedStreamOptions): UseUnifiedStreamReturn {
  const {
    mode,
    conversationId,
    onComplete,
    onError,
    maxRetries = RETRY.MAX_RETRIES,
  } = options;

  // State management
  const [state, dispatch] = useReducer(streamReducer, getInitialStreamState());

  // Refs for cleanup and mutable state
  const abortControllerRef = useRef<AbortController | null>(null);
  const processorRef = useRef<StreamEventProcessor | null>(null);
  const queryClient = useQueryClient();

  // Track the effective conversationId for the current request
  const currentConversationIdRef = useRef<string>(conversationId);

  // Memoized derived values
  const isActive = useMemo(() => isStreamActive(state), [state]);
  const hasContent = useMemo(() => hasStreamContent(state), [state]);
  const isGeneratingImage = useMemo(() => isImageGenerationActive(state), [state]);

  /**
   * Get the streaming endpoint based on mode
   * @param overrideConversationId - Optional conversation ID to use instead of the hook's default
   */
  const getStreamUrl = useCallback((overrideConversationId?: string): string => {
    const effectiveConversationId = overrideConversationId || conversationId;
    if (!effectiveConversationId) {
      throw new Error('Cannot stream without a conversation ID');
    }
    const apiUrl = getApiBaseUrl();
    const endpoint = mode === 'agent'
      ? API_ENDPOINTS.AGENT.STREAM(effectiveConversationId)
      : API_ENDPOINTS.CHAT.STREAM_MESSAGES(effectiveConversationId);
    return `${apiUrl}${endpoint}`;
  }, [mode, conversationId]);

  /**
   * Get auth headers for the request
   */
  const getAuthHeaders = useCallback((): HeadersInit => {
    const authStore = useAuthStore.getState();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    return headers;
  }, []);

  /**
   * Build the request body based on mode and options
   */
  const buildRequestBody = useCallback((request: StreamMessageRequest): Record<string, unknown> => {
    if (mode === 'agent') {
      return {
        content: request.content,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        capabilities: request.capabilities,
      };
    }

    // Chat mode
    return {
      content: request.content,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      useRag: request.useRag,
      userId: request.userId,
      vectorStoreProvider: request.vectorStoreProvider,
      images: request.images,
      enableGrounding: request.enableGrounding,
      enableCodeExecution: request.enableCodeExecution,
      enableThinking: request.enableThinking,
      contextCacheName: request.contextCacheName,
      thinkingBudget: request.thinkingBudget,
    };
  }, [mode]);

  /**
   * Process events from the stream
   */
  const processEvents = useCallback((events: StreamEvent[]) => {
    for (const event of events) {
      dispatch({ type: 'EVENT', event });
    }
  }, []);

  /**
   * Handle stream completion
   */
  const handleComplete = useCallback((finalState: UnifiedStreamState) => {
    // Use the tracked conversationId from the current request
    const effectiveConversationId = currentConversationIdRef.current;

    // Invalidate queries to refresh conversation data
    setTimeout(() => {
      if (effectiveConversationId) {
        void queryClient.invalidateQueries({ queryKey: conversationKeys.detail(effectiveConversationId) });
      }
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });

      // In agent mode, also invalidate notes (agent may have modified them)
      if (mode === 'agent') {
        void queryClient.invalidateQueries({ queryKey: noteKeys.all });
      }
    }, 150);

    onComplete?.(finalState);
  }, [queryClient, mode, onComplete]);

  // Ref for retry function to avoid circular dependency
  const retryRequestRef = useRef<((request: StreamMessageRequest, retryCount: number) => void) | null>(null);

  /**
   * Handle stream error with retry logic
   */
  const handleError = useCallback((error: Error, retryCount: number, request: StreamMessageRequest) => {
    console.error('Stream error:', { error, retryCount, mode });

    // Check if error is retryable
    const isRetryable = (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout') ||
      error.message.includes('Failed to fetch')
    );

    if (isRetryable && retryCount < maxRetries && retryRequestRef.current) {
      // Exponential backoff
      const delay = Math.min(RETRY.BASE_DELAY * Math.pow(RETRY.BACKOFF_FACTOR, retryCount), RETRY.MAX_DELAY);
      dispatch({ type: 'INCREMENT_RETRY' });

      setTimeout(() => {
        retryRequestRef.current?.(request, retryCount + 1);
      }, delay);
      return;
    }

    // Non-retryable or max retries exceeded
    dispatch({
      type: 'EVENT',
      event: {
        type: 'stream:error',
        error: error.message,
        recoverable: isRetryable && retryCount < maxRetries,
      },
    });

    onError?.({
      message: error.message,
      recoverable: false,
    });
  }, [maxRetries, mode, onError]);

  /**
   * Internal send function with retry support
   */
  const sendInternal = useCallback(async (
    request: StreamMessageRequest,
    retryCount = 0
  ): Promise<void> => {
    // Store the effective conversationId for this request
    const effectiveConversationId = request.conversationId || conversationId;
    if (!effectiveConversationId) {
      throw new Error('Cannot stream without a conversation ID');
    }
    currentConversationIdRef.current = effectiveConversationId;

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Create new stream processor
    // Note: We only use onParseError callback here, NOT onEvent.
    // Events are dispatched via processEvents() after processChunk() returns.
    // Using both would cause double-dispatch and duplicate content.
    processorRef.current = new StreamEventProcessor({
      onParseError: (error, rawMessage) => {
        console.error('SSE parse error:', error, rawMessage);
      },
    });

    // Initialize state
    if (retryCount === 0) {
      dispatch({ type: 'CONNECT' });

      // Estimate input tokens
      const estimatedInputTokens = estimateTokenCount(request.content);
      dispatch({ type: 'SET_INPUT_TOKENS', tokens: estimatedInputTokens });
    }

    try {
      const response = await fetch(getStreamUrl(request.conversationId), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(buildRequestBody(request)),
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Flush any remaining buffer
          if (processorRef.current) {
            const remainingEvents = processorRef.current.flush();
            processEvents(remainingEvents);
          }
          break;
        }

        // Process chunk
        if (processorRef.current && value) {
          const events = processorRef.current.processChunk(value);
          processEvents(events);
        }
      }

      // Handle completion
      handleComplete(state);

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Stream was cancelled by user - dispatch cancel action
          dispatch({ type: 'CANCEL' });
          return;
        }
        handleError(error, retryCount, request);
      } else {
        handleError(new Error('Unknown error occurred during streaming'), retryCount, request);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [getStreamUrl, getAuthHeaders, buildRequestBody, processEvents, handleComplete, handleError, state, conversationId]);

  // Update retry ref when sendInternal changes
  useEffect(() => {
    retryRequestRef.current = (request: StreamMessageRequest, retryCount: number) => {
      void sendInternal(request, retryCount);
    };
  }, [sendInternal]);

  /**
   * Public send function
   */
  const send = useCallback(async (request: StreamMessageRequest): Promise<void> => {
    // Reset state before starting new stream
    dispatch({ type: 'RESET' });

    // Reset processor
    processorRef.current?.reset();

    await sendInternal(request, 0);
  }, [sendInternal]);

  /**
   * Cancel the current stream
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'CANCEL' });
  }, []);

  /**
   * Reset the stream state
   */
  const reset = useCallback(() => {
    // Cancel any active stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset processor
    processorRef.current?.reset();

    // Reset state
    dispatch({ type: 'RESET' });
  }, []);

  /**
   * Generate an image using the unified stream protocol
   * 
   * This method emits image events to the stream reducer and calls the
   * chat service to generate the image. Unlike text streaming, image
   * generation is not a true SSE stream, but we simulate the event flow
   * to maintain a consistent state machine pattern.
   */
  const generateImage = useCallback(async (request: ImageGenerationStreamRequest): Promise<void> => {
    // Store the effective conversationId for this request
    const effectiveConversationId = request.conversationId || conversationId;
    if (!effectiveConversationId) {
      throw new Error('Cannot generate image without a conversation ID');
    }
    currentConversationIdRef.current = effectiveConversationId;

    // Reset state before starting
    dispatch({ type: 'RESET' });

    // Emit image:start event
    dispatch({
      type: 'EVENT',
      event: {
        type: 'image:start',
        provider: request.provider,
        model: request.model,
        prompt: request.prompt,
      },
    });

    try {
      // Emit progress: preparing
      dispatch({
        type: 'EVENT',
        event: {
          type: 'image:progress',
          stage: 'preparing',
        },
      });

      // Small delay to show preparing state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Emit progress: generating
      dispatch({
        type: 'EVENT',
        event: {
          type: 'image:progress',
          stage: 'generating',
        },
      });

      // Call the image generation API
      const response = await chatService.generateImage(effectiveConversationId, {
        prompt: request.prompt,
        provider: request.provider,
        model: request.model,
        size: request.size,
        quality: request.quality,
        style: request.style,
        count: request.count ?? 1,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate image');
      }

      // Emit progress: processing
      dispatch({
        type: 'EVENT',
        event: {
          type: 'image:progress',
          stage: 'processing',
        },
      });

      // Small delay to show processing state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Emit image:complete event
      dispatch({
        type: 'EVENT',
        event: {
          type: 'image:complete',
          images: response.images,
        },
      });

      // Invalidate queries to refresh conversation data
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: conversationKeys.detail(effectiveConversationId) });
        void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      }, 150);

      // Call onComplete callback with final state
      onComplete?.(state);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';

      // Emit image:error event
      dispatch({
        type: 'EVENT',
        event: {
          type: 'image:error',
          error: errorMessage,
        },
      });

      onError?.({
        message: errorMessage,
        recoverable: false,
      });
    }
  }, [conversationId, queryClient, onComplete, onError, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Return unified interface
  return {
    ...state,
    send,
    generateImage,
    cancel,
    reset,
    isActive,
    hasContent,
    isGeneratingImage,
  };
}

// ============================================
// Helper Types for Legacy Compatibility
// ============================================

import type { RagContextNote } from '../types/rag';
import type { GroundingSource, CodeExecutionResult, GeneratedImage, GrokSearchSource } from '../types/chat';
import type { ToolExecution, ThinkingStep, RetrievedNoteContext } from '../features/agents/types/agent-types';
import type { ImageGenerationStage, ProcessEvent } from '../core/streaming/types';

/**
 * Legacy streaming state shape for backward compatibility.
 * Use this to create an adapter if needed during migration.
 */
export interface LegacyStreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
  ragLogId?: string;
  groundingSources?: GroundingSource[];
  codeExecutionResult?: CodeExecutionResult | null;
  thinkingProcess?: string;
  // Grok-specific
  grokSearchSources?: GrokSearchSource[];
  // Agent-specific - unified timeline
  processTimeline: ProcessEvent[];
  toolExecutions: ToolExecution[];
  thinkingSteps: ThinkingStep[];
  agentRetrievedNotes: RetrievedNoteContext[];
  processingStatus: string | null;
  // Image generation
  isGeneratingImage: boolean;
  imageGenerationStage: ImageGenerationStage;
  imageGenerationProvider: string | null;
  imageGenerationModel: string | null;
  imageGenerationPrompt: string | null;
  imageGenerationProgress: number | null;
  generatedImages: GeneratedImage[];
  imageGenerationError: string | null;
}

/**
 * Create a legacy-compatible state adapter.
 * Use this during migration to maintain backward compatibility.
 */
export function createLegacyAdapter(state: UnifiedStreamState): LegacyStreamingState {
  const isStreaming = isStreamActive(state);

  // Derive thinkingSteps and toolExecutions from processTimeline
  // This maintains chronological order as events occurred
  const thinkingSteps: ThinkingStep[] = [];
  const toolExecutions: ToolExecution[] = [];

  for (const event of state.processTimeline) {
    if (event.type === 'thinking') {
      thinkingSteps.push({
        content: event.content,
        timestamp: new Date(event.timestamp),
      });
    } else if (event.type === 'tool') {
      toolExecutions.push({
        tool: event.execution.tool,
        arguments: event.execution.arguments,
        result: event.execution.result ?? '',
        status: event.execution.status,
        timestamp: new Date(event.execution.startedAt),
      });
    }
  }

  return {
    isStreaming,
    streamingMessage: state.textContent,
    streamingError: state.error ? new Error(state.error.message) : null,
    retrievedNotes: state.ragContext,
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    streamDuration: state.duration ?? undefined,
    ragLogId: state.ragLogId ?? undefined,
    groundingSources: state.groundingSources,
    codeExecutionResult: state.codeExecution,
    thinkingProcess: state.thinkingContent || undefined,
    // Grok-specific
    grokSearchSources: state.grokSearchSources,
    // Agent-specific - unified timeline
    processTimeline: state.processTimeline,
    toolExecutions,
    thinkingSteps,
    agentRetrievedNotes: state.ragContext.map(note => ({
      noteId: note.noteId,
      title: note.title,
      preview: note.chunkContent,
      tags: note.tags,
      similarityScore: note.relevanceScore,
    })),
    processingStatus: state.processingStatus,
    // Image generation
    isGeneratingImage: state.imageGeneration.inProgress,
    imageGenerationStage: state.imageGeneration.stage,
    imageGenerationProvider: state.imageGeneration.provider,
    imageGenerationModel: state.imageGeneration.model,
    imageGenerationPrompt: state.imageGeneration.prompt,
    imageGenerationProgress: state.imageGeneration.progress,
    generatedImages: state.imageGeneration.images,
    imageGenerationError: state.imageGeneration.error,
  };
}

export default useUnifiedStream;
