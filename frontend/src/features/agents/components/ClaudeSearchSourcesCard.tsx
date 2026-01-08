import { useState } from 'react';
import type { ClaudeSearchSource } from '../../../types/chat';
import { TimelineItem } from '../../../shared/components';

interface ClaudeSearchSourcesCardProps {
  sources: ClaudeSearchSource[];
  query?: string;
  isStreaming?: boolean;
}

/**
 * Search icon for web sources
 */
function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

/**
 * Displays Claude's web search sources.
 * Shows clickable links to source pages with page age and snippets.
 */
export function ClaudeSearchSourcesCard({ sources, query, isStreaming = false }: ClaudeSearchSourcesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0) return null;

  // Claude accent color (orange/coral)
  const accentColor = 'var(--color-accent-orange, rgb(251, 146, 60))';
  const accentAlpha = 'var(--color-accent-orange-alpha, rgba(251, 146, 60, 0.1))';

  return (
    <TimelineItem isLoading={isStreaming}>
      <div className="text-sm">
        <button
          onClick={() => { setIsExpanded(!isExpanded); }}
          className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
        >
          <span
            className="font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Web Search
          </span>
          <span
            className="px-1.5 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: accentAlpha,
              color: accentColor,
            }}
          >
            {sources.length}
          </span>
          {isStreaming && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: accentColor }}
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

        {query && (
          <div
            className="text-xs mt-1 italic"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Searched: "{query}"
          </div>
        )}

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg transition-all hover:scale-[1.01] group/source"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-start gap-2">
                  {/* Search icon */}
                  <div
                    className="w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ backgroundColor: accentAlpha }}
                  >
                    <SearchIcon
                      className="w-3 h-3"
                      style={{ color: accentColor }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div
                      className="text-sm font-medium truncate group-hover/source:underline"
                      style={{ color: accentColor }}
                    >
                      {source.title || (() => {
                        try {
                          return new URL(source.url).hostname;
                        } catch {
                          return source.url;
                        }
                      })()}
                    </div>

                    {/* URL and page age */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <div
                        className="text-xs truncate"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {source.url}
                      </div>
                      {source.pageAge && (
                        <>
                          <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                          <span
                            className="text-xs flex-shrink-0"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {source.pageAge}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Snippet or cited text */}
                    {(source.snippet || source.citedText) && (
                      <div
                        className="text-xs mt-1.5 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {source.citedText || source.snippet}
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
    </TimelineItem>
  );
}
