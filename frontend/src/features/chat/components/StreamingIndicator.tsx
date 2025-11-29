import { MarkdownMessage } from '../../../components/MarkdownMessage';
import { TokenUsageDisplay } from '../../../components/TokenUsageDisplay';
import { ThinkingStepCard } from '../../agents/components/ThinkingStepCard';
import { ToolExecutionCard } from '../../agents/components/ToolExecutionCard';
import { ProcessTimeline } from './ProcessTimeline';
import { RetrievedNotes } from '../../../components/ui/RetrievedNotes';
import { ToolExecution, ThinkingStep } from '../../agents/types/agent-types';
import { RagContextNote } from '../../rag/types';
import { stripThinkingTags } from '../../../utils/thinking-utils';

export interface StreamingIndicatorProps {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  modelName?: string;
  outputTokens?: number;
  streamDuration?: number;
  agentModeEnabled?: boolean;
  thinkingSteps?: ThinkingStep[];
  toolExecutions?: ToolExecution[];
  retrievedNotes?: RagContextNote[];
}

/**
 * Displays streaming message content, thinking steps, tool executions, and loading states.
 */
export function StreamingIndicator({
  isStreaming,
  streamingMessage,
  streamingError,
  modelName,
  outputTokens,
  streamDuration,
  agentModeEnabled = false,
  thinkingSteps = [],
  toolExecutions = [],
  retrievedNotes = [],
}: StreamingIndicatorProps) {
  const hasSteps = thinkingSteps.length > 0 || toolExecutions.length > 0;

  return (
    <div>
      {/* Show thinking steps and tool executions in timeline */}
      {agentModeEnabled && (
        <ProcessTimeline
          isStreaming={isStreaming}
          hasContent={hasSteps}
        >
          {thinkingSteps.map((step, index) => (
            <ThinkingStepCard key={`thinking-${index}`} step={step} />
          ))}

          {toolExecutions.map((execution, index) => (
            <ToolExecutionCard key={`streaming-${index}`} execution={execution} />
          ))}
        </ProcessTimeline>
      )}

      {/* Show thinking/loading indicator only when streaming but no message content yet (agent mode only) */}
      {agentModeEnabled && isStreaming && !streamingMessage && !hasSteps && (
        <div className="flex justify-start">
          <div
            className="w-full rounded-2xl rounded-bl-md px-5 py-3"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
              Agent thinking...
            </span>
            <span
              className="inline-block w-2 h-4 ml-1 animate-pulse"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                verticalAlign: 'middle',
              }}
            />
          </div>
        </div>
      )}

      {/* Main response message */}
      {streamingMessage && (
        <div className="flex justify-start">
          <div
            className="w-full rounded-2xl rounded-bl-md px-5 py-3"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
            }}
          >
            <div>
              <MarkdownMessage
                content={agentModeEnabled ? stripThinkingTags(streamingMessage) : streamingMessage}
              />
              {/* Blinking cursor - only show while actively streaming main message */}
              {isStreaming && (
                <span
                  className="inline-block w-2 h-4 ml-1 animate-pulse"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </div>
            <TokenUsageDisplay
              inputTokens={undefined}
              outputTokens={outputTokens}
              role="assistant"
              modelName={modelName}
              durationMs={!isStreaming ? streamDuration : undefined}
            />
          </div>
        </div>
      )}

      {/* Show retrieved notes during streaming if RAG was used */}
      {!agentModeEnabled && retrievedNotes && retrievedNotes.length > 0 && (
        <RetrievedNotes notes={retrievedNotes} />
      )}

      {/* Show streaming error */}
      {streamingError && (
        <div className="flex justify-start">
          <div
            className="w-full rounded-2xl rounded-bl-md px-5 py-3"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: 'rgb(239, 68, 68)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'rgb(239, 68, 68)' }}>
                  Streaming Error
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {streamingError.message}
                </p>
                {streamingMessage && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Partial response received before error.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton shown when a message is being sent but streaming hasn't started.
 */
export function LoadingMessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div
        className="w-full rounded-2xl rounded-bl-md px-6 py-4"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Animated dots indicator */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  opacity: 0.4,
                  animation: `pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>

          {/* Shimmer effect lines */}
          <div className="space-y-2">
            {[100, 85, 95].map((width, i) => (
              <div
                key={i}
                className="h-3 rounded-md relative overflow-hidden"
                style={{
                  width: `${width}%`,
                  backgroundColor: 'var(--border)',
                  opacity: 0.3,
                }}
              >
                <div
                  className="absolute inset-0 -translate-x-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(var(--btn-primary-bg-rgb, 59, 130, 246), 0.3), transparent)',
                    animation: `shimmer 2s infinite`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton shown when generating an image, with image-specific UI.
 */
export function ImageGenerationLoadingSkeleton({ isGeneratingImage }: { isGeneratingImage?: boolean }) {
  if (isGeneratingImage) {
    return (
      <div className="flex justify-start">
        <div
          className="w-full rounded-2xl rounded-bl-md px-6 py-4"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="flex flex-col gap-4">
            {/* Image generation indicator */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-brand-alpha)',
                  border: '1px solid var(--color-brand-border)',
                }}
              >
                <svg
                  className="w-4 h-4 animate-pulse"
                  style={{ color: 'var(--color-brand-text)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Generating image...
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  This may take a few moments
                </p>
              </div>
            </div>

            {/* Image placeholder with shimmer */}
            <div
              className="relative w-full aspect-square max-w-[320px] rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--border)',
                opacity: 0.3,
              }}
            >
              {/* Shimmer animation */}
              <div
                className="absolute inset-0 -translate-x-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(var(--btn-primary-bg-rgb, 59, 130, 246), 0.2), transparent)',
                  animation: `shimmer 2s infinite`,
                }}
              />
              {/* Centered image icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-12 h-12 opacity-30"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fall back to regular loading skeleton for non-image generation
  return <LoadingMessageSkeleton />;
}
