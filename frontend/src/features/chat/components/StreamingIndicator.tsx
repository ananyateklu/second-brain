import { useMemo } from 'react';
import { MarkdownMessage } from '../../../components/MarkdownMessage';
import { MarkdownMessageWithNoteReferences } from '../../../components/MarkdownMessageWithNoteReferences';
import { TokenUsageDisplay } from '../../../components/TokenUsageDisplay';
import { ThinkingStepCard } from '../../agents/components/ThinkingStepCard';
import { ToolExecutionCard } from '../../agents/components/ToolExecutionCard';
import { TimelineItem } from '../../agents/components/TimelineItem';
import { GroundingSourcesCard } from '../../agents/components/GroundingSourcesCard';
import { GrokSearchSourcesCard } from '../../agents/components/GrokSearchSourcesCard';
import { CodeExecutionCard } from '../../agents/components/CodeExecutionCard';
import { RetrievedNotesCard } from './RetrievedNotesCard';
import { ProcessTimeline } from './ProcessTimeline';
import { ImageGenerationProgress } from './ImageGenerationProgress';
import { RetrievedNoteContext } from '../../agents/types/agent-types';
import { RagContextNote } from '../../../types/rag';
import { GroundingSource, GrokSearchSource, CodeExecutionResult } from '../../../types/chat';
import { stripAllThinkingTags, extractAllThinkingContent } from '../../../utils/thinking-utils';
import type { ImageGenerationStage, ProcessEvent } from '../../../core/streaming/types';

/**
 * Renders text content within the process timeline.
 * Used for interleaved text that appears between thinking/tool events.
 */
function TimelineTextCard({ content, showInlineNoteRefs = false }: { content: string; showInlineNoteRefs?: boolean }) {
  const strippedContent = stripAllThinkingTags(content);
  if (!strippedContent) return null;

  return (
    <TimelineItem variant="dot">
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          backgroundColor: 'var(--surface-card)',
        }}
      >
        {showInlineNoteRefs ? (
          <MarkdownMessageWithNoteReferences content={strippedContent} />
        ) : (
          <MarkdownMessage content={strippedContent} />
        )}
      </div>
    </TimelineItem>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="w-full rounded-2xl rounded-bl-md px-4 py-2.5"
        style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-5 h-5 flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
              style={{ borderTopColor: 'var(--color-brand-500)', borderRightColor: 'var(--color-brand-500)' }}
            />
            <div className="absolute inset-1 rounded-full" style={{ backgroundColor: 'var(--surface-card)' }} />
          </div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</span>
        </div>
      </div>
    </div>
  );
}

export interface StreamingIndicatorProps {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  modelName?: string;
  provider?: string;
  outputTokens?: number;
  streamDuration?: number;
  agentModeEnabled?: boolean;
  ragEnabled?: boolean;
  /** Unified process timeline - thinking and tool executions in chronological order */
  processTimeline?: ProcessEvent[];
  /** Length of text content captured in timeline (for avoiding duplication) */
  textContentInTimeline?: number;
  processingStatus?: string | null;
  retrievedNotes?: RagContextNote[];
  agentRetrievedNotes?: RetrievedNoteContext[];
  groundingSources?: GroundingSource[];
  grokSearchSources?: GrokSearchSource[];
  codeExecutionResult?: CodeExecutionResult | null;
  isGeneratingImage?: boolean;
  imageGenerationStage?: ImageGenerationStage;
  imageGenerationProvider?: string | null;
  imageGenerationModel?: string | null;
  imageGenerationPrompt?: string | null;
  imageGenerationProgress?: number | null;
}

/**
 * Displays streaming message content, thinking steps, tool executions, and loading states.
 *
 * Simplified architecture: Timeline is the single source of truth for all process events.
 * No client-side tag extraction - events are rendered directly from processTimeline.
 */
export function StreamingIndicator({
  isStreaming,
  streamingMessage,
  streamingError,
  modelName,
  provider,
  outputTokens,
  streamDuration,
  agentModeEnabled = false,
  ragEnabled = false,
  processTimeline = [],
  textContentInTimeline = 0,
  processingStatus = null,
  retrievedNotes = [],
  agentRetrievedNotes = [],
  groundingSources = [],
  grokSearchSources = [],
  codeExecutionResult = null,
  isGeneratingImage = false,
  imageGenerationStage = 'idle',
  imageGenerationProvider = null,
  imageGenerationModel = null,
  imageGenerationPrompt = null,
  imageGenerationProgress = null,
}: StreamingIndicatorProps) {
  const hasRetrievedNotes = agentRetrievedNotes.length > 0 || retrievedNotes.length > 0;
  const hasGroundingSources = groundingSources.length > 0;
  const hasGrokSearchSources = grokSearchSources.length > 0;
  const hasCodeExecution = codeExecutionResult !== null;
  const hasImageGeneration = isGeneratingImage && imageGenerationStage !== 'idle' && imageGenerationStage !== 'complete';
  const hasTimeline = processTimeline.length > 0;

  // Extract thinking content from streamingMessage that may not be in timeline yet
  // This handles the race condition where thinking tags appear in the stream before
  // the backend emits the thinking event
  const extractedThinking = useMemo(() => {
    if (!agentModeEnabled || !streamingMessage) {
      return { complete: [] as string[], incomplete: null as string | null };
    }
    // Get complete thinking blocks (without including incomplete)
    const completeBlocks = extractAllThinkingContent(streamingMessage, false);
    // Get all blocks including incomplete (the last one might be incomplete)
    const allBlocks = extractAllThinkingContent(streamingMessage, true);
    // If there are more blocks when including incomplete, the extra one is incomplete
    const incompleteBlock = allBlocks.length > completeBlocks.length
      ? allBlocks[allBlocks.length - 1]
      : null;
    return { complete: completeBlocks, incomplete: incompleteBlock };
  }, [agentModeEnabled, streamingMessage]);

  // Count thinking events already in timeline
  const timelineThinkingCount = useMemo(() => {
    return processTimeline.filter(e => e.type === 'thinking').length;
  }, [processTimeline]);

  // Find complete thinking blocks from message that aren't yet in timeline
  // This shows them until the timeline catches up
  const completeBlocksNotInTimeline = useMemo(() => {
    return extractedThinking.complete.slice(timelineThinkingCount);
  }, [extractedThinking.complete, timelineThinkingCount]);

  // Check if there's an incomplete (currently streaming) thinking block
  const hasIncompleteThinking = extractedThinking.incomplete !== null;

  const hasSteps = hasTimeline || hasRetrievedNotes || hasGroundingSources || hasGrokSearchSources || hasCodeExecution || hasImageGeneration || completeBlocksNotInTimeline.length > 0 || hasIncompleteThinking;

  // Calculate final response content (text not already in timeline)
  const finalResponseContent = agentModeEnabled && textContentInTimeline > 0
    ? streamingMessage.substring(textContentInTimeline)
    : streamingMessage;

  // Strip thinking tags for display
  const displayContent = agentModeEnabled ? stripAllThinkingTags(finalResponseContent) : finalResponseContent;
  const hasDisplayContent = displayContent.trim().length > 0;

  // Show loading spinner when streaming but no content yet
  const showLoadingSpinner = isStreaming && !streamingMessage && !hasSteps;

  return (
    <div>
      {/* Process Timeline */}
      <ProcessTimeline isStreaming={isStreaming} hasContent={hasSteps}>
        {/* Retrieved notes context */}
        {hasRetrievedNotes && (
          <RetrievedNotesCard
            notes={agentRetrievedNotes.length > 0 ? agentRetrievedNotes : retrievedNotes}
            isStreaming={isStreaming && !streamingMessage}
          />
        )}

        {/* Render timeline events in chronological order */}
        {agentModeEnabled && processTimeline.map((event) => {
          if (event.type === 'thinking') {
            return (
              <ThinkingStepCard
                key={event.id}
                step={{ content: event.content, timestamp: new Date(event.timestamp) }}
                isStreaming={isStreaming && !event.isComplete}
              />
            );
          }
          if (event.type === 'tool') {
            return (
              <ToolExecutionCard
                key={event.id}
                execution={{
                  tool: event.execution.tool,
                  arguments: event.execution.arguments,
                  result: event.execution.result ?? '',
                  status: event.execution.status,
                  timestamp: new Date(event.execution.startedAt),
                }}
              />
            );
          }
          if (event.type === 'text') {
            return <TimelineTextCard key={event.id} content={event.content} showInlineNoteRefs={agentModeEnabled || ragEnabled} />;
          }
          return null;
        })}

        {/* Complete thinking blocks extracted from message but not yet in timeline */}
        {agentModeEnabled && completeBlocksNotInTimeline.map((content, index) => (
          <ThinkingStepCard
            key={`extracted-complete-${timelineThinkingCount + index}`}
            step={{ content, timestamp: new Date() }}
            isStreaming={false}
          />
        ))}

        {/* Currently streaming incomplete thinking block */}
        {agentModeEnabled && hasIncompleteThinking && extractedThinking.incomplete && (
          <ThinkingStepCard
            key="extracted-incomplete"
            step={{ content: extractedThinking.incomplete, timestamp: new Date() }}
            isStreaming={true}
          />
        )}

        {/* Gemini grounding sources */}
        {hasGroundingSources && <GroundingSourcesCard sources={groundingSources} isStreaming={isStreaming} />}

        {/* Grok search sources */}
        {hasGrokSearchSources && <GrokSearchSourcesCard sources={grokSearchSources} isStreaming={isStreaming} />}

        {/* Code execution result */}
        {hasCodeExecution && codeExecutionResult && <CodeExecutionCard result={codeExecutionResult} isStreaming={isStreaming} />}

        {/* Image generation progress */}
        {hasImageGeneration && (
          <ImageGenerationProgress
            stage={imageGenerationStage}
            provider={imageGenerationProvider}
            model={imageGenerationModel}
            prompt={imageGenerationPrompt}
            progress={imageGenerationProgress}
            isGenerating={isGeneratingImage}
          />
        )}
      </ProcessTimeline>

      {/* Loading spinner */}
      {showLoadingSpinner && (
        <LoadingSpinner
          message={
            processingStatus ||
            (agentModeEnabled ? 'Agent thinking...' : ragEnabled ? 'Searching notes...' : 'Generating response...')
          }
        />
      )}

      {/* Processing status bar - shown independently when tools are executing but no content yet */}
      {agentModeEnabled && isStreaming && processingStatus && processingStatus !== 'Generating response...' && !showLoadingSpinner && (
        <div className="flex justify-start">
          <div
            className="w-full rounded-2xl rounded-bl-md px-4 py-2.5"
            style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4 flex-shrink-0">
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: 'var(--color-brand-500)', borderRightColor: 'var(--color-brand-500)' }}
                />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--color-brand-500)' }}>{processingStatus}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main response message */}
      {hasDisplayContent && (
        <div className="flex justify-start">
          <div
            className="w-full rounded-2xl rounded-bl-md px-4 py-2.5"
            style={{ backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)' }}
          >
            {(agentModeEnabled || ragEnabled) ? (
              <MarkdownMessageWithNoteReferences content={displayContent} showCursor={isStreaming} />
            ) : (
              <MarkdownMessage content={displayContent} showCursor={isStreaming} />
            )}
            <TokenUsageDisplay
              inputTokens={undefined}
              outputTokens={outputTokens}
              role="assistant"
              modelName={modelName}
              provider={provider}
              durationMs={!isStreaming ? streamDuration : undefined}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {streamingError && (
        <div className="flex justify-start">
          <div
            className="w-full rounded-2xl rounded-bl-md px-4 py-2.5"
            style={{
              backgroundColor: 'var(--color-error-light)',
              color: 'var(--text-primary)',
              border: '1px solid var(--color-error-border)',
            }}
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--color-error)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium" style={{ color: 'var(--color-error)' }}>Streaming Error</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{streamingError.message}</p>
                {streamingMessage && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Partial response received before error.</p>
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
        className="w-full rounded-2xl rounded-bl-md px-4 py-3"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  opacity: 0.4,
                  animation: 'pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {[100, 85, 95].map((width, i) => (
              <div
                key={i}
                className="h-3 rounded-md relative overflow-hidden"
                style={{ width: `${width}%`, backgroundColor: 'var(--border)', opacity: 0.3 }}
              >
                <div
                  className="absolute inset-0 -translate-x-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(var(--btn-primary-bg-rgb, 59, 130, 246), 0.3), transparent)',
                    animation: 'shimmer 2s infinite',
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
 * Loading skeleton for image generation.
 */
export function ImageGenerationLoadingSkeleton({ isGeneratingImage }: { isGeneratingImage?: boolean }) {
  if (!isGeneratingImage) return <LoadingMessageSkeleton />;

  return (
    <div className="flex justify-start">
      <div
        className="w-full rounded-2xl rounded-bl-md px-4 py-3"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-brand-alpha)', border: '1px solid var(--color-brand-border)' }}
            >
              <svg className="w-4 h-4 animate-pulse" style={{ color: 'var(--color-brand-text)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Generating image...</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>This may take a few moments</p>
            </div>
          </div>
          <div
            className="relative w-full aspect-square max-w-[320px] rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--border)', opacity: 0.3 }}
          >
            <div
              className="absolute inset-0 -translate-x-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(var(--btn-primary-bg-rgb, 59, 130, 246), 0.2), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 opacity-30" style={{ color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
