/**
 * Stream Reducer
 * 
 * State machine reducer for managing unified streaming state.
 * Handles state transitions based on stream events and actions.
 */

import type {
  UnifiedStreamState,
  StreamAction,
  StreamEvent,
  StreamToolExecution,
  StreamPhase,
  ImageGenerationState,
  ProcessEvent,
} from './types';
import { initialStreamState } from './types';
import { estimateTokenCount } from '../../utils/token-utils';

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate duration from start time
 */
function calculateDuration(state: UnifiedStreamState): number | null {
  if (state.startTime === null) return null;
  return Date.now() - state.startTime;
}

/**
 * Clone a Map (for immutable updates)
 */
function cloneMap<K, V>(map: Map<K, V>): Map<K, V> {
  return new Map(map);
}

// ============================================
// Event Processors
// ============================================

/**
 * Process stream:start event
 */
function processStartEvent(state: UnifiedStreamState): UnifiedStreamState {
  return {
    ...state,
    phase: 'streaming',
    status: 'streaming',
    startTime: state.startTime ?? Date.now(),
  };
}

/**
 * Process stream:end event
 */
function processEndEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'stream:end' }>
): UnifiedStreamState {
  // Use durationMs from event if available, otherwise calculate
  const duration = event.durationMs ?? calculateDuration(state);

  return {
    ...state,
    phase: 'complete',
    status: 'complete',
    duration,
    ragLogId: event.ragLogId ?? state.ragLogId,
    inputTokens: event.inputTokens ?? state.inputTokens,
    outputTokens: event.outputTokens ?? state.outputTokens,
    tokensActual: event.tokensActual ?? state.tokensActual,
    cacheCreationTokens: event.cacheCreationTokens ?? state.cacheCreationTokens,
    cacheReadTokens: event.cacheReadTokens ?? state.cacheReadTokens,
    reasoningTokens: event.reasoningTokens ?? state.reasoningTokens,
    ragContextTokens: event.ragContextTokens ?? state.ragContextTokens,
    ragChunksCount: event.ragChunksCount ?? state.ragChunksCount,
    processingStatus: null,
  };
}

/**
 * Process stream:error event
 */
function processErrorEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'stream:error' }>
): UnifiedStreamState {
  return {
    ...state,
    phase: 'error',
    status: 'error',
    error: {
      message: event.error,
      recoverable: event.recoverable,
    },
    duration: calculateDuration(state),
    processingStatus: null,
  };
}

/**
 * Process content:text event
 */
function processTextEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'content:text' }>
): UnifiedStreamState {
  const newContent = state.textContent + event.delta;
  // Estimate output tokens as content accumulates
  const estimatedTokens = estimateTokenCount(newContent);

  return {
    ...state,
    phase: 'streaming',
    status: 'streaming',
    textContent: newContent,
    outputTokens: estimatedTokens,
  };
}

/**
 * Generate a unique ID for timeline events
 */
let eventIdCounter = 0;
function generateEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++eventIdCounter}`;
}

/**
 * Process content:thinking event
 *
 * Simplified timeline-first approach:
 * - Backend sends COMPLETE thinking blocks (after finding </thinking> tag)
 * - Each complete thinking event creates a NEW timeline entry
 * - Incomplete thinking events (isComplete=false) update the last incomplete entry or create new
 * - Text captured before thinking is added as a separate text event
 */
function processThinkingEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'content:thinking' }>
): UnifiedStreamState {
  const now = Date.now();
  const newTimeline = [...state.processTimeline];
  let newTextContentInTimeline = state.textContentInTimeline;

  // Check if there's uncaptured text that should come before this thinking block
  const uncapturedText = state.textContent.substring(state.textContentInTimeline);
  if (uncapturedText.trim().length > 0) {
    newTimeline.push({
      type: 'text',
      id: generateEventId('text'),
      content: uncapturedText,
      timestamp: now,
    });
    newTextContentInTimeline = state.textContent.length;
  }

  // Find the last thinking event in the timeline
  let lastThinkingIndex = -1;
  for (let i = newTimeline.length - 1; i >= 0; i--) {
    if (newTimeline[i].type === 'thinking') {
      lastThinkingIndex = i;
      break;
    }
  }

  const lastThinkingEvent = lastThinkingIndex >= 0
    ? newTimeline[lastThinkingIndex] as Extract<ProcessEvent, { type: 'thinking' }>
    : null;

  // Determine if we should create new entry or update existing
  // Create new if: no existing OR last is complete (new thinking block)
  // Update existing if: last is incomplete (streaming within same block)
  const shouldCreateNew = !lastThinkingEvent || lastThinkingEvent.isComplete;

  if (shouldCreateNew) {
    // Create new thinking entry
    newTimeline.push({
      type: 'thinking',
      id: generateEventId('thinking'),
      content: event.content,
      timestamp: now,
      isComplete: event.isComplete ?? false,
    });
  } else {
    // Update existing incomplete thinking entry
    const newContent = event.isComplete
      ? event.content  // Backend sends full content when complete
      : state.thinkingContent + event.content;  // Append for streaming

    newTimeline[lastThinkingIndex] = {
      type: 'thinking',
      id: lastThinkingEvent.id,  // Preserve ID
      content: newContent,
      timestamp: lastThinkingEvent.timestamp,  // Preserve original timestamp
      isComplete: event.isComplete ?? false,
    };
  }

  // Update thinkingContent for backward compatibility
  const newThinkingContent = shouldCreateNew
    ? event.content
    : (event.isComplete ? event.content : state.thinkingContent + event.content);

  // If thinking is complete, mark all text up to this point as captured
  if (event.isComplete) {
    newTextContentInTimeline = state.textContent.length;
  }

  return {
    ...state,
    phase: 'streaming',
    status: 'streaming',
    thinkingContent: newThinkingContent,
    isThinkingComplete: event.isComplete ?? false,
    processTimeline: newTimeline,
    textContentInTimeline: newTextContentInTimeline,
  };
}

/**
 * Process content:thinking:end event
 *
 * When thinking ends, we need to update textContentInTimeline to account for
 * all text up to this point (including any text that was part of thinking tags).
 * This ensures that only text AFTER thinking appears in the main response bubble.
 */
function processThinkingEndEvent(state: UnifiedStreamState): UnifiedStreamState {
  // Update textContentInTimeline to current textContent length
  // This marks all accumulated text as "captured" by the timeline
  // so only new text after this point will appear in the main bubble
  return {
    ...state,
    isThinkingComplete: true,
    textContentInTimeline: state.textContent.length,
  };
}

/**
 * Process tool:start event
 *
 * Before adding the tool to the timeline, captures any accumulated text content
 * that hasn't been added to the timeline yet. This preserves the chronological
 * order of: text -> tool -> more text -> another tool -> final text.
 */
function processToolStartEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'tool:start' }>
): UnifiedStreamState {
  const now = Date.now();
  const newActiveTools = cloneMap(state.activeTools);

  const toolExecution: StreamToolExecution = {
    id: event.toolId,
    tool: event.tool,
    arguments: event.args,
    status: 'executing',
    startedAt: now,
  };

  newActiveTools.set(event.toolId, toolExecution);

  // Check if there's text content that hasn't been captured in the timeline yet
  const uncapturedText = state.textContent.substring(state.textContentInTimeline);
  const newTimeline = [...state.processTimeline];
  let newTextContentInTimeline = state.textContentInTimeline;

  if (uncapturedText.trim().length > 0) {
    // Add a text event for the uncaptured content before the tool
    newTimeline.push({
      type: 'text',
      id: generateEventId('text'),
      content: uncapturedText,
      timestamp: now,
    });
    newTextContentInTimeline = state.textContent.length;
  }

  // Add tool event to process timeline
  newTimeline.push({
    type: 'tool',
    id: event.toolId,
    execution: toolExecution,
  });

  return {
    ...state,
    phase: 'tool-execution',
    status: 'streaming',
    activeTools: newActiveTools,
    processTimeline: newTimeline,
    textContentInTimeline: newTextContentInTimeline,
  };
}

/**
 * Process tool:end event
 */
function processToolEndEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'tool:end' }>
): UnifiedStreamState {
  const newActiveTools = cloneMap(state.activeTools);
  const activeTool = newActiveTools.get(event.toolId);

  // Find the tool by name if ID doesn't match (fallback for tools without proper ID tracking)
  let toolToComplete: StreamToolExecution | undefined = activeTool;
  let toolIdToRemove = event.toolId;

  if (!toolToComplete) {
    // Try to find by tool name
    for (const [id, tool] of newActiveTools) {
      if (tool.tool === event.tool && tool.status === 'executing') {
        toolToComplete = tool;
        toolIdToRemove = id;
        break;
      }
    }
  }

  const completedTool: StreamToolExecution = {
    id: toolIdToRemove,
    tool: event.tool,
    arguments: toolToComplete?.arguments ?? '',
    result: event.result,
    status: event.success ? 'completed' : 'failed',
    startedAt: toolToComplete?.startedAt ?? Date.now(),
    completedAt: Date.now(),
  };

  newActiveTools.delete(toolIdToRemove);

  // Determine new phase based on remaining active tools
  const newPhase: StreamPhase = newActiveTools.size > 0 ? 'tool-execution' : 'streaming';

  // Update tool event in process timeline (preserve the ID)
  const newTimeline = state.processTimeline.map(e => {
    if (e.type === 'tool' && e.execution.id === toolIdToRemove) {
      return { type: 'tool' as const, id: e.id, execution: completedTool };
    }
    return e;
  });

  return {
    ...state,
    phase: newPhase,
    status: 'streaming',
    activeTools: newActiveTools,
    completedTools: [...state.completedTools, completedTool],
    processTimeline: newTimeline,
  };
}

/**
 * Process rag:context event
 */
function processRagEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'rag:context' }>
): UnifiedStreamState {
  return {
    ...state,
    ragContext: event.notes,
    ragLogId: event.ragLogId ?? state.ragLogId,
  };
}

/**
 * Process grounding:sources event
 */
function processGroundingEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'grounding:sources' }>
): UnifiedStreamState {
  return {
    ...state,
    groundingSources: event.sources,
  };
}

/**
 * Process code:execution event
 */
function processCodeExecutionEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'code:execution' }>
): UnifiedStreamState {
  return {
    ...state,
    codeExecution: event.result,
  };
}

/**
 * Process status:update event
 */
function processStatusEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'status:update' }>
): UnifiedStreamState {
  return {
    ...state,
    processingStatus: event.status,
  };
}

/**
 * Process grok:search event
 */
function processGrokSearchEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'grok:search' }>
): UnifiedStreamState {
  return {
    ...state,
    grokSearchSources: event.sources,
  };
}

/**
 * Process grok:thinking event
 */
function processGrokThinkingEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'grok:thinking' }>
): UnifiedStreamState {
  return {
    ...state,
    grokThinkingSteps: [...state.grokThinkingSteps, event.step],
  };
}

// ============================================
// Image Generation Event Processors
// ============================================

/**
 * Process image:start event
 */
function processImageStartEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'image:start' }>
): UnifiedStreamState {
  const imageGeneration: ImageGenerationState = {
    inProgress: true,
    provider: event.provider,
    model: event.model,
    prompt: event.prompt,
    stage: 'preparing',
    progress: null,
    images: [],
    error: null,
  };

  return {
    ...state,
    phase: 'image-generation',
    status: 'streaming',
    startTime: state.startTime ?? Date.now(),
    imageGeneration,
    processingStatus: 'Preparing image generation...',
  };
}

/**
 * Get status message for image generation stage
 */
function getImageGenerationStatusMessage(stage: string): string {
  switch (stage) {
    case 'preparing':
      return 'Preparing image generation...';
    case 'generating':
      return 'Generating image...';
    case 'processing':
      return 'Processing generated image...';
    default:
      return 'Generating...';
  }
}

/**
 * Process image:progress event
 */
function processImageProgressEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'image:progress' }>
): UnifiedStreamState {
  const statusMessage = getImageGenerationStatusMessage(event.stage);

  return {
    ...state,
    imageGeneration: {
      ...state.imageGeneration,
      stage: event.stage,
      progress: event.progress ?? state.imageGeneration.progress,
    },
    processingStatus: statusMessage,
  };
}

/**
 * Process image:complete event
 */
function processImageCompleteEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'image:complete' }>
): UnifiedStreamState {
  const duration = calculateDuration(state);

  return {
    ...state,
    phase: 'complete',
    status: 'complete',
    duration,
    imageGeneration: {
      ...state.imageGeneration,
      inProgress: false,
      stage: 'complete',
      progress: 100,
      images: event.images,
    },
    processingStatus: null,
  };
}

/**
 * Process image:error event
 */
function processImageErrorEvent(
  state: UnifiedStreamState,
  event: Extract<StreamEvent, { type: 'image:error' }>
): UnifiedStreamState {
  return {
    ...state,
    phase: 'error',
    status: 'error',
    imageGeneration: {
      ...state.imageGeneration,
      inProgress: false,
      stage: 'error',
      error: event.error,
    },
    error: {
      message: event.error,
      recoverable: false,
    },
    processingStatus: null,
    duration: calculateDuration(state),
  };
}

// ============================================
// Main Event Processor
// ============================================

/**
 * Process a single stream event and return new state
 */
function processEvent(state: UnifiedStreamState, event: StreamEvent): UnifiedStreamState {
  switch (event.type) {
    case 'stream:start':
      return processStartEvent(state);

    case 'stream:end':
      return processEndEvent(state, event);

    case 'stream:error':
      return processErrorEvent(state, event);

    case 'content:text':
      return processTextEvent(state, event);

    case 'content:thinking':
      return processThinkingEvent(state, event);

    case 'content:thinking:end':
      return processThinkingEndEvent(state);

    case 'tool:start':
      return processToolStartEvent(state, event);

    case 'tool:end':
      return processToolEndEvent(state, event);

    case 'rag:context':
      return processRagEvent(state, event);

    case 'grounding:sources':
      return processGroundingEvent(state, event);

    case 'code:execution':
      return processCodeExecutionEvent(state, event);

    case 'status:update':
      return processStatusEvent(state, event);

    case 'grok:search':
      return processGrokSearchEvent(state, event);

    case 'grok:thinking':
      return processGrokThinkingEvent(state, event);

    case 'image:start':
      return processImageStartEvent(state, event);

    case 'image:progress':
      return processImageProgressEvent(state, event);

    case 'image:complete':
      return processImageCompleteEvent(state, event);

    case 'image:error':
      return processImageErrorEvent(state, event);

    default: {
      // Type exhaustiveness check
      const _exhaustiveCheck: never = event;
      console.warn('Unhandled event type:', _exhaustiveCheck);
      return state;
    }
  }
}

// ============================================
// Stream Reducer
// ============================================

/**
 * Stream reducer function for useReducer
 * 
 * Manages state transitions based on stream actions:
 * - CONNECT: Initialize streaming state
 * - EVENT: Process a stream event
 * - CANCEL: Cancel the current stream
 * - RESET: Reset to initial state
 * - SET_INPUT_TOKENS: Set input token count
 * - INCREMENT_RETRY: Increment retry counter
 */
export function streamReducer(
  state: UnifiedStreamState,
  action: StreamAction
): UnifiedStreamState {
  switch (action.type) {
    case 'CONNECT':
      return {
        ...initialStreamState,
        phase: 'connecting',
        status: 'connecting',
        startTime: Date.now(),
        retryCount: state.retryCount, // Preserve retry count across reconnects
      };

    case 'EVENT':
      return processEvent(state, action.event);

    case 'CANCEL':
      return {
        ...state,
        phase: 'idle',
        status: 'idle',
        duration: calculateDuration(state),
        processingStatus: null,
        imageGeneration: state.imageGeneration.inProgress
          ? { ...state.imageGeneration, inProgress: false, stage: 'idle' }
          : state.imageGeneration,
      };

    case 'RESET':
      return initialStreamState;

    case 'SET_INPUT_TOKENS':
      return {
        ...state,
        inputTokens: action.tokens,
      };

    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1,
      };

    default: {
      // Type exhaustiveness check
      const _exhaustiveCheck: never = action;
      console.warn('Unhandled action type:', _exhaustiveCheck);
      return state;
    }
  }
}

/**
 * Get the initial state for the stream reducer
 */
export function getInitialStreamState(): UnifiedStreamState {
  return initialStreamState;
}

/**
 * Check if the stream is in an active state
 */
export function isStreamActive(state: UnifiedStreamState): boolean {
  return (
    state.phase === 'connecting' ||
    state.phase === 'streaming' ||
    state.phase === 'tool-execution' ||
    state.phase === 'image-generation' ||
    state.phase === 'finalizing'
  );
}

/**
 * Check if the stream has content to display
 */
export function hasStreamContent(state: UnifiedStreamState): boolean {
  return (
    state.textContent.length > 0 ||
    state.thinkingContent.length > 0 ||
    state.completedTools.length > 0 ||
    state.activeTools.size > 0 ||
    state.processTimeline.length > 0 ||
    state.ragContext.length > 0 ||
    state.groundingSources.length > 0 ||
    state.grokSearchSources.length > 0 ||
    state.codeExecution !== null ||
    state.imageGeneration.inProgress ||
    state.imageGeneration.images.length > 0
  );
}

/**
 * Check if image generation is active
 */
export function isImageGenerationActive(state: UnifiedStreamState): boolean {
  return state.phase === 'image-generation' || state.imageGeneration.inProgress;
}
