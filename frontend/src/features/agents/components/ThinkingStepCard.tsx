import { useState, useEffect } from 'react';
import { ThinkingStep } from '../types/agent-types';

interface ThinkingStepCardProps {
  step: ThinkingStep;
  isLast?: boolean;
  /** When true, the card will be expanded by default to show streaming content */
  isStreaming?: boolean;
}

export function ThinkingStepCard({ step, isStreaming = false }: ThinkingStepCardProps) {
  // Start expanded when streaming, collapsed otherwise
  // Use functional update to auto-expand when streaming starts
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  // Auto-expand when streaming starts - valid prop sync for UI state
  useEffect(() => {
    if (isStreaming) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Parse the thinking content into steps
  const parseSteps = (content: string): string[] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines;
  };

  const steps = parseSteps(step.content);

  return (
    <div className="relative pl-12 py-2 group">
      {/* Icon on the timeline */}
      <div
        className="absolute left-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center z-10 border transition-colors"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)'
        }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-brand-500)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>

      {/* Content */}
      <div className="text-sm">
        <button
          onClick={() => { setIsExpanded(!isExpanded); }}
          className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
        >
          <span
            className="font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Thinking Process
          </span>
          {/* Show streaming indicator when actively streaming */}
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-brand-500)' }}
            />
          )}
          <span className="text-xs opacity-50" style={{ color: 'var(--text-tertiary)' }}>
            {step.timestamp.toLocaleTimeString()}
          </span>
          <svg
            className={`w-3 h-3 ml-1 transition-transform opacity-50 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div
            className="mt-2 p-3 rounded-lg text-xs font-mono overflow-x-auto"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            {steps.map((stepText, index) => (
              <div key={index} className="mb-1 last:mb-0">
                {stepText}
              </div>
            ))}
            {/* Show cursor when streaming to indicate more content coming */}
            {isStreaming && (
              <span
                className="inline-block w-1.5 h-3 ml-0.5 animate-pulse"
                style={{
                  backgroundColor: 'var(--color-brand-500)',
                  verticalAlign: 'middle',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
