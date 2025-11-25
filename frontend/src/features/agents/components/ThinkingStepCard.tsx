import { useState } from 'react';
import { ThinkingStep } from '../types/agent-types';

interface ThinkingStepCardProps {
  step: ThinkingStep;
}

export function ThinkingStepCard({ step }: ThinkingStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse the thinking content into steps
  const parseSteps = (content: string): string[] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines;
  };

  const steps = parseSteps(step.content);

  return (
    <div
      className="my-3 p-3 rounded-3xl border transition-all duration-200"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface-card) 80%, var(--color-brand-500) 3%)',
        borderColor: 'var(--border)',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span style={{ color: 'var(--color-brand-400)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </span>
        <span
          className="font-medium text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          Reasoning
        </span>
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {step.timestamp.toLocaleTimeString()}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-3 pl-6 space-y-1">
          {steps.map((stepText, index) => (
            <div
              key={index}
              className="text-sm flex items-start gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="text-xs mt-0.5 opacity-60"
                style={{ color: 'var(--color-brand-400)' }}
              >
                {stepText.match(/^Step \d+:/) ? '' : ''}
              </span>
              <span>{stepText}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
