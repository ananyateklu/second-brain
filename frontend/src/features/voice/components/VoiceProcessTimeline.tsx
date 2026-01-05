/**
 * VoiceProcessTimeline Component
 * Collapsible timeline for tool executions, thinking steps, and retrieved notes
 * Shown inline before assistant messages (like chat ProcessTimeline)
 *
 * Reuses existing components from agents/chat features for consistency
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type {
  VoiceToolExecution,
  VoiceThinkingStep,
  VoiceRetrievedNote,
} from '../types/voice-types';
import { getToolLabel, getToolLabelPastTense, getToolIconPath } from '../utils/voice-utils';

interface VoiceProcessTimelineProps {
  toolExecutions: VoiceToolExecution[];
  thinkingSteps: VoiceThinkingStep[];
  retrievedNotes: VoiceRetrievedNote[];
  isExpanded?: boolean;
  isStreaming?: boolean;
}

export function VoiceProcessTimeline({
  toolExecutions,
  thinkingSteps,
  retrievedNotes,
  isExpanded: defaultExpanded = true,
  isStreaming = false,
}: VoiceProcessTimelineProps) {
  const [userExpanded, setUserExpanded] = useState(defaultExpanded);

  // Streaming always expands, otherwise use user preference
  const isExpanded = isStreaming || userExpanded;

  // Check if there's any content to show
  const hasContent = toolExecutions.length > 0 || thinkingSteps.length > 0 || retrievedNotes.length > 0;

  if (!hasContent) return null;

  // Count items for header
  const totalItems = toolExecutions.length + thinkingSteps.length + retrievedNotes.length;

  return (
    <div className="mb-3">
      {/* Header toggle */}
      {!isStreaming && (
        <button
          onClick={() => setUserExpanded(!userExpanded)}
          className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRightIcon className="w-3 h-3" />
          </motion.div>
          <span>Process</span>
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              color: 'var(--text-tertiary)',
            }}
          >
            {totalItems}
          </span>
        </button>
      )}

      {/* Timeline content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="relative mt-2 ml-2 overflow-hidden"
          >
            {/* Vertical line */}
            <div
              className="absolute left-[7px] top-4 bottom-2 w-px"
              style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
            />

            <div className="space-y-2">
              {/* Thinking steps */}
              {thinkingSteps.map((step, index) => (
                <VoiceThinkingStepItem key={`thinking-${index}`} step={step} />
              ))}

              {/* Retrieved notes */}
              {retrievedNotes.length > 0 && (
                <VoiceRetrievedNotesItem notes={retrievedNotes} />
              )}

              {/* Tool executions */}
              {toolExecutions.map((tool) => (
                <VoiceToolExecutionItem key={tool.toolId} tool={tool} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Timeline item wrapper with dot indicator
 */
function TimelineItemWrapper({
  children,
  isActive = false,
}: {
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <div className="relative pl-6">
      {/* Dot */}
      <div
        className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
          isActive ? 'animate-pulse' : ''
        }`}
        style={{
          borderColor: isActive ? 'var(--color-brand-500)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
          backgroundColor: isActive ? 'var(--color-brand-500)' : 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
        }}
      />
      {children}
    </div>
  );
}

/**
 * Individual thinking step item
 */
function VoiceThinkingStepItem({ step }: { step: VoiceThinkingStep }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const preview = step.content.slice(0, 100);
  const hasMore = step.content.length > 100;

  return (
    <TimelineItemWrapper>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left text-xs"
      >
        <div className="flex items-center gap-2">
          <span
            className="font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Thinking
          </span>
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {new Date(step.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div
          className="mt-1 text-xs leading-relaxed"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {isExpanded ? step.content : preview}
          {hasMore && !isExpanded && '...'}
        </div>

        {hasMore && (
          <span
            className="text-[10px] font-medium"
            style={{ color: 'var(--color-brand-500)' }}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </span>
        )}
      </button>
    </TimelineItemWrapper>
  );
}

/**
 * Retrieved notes summary item
 */
function VoiceRetrievedNotesItem({ notes }: { notes: VoiceRetrievedNote[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TimelineItemWrapper>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left text-xs"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--color-brand-500)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span
            className="font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Retrieved {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
          <ChevronRightIcon
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-1.5"
          >
            {notes.map((note) => (
              <div
                key={note.noteId}
                className="p-2 rounded-lg text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                }}
              >
                <div
                  className="font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {note.title}
                </div>
                <div
                  className="mt-0.5 line-clamp-2"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {note.preview}
                </div>
                {note.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        +{note.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
                <div
                  className="mt-1 text-[10px]"
                  style={{ color: 'var(--color-brand-500)' }}
                >
                  {Math.round(note.relevanceScore * 100)}% match
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </TimelineItemWrapper>
  );
}

/**
 * Tool execution item
 */
function VoiceToolExecutionItem({ tool }: { tool: VoiceToolExecution }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExecuting = tool.status === 'executing';
  const isFailed = tool.status === 'failed';

  const label = isExecuting
    ? getToolLabel(tool.toolName)
    : getToolLabelPastTense(tool.toolName);

  const iconPath = getToolIconPath(tool.toolName);

  // Parse result if it's JSON
  const parsedResult = useMemo(() => {
    if (!tool.result) return null;
    try {
      const parsed = JSON.parse(tool.result);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {
      // Not JSON
    }
    return null;
  }, [tool.result]);

  return (
    <TimelineItemWrapper isActive={isExecuting}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left text-xs"
      >
        <div className="flex items-center gap-2">
          {/* Tool icon */}
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{
              color: isFailed
                ? 'var(--color-error)'
                : isExecuting
                ? 'var(--color-brand-500)'
                : 'var(--color-success)',
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={iconPath.d}
            />
            {iconPath.d2 && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={iconPath.d2}
              />
            )}
          </svg>

          <span
            className="font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
          </span>

          <span
            className="text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {new Date(tool.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isExecuting && (
            <span
              className="text-[10px] animate-pulse"
              style={{ color: 'var(--color-brand-500)' }}
            >
              Running...
            </span>
          )}

          {tool.status === 'completed' && (
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-success)' }}
            >
              Done
            </span>
          )}

          {isFailed && (
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-error)' }}
            >
              Failed
            </span>
          )}

          {tool.result && (
            <ChevronRightIcon
              className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              style={{ color: 'var(--text-tertiary)' }}
            />
          )}
        </div>
      </button>

      {/* Expandable result */}
      <AnimatePresence>
        {isExpanded && tool.result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            {parsedResult?.message ? (
              <div
                className="p-2 rounded-lg text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                {parsedResult.message}
              </div>
            ) : (
              <pre
                className="p-2 rounded-lg text-[11px] font-mono overflow-x-auto thin-scrollbar whitespace-pre-wrap"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  color: 'var(--text-secondary)',
                  maxHeight: '200px',
                }}
              >
                {tool.result}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </TimelineItemWrapper>
  );
}
