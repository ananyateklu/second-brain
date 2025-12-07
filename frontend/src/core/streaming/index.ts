/**
 * Unified Streaming Module
 * 
 * This module provides a unified streaming architecture for handling
 * SSE streams from both chat and agent endpoints.
 * 
 * @example
 * ```tsx
 * import { useUnifiedStream } from '@/hooks/use-unified-stream';
 * // or
 * import { useUnifiedStream } from '@/core/streaming';
 * 
 * function ChatComponent({ conversationId }) {
 *   const stream = useUnifiedStream({
 *     mode: 'chat',
 *     conversationId,
 *   });
 * 
 *   return (
 *     <div>
 *       {stream.textContent}
 *       {stream.isActive && <Spinner />}
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export type {
  StreamEventType,
  StreamEvent,
  StreamPhase,
  StreamStatus,
  StreamError,
  StreamToolExecution,
  UnifiedStreamState,
  StreamAction,
  UseUnifiedStreamOptions,
  StreamMessageRequest,
  ImageGenerationStreamRequest,
  UseUnifiedStreamReturn,
  ImageGenerationStage,
  ImageGenerationState,
} from './types';

export {
  initialStreamState,
  initialImageGenerationState,
  BACKEND_EVENT_MAP,
  isStreamEvent,
  isActivePhase,
  isStreamingStatus,
} from './types';

// Stream Event Processor
export {
  StreamEventProcessor,
  createStreamEventProcessor,
} from './stream-event-processor';

export type { StreamEventProcessorOptions } from './stream-event-processor';

// Stream Reducer
export {
  streamReducer,
  getInitialStreamState,
  isStreamActive,
  hasStreamContent,
  isImageGenerationActive,
} from './stream-reducer';

// Re-export the hook for convenience
export { useUnifiedStream, createLegacyAdapter } from '../../hooks/use-unified-stream';
export type { LegacyStreamingState } from '../../hooks/use-unified-stream';
