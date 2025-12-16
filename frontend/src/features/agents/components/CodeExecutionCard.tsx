import { useState } from 'react';
import type { CodeExecutionResult } from '../../../types/chat';

interface CodeExecutionCardProps {
  result: CodeExecutionResult;
  isStreaming?: boolean;
}

/**
 * Displays Python code execution results from Gemini's sandbox.
 * Shows the executed code and its output.
 */
export function CodeExecutionCard({ result, isStreaming = false }: CodeExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCode, setShowCode] = useState(true);

  return (
    <div className="relative pl-12 py-2 group">
      {/* Icon on the timeline */}
      <div
        className="absolute left-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center border transition-colors"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)'
        }}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: result.success ? 'var(--color-success)' : 'var(--color-error)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
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
            Code Execution
          </span>
          <span
            className="px-1.5 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: result.success ? 'var(--color-success-alpha)' : 'var(--color-error-alpha)',
              color: result.success ? 'var(--color-success)' : 'var(--color-error)',
            }}
          >
            {result.success ? 'Success' : 'Failed'}
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {result.language}
          </span>
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
          )}
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
          <div className="mt-2 space-y-2">
            {/* Tabs for Code/Output */}
            <div className="flex gap-1">
              <button
                onClick={() => { setShowCode(true); }}
                className="px-3 py-1 text-xs rounded-md transition-colors"
                style={{
                  backgroundColor: showCode ? 'var(--color-primary-alpha)' : 'var(--surface-elevated)',
                  color: showCode ? 'var(--color-primary)' : 'var(--text-secondary)',
                }}
              >
                Code
              </button>
              <button
                onClick={() => { setShowCode(false); }}
                className="px-3 py-1 text-xs rounded-md transition-colors"
                style={{
                  backgroundColor: !showCode ? 'var(--color-primary-alpha)' : 'var(--surface-elevated)',
                  color: !showCode ? 'var(--color-primary)' : 'var(--text-secondary)',
                }}
              >
                Output
              </button>
            </div>

            {/* Code or Output Display */}
            <div
              className="p-3 rounded-lg text-xs font-mono overflow-x-auto"
              style={{
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {showCode ? (
                <pre className="whitespace-pre-wrap break-words">
                  {result.code || 'No code available'}
                </pre>
              ) : (
                <div>
                  {result.success ? (
                    <pre className="whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                      {result.output || 'No output'}
                    </pre>
                  ) : (
                    <div style={{ color: 'var(--color-error)' }}>
                      <div className="font-semibold mb-1">Error:</div>
                      <pre className="whitespace-pre-wrap break-words">
                        {result.errorMessage || result.output || 'Execution failed'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {isStreaming && (
                <span
                  className="inline-block w-1.5 h-3 ml-0.5 animate-pulse"
                  style={{
                    backgroundColor: 'var(--color-success)',
                    verticalAlign: 'middle',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
