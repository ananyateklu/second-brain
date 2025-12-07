import { useState } from 'react';
import type { GrokSearchSource } from '../../../types/chat';

interface GrokSearchSourcesCardProps {
  sources: GrokSearchSource[];
  isStreaming?: boolean;
}

/**
 * Icon component for X/Twitter posts
 */
function XIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Icon for web/globe sources
 */
function GlobeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

/**
 * Icon for news sources
 */
function NewsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  );
}

/**
 * Get icon component for source type
 */
function getSourceTypeIcon(sourceType: GrokSearchSource['sourceType']) {
  switch (sourceType) {
    case 'x_post':
      return XIcon;
    case 'news':
      return NewsIcon;
    case 'web':
    default:
      return GlobeIcon;
  }
}

/**
 * Get color for source type
 */
function getSourceTypeColor(sourceType: GrokSearchSource['sourceType']) {
  switch (sourceType) {
    case 'x_post':
      return {
        bg: 'rgba(29, 155, 240, 0.1)',
        text: 'rgb(29, 155, 240)',
        border: 'rgba(29, 155, 240, 0.3)',
      };
    case 'news':
      return {
        bg: 'rgba(239, 68, 68, 0.1)',
        text: 'rgb(239, 68, 68)',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    case 'web':
    default:
      return {
        bg: 'var(--color-accent-purple-alpha, rgba(139, 92, 246, 0.1))',
        text: 'var(--color-accent-purple, rgb(139, 92, 246))',
        border: 'var(--color-accent-purple-border, rgba(139, 92, 246, 0.3))',
      };
  }
}

/**
 * Get label for source type
 */
function getSourceTypeLabel(sourceType: GrokSearchSource['sourceType']) {
  switch (sourceType) {
    case 'x_post':
      return 'X Post';
    case 'news':
      return 'News';
    case 'web':
    default:
      return 'Web';
  }
}

/**
 * Format published date
 */
function formatPublishedDate(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  } catch {
    return null;
  }
}

/**
 * Displays Grok Live Search and DeepSearch sources.
 * Shows clickable links to source pages with type badges (web, x_post, news).
 */
export function GrokSearchSourcesCard({ sources, isStreaming = false }: GrokSearchSourcesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (sources.length === 0) return null;

  // Grok accent color (purple)
  const accentColor = 'var(--color-accent-purple, rgb(139, 92, 246))';
  const accentAlpha = 'var(--color-accent-purple-alpha, rgba(139, 92, 246, 0.1))';

  return (
    <div className="relative pl-12 py-2 group">
      {/* Icon on the timeline - Grok/X themed */}
      <div
        className="absolute left-2.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center z-10 border transition-colors"
        style={{
          backgroundColor: 'var(--surface-card)',
          borderColor: 'var(--border)'
        }}
      >
        <XIcon className="w-3 h-3" style={{ color: accentColor }} />
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
            Grok Live Search
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

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {sources.map((source, index) => {
              const Icon = getSourceTypeIcon(source.sourceType);
              const typeColor = getSourceTypeColor(source.sourceType);
              const typeLabel = getSourceTypeLabel(source.sourceType);
              const publishedDate = formatPublishedDate(source.publishedAt);

              return (
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
                    {/* Source type icon */}
                    <div
                      className="w-5 h-5 rounded flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ backgroundColor: typeColor.bg }}
                    >
                      <Icon
                        className="w-3 h-3"
                        style={{ color: typeColor.text }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header with title and type badge */}
                      <div className="flex items-center gap-2">
                        <div
                          className="text-sm font-medium truncate flex-1 group-hover/source:underline"
                          style={{ color: accentColor }}
                        >
                          {source.title || new URL(source.url).hostname}
                        </div>
                        {/* Source type badge */}
                        <span
                          className="px-1.5 py-0.5 text-xs rounded flex-shrink-0"
                          style={{
                            backgroundColor: typeColor.bg,
                            color: typeColor.text,
                            border: `1px solid ${typeColor.border}`,
                          }}
                        >
                          {typeLabel}
                        </span>
                      </div>

                      {/* URL and published date */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <div
                          className="text-xs truncate"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {source.url}
                        </div>
                        {publishedDate && (
                          <>
                            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                            <span
                              className="text-xs flex-shrink-0"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {publishedDate}
                            </span>
                          </>
                        )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
