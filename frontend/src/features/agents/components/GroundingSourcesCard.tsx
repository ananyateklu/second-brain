import { useState } from 'react';
import type { GroundingSource } from '../../../types/chat';

interface GroundingSourcesCardProps {
  sources: GroundingSource[];
  isStreaming?: boolean;
}

/**
 * Displays Google Search grounding sources from Gemini responses.
 * Shows clickable links to source pages with snippets.
 */
export function GroundingSourcesCard({ sources, isStreaming = false }: GroundingSourcesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0) return null;

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
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-accent-blue)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
            Google Search Sources
          </span>
          <span
            className="px-1.5 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: 'var(--color-accent-blue-alpha)',
              color: 'var(--color-accent-blue)',
            }}
          >
            {sources.length}
          </span>
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-accent-blue)' }}
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
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg transition-all hover:scale-[1.01] group/source"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-start gap-2">
                  {/* Favicon placeholder */}
                  <div
                    className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-accent-blue-alpha)' }}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-accent-blue)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div
                      className="text-sm font-medium truncate group-hover/source:underline"
                      style={{ color: 'var(--color-accent-blue)' }}
                    >
                      {source.title || new URL(source.uri).hostname}
                    </div>

                    {/* URL */}
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {source.uri}
                    </div>

                    {/* Snippet */}
                    {source.snippet && (
                      <div
                        className="text-xs mt-1.5 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {source.snippet}
                      </div>
                    )}
                  </div>

                  {/* External link icon */}
                  <svg
                    className="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover/source:opacity-100 transition-opacity"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
