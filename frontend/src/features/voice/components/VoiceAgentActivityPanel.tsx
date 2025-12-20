/**
 * VoiceAgentActivityPanel Component
 * Collapsible panel showing agent activity: tool executions, thinking steps, RAG context, grounding sources
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  VoiceToolExecution,
  VoiceThinkingStep,
  VoiceRetrievedNote,
  VoiceGroundingSource,
} from '../types/voice-types';
import { getToolLabelPastTense, getToolIconPath } from '../utils/voice-utils';

interface VoiceAgentActivityPanelProps {
  toolExecutions: VoiceToolExecution[];
  thinkingSteps: VoiceThinkingStep[];
  retrievedNotes: VoiceRetrievedNote[];
  groundingSources: VoiceGroundingSource[];
  isToolExecuting: boolean;
  className?: string;
}

// Render tool icon using shared path data
function ToolIcon({ toolName }: { toolName: string }): React.ReactNode {
  const iconPath = getToolIconPath(toolName);
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath.d} />
      {iconPath.d2 && (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath.d2} />
      )}
    </svg>
  );
}

// Tool Execution Item
function ToolExecutionItem({ execution }: { execution: VoiceToolExecution }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExecuting = execution.status === 'executing';
  const time = new Date(execution.timestamp).toLocaleTimeString();

  return (
    <div
      className="p-2 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span
          className={`flex-shrink-0 ${isExecuting ? 'animate-spin' : ''}`}
          style={{ color: 'var(--color-brand-500)' }}
        >
          <ToolIcon toolName={execution.toolName} />
        </span>
        <span
          className="flex-1 text-xs font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {getToolLabelPastTense(execution.toolName)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {time}
        </span>
        {isExecuting ? (
          <span className="text-[10px]" style={{ color: 'var(--color-brand-500)' }}>
            Running...
          </span>
        ) : execution.status === 'completed' ? (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="var(--success-text)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="var(--error-text)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>

      {isExpanded && execution.result && (
        <div
          className="mt-2 p-2 rounded text-[10px] font-mono overflow-x-auto"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
          }}
        >
          {execution.result.length > 200
            ? `${execution.result.substring(0, 200)}...`
            : execution.result}
        </div>
      )}
    </div>
  );
}

// Thinking Step Item
function ThinkingStepItem({ step }: { step: VoiceThinkingStep }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const time = new Date(step.timestamp).toLocaleTimeString();
  const preview = step.content.substring(0, 50) + (step.content.length > 50 ? '...' : '');

  return (
    <div
      className="p-2 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--color-brand-500)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span
          className="flex-1 text-xs truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {preview}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {time}
        </span>
      </button>

      {isExpanded && (
        <div
          className="mt-2 p-2 rounded text-xs"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
          }}
        >
          {step.content}
        </div>
      )}
    </div>
  );
}

// Retrieved Notes Section
function RetrievedNotesSection({ notes }: { notes: VoiceRetrievedNote[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (notes.length === 0) return null;

  const topScore = Math.round((notes[0]?.relevanceScore || 0) * 100);

  return (
    <div
      className="p-2 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--color-brand-500)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {notes.length} note{notes.length !== 1 ? 's' : ''} used
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          · <span style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>{topScore}%</span> match
        </span>
        <svg
          className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5">
          {notes.map((note) => (
            <div
              key={note.noteId}
              className="p-2 rounded"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="text-xs font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {note.title}
              </div>
              <div
                className="text-[10px] line-clamp-2 mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {note.preview}
              </div>
              {note.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[9px]"
                      style={{
                        backgroundColor: 'var(--color-brand-500-alpha)',
                        color: 'var(--color-brand-600)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Grounding Sources Section
function GroundingSourcesSection({ sources }: { sources: VoiceGroundingSource[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div
      className="p-2 rounded-lg"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <svg
          className="w-3 h-3 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--color-accent-blue)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Web Sources
        </span>
        <span
          className="px-1.5 py-0.5 text-[10px] rounded-full"
          style={{
            backgroundColor: 'var(--color-accent-blue-alpha)',
            color: 'var(--color-accent-blue)',
          }}
        >
          {sources.length}
        </span>
        <svg
          className={`w-3 h-3 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5">
          {sources.map((source, index) => {
            const url = source.uri || source.url;
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--color-accent-blue)' }}
                >
                  {source.title || (url ? new URL(url).hostname : 'Source')}
                </div>
                {source.snippet && (
                  <div
                    className="text-[10px] line-clamp-2 mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {source.snippet}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VoiceAgentActivityPanel({
  toolExecutions,
  thinkingSteps,
  retrievedNotes,
  groundingSources,
  isToolExecuting,
  className = '',
}: VoiceAgentActivityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Count total items
  const totalItems = useMemo(() => {
    return (
      toolExecutions.length +
      thinkingSteps.length +
      (retrievedNotes.length > 0 ? 1 : 0) +
      (groundingSources.length > 0 ? 1 : 0)
    );
  }, [toolExecutions.length, thinkingSteps.length, retrievedNotes.length, groundingSources.length]);

  // Don't render if nothing to show
  if (totalItems === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`flex flex-col rounded-xl overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left"
        style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--color-brand-500)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span
          className="text-sm font-medium flex-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Agent Activity
        </span>
        {isToolExecuting && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--color-brand-500)' }}
          />
        )}
        <span
          className="px-1.5 py-0.5 text-xs rounded"
          style={{
            backgroundColor: 'var(--color-brand-500-alpha)',
            color: 'var(--color-brand-600)',
          }}
        >
          {totalItems}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - fills remaining space */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 px-3 py-2 space-y-2 overflow-y-auto thin-scrollbar"
          >
            {/* Tool Executions */}
            {toolExecutions.map((execution) => (
              <ToolExecutionItem key={execution.toolId} execution={execution} />
            ))}

            {/* Thinking Steps */}
            {thinkingSteps.map((step, index) => (
              <ThinkingStepItem key={`thinking-${index}`} step={step} />
            ))}

            {/* Retrieved Notes */}
            <RetrievedNotesSection notes={retrievedNotes} />

            {/* Grounding Sources */}
            <GroundingSourcesSection sources={groundingSources} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
