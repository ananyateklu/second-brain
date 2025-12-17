import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Loader2, AlertTriangle, FileWarning, ExternalLink, FileCode } from 'lucide-react';
import { useBoundStore } from '../../../../store/bound-store';
import type { GitHubFileContentResponse } from '../../../../types/github';
import { getLanguageForHighlighter } from '../../../../types/github';

interface CodeViewerProps {
  content: GitHubFileContentResponse | null;
  isLoading: boolean;
  error?: Error | null;
  selectedPath: string | null;
}

export function CodeViewer({
  content,
  isLoading,
  error,
  selectedPath,
}: CodeViewerProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // No file selected state
  if (!selectedPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 10%, transparent)' }}
        >
          <FileCode className="h-10 w-10" style={{ color: 'var(--color-brand-500)', opacity: 0.7 }} />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Select a file to view</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Choose a file from the tree on the left</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color: 'var(--color-brand-500)' }}
        />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading file...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-error) 10%, transparent)' }}
        >
          <AlertTriangle className="h-6 w-6" style={{ color: 'var(--color-error)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Failed to load file</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {error.message}
        </p>
      </div>
    );
  }

  // No content state
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)' }}
        >
          <FileWarning className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Unable to load file content</p>
      </div>
    );
  }

  // Binary file state
  if (content.isBinary) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)' }}
        >
          <FileWarning className="h-8 w-8" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Binary file</p>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-tertiary)' }}>
          This file cannot be displayed as text
        </p>
        {content.htmlUrl && (
          <a
            href={content.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--color-primary-alpha)',
              color: 'var(--color-brand-400)',
            }}
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </a>
        )}
      </div>
    );
  }

  // Truncated (large file) state
  if (content.isTruncated) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)' }}
        >
          <FileWarning className="h-8 w-8" style={{ color: 'var(--color-warning)' }} />
        </div>
        <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>File too large</p>
        <p className="text-sm mt-1 mb-1" style={{ color: 'var(--text-secondary)' }}>
          This file exceeds 1 MB and cannot be displayed here
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
          Size: {formatFileSize(content.size)}
        </p>
        {content.htmlUrl && (
          <a
            href={content.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--color-primary-alpha)',
              color: 'var(--color-brand-400)',
            }}
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </a>
        )}
      </div>
    );
  }

  // Determine language for syntax highlighting
  const language = getLanguageForHighlighter(content.language);

  return (
    <div className="flex flex-col h-full" style={{ animation: 'fadeInSlideUp 0.2s ease-out' }}>
      {/* File header */}
      <div
        className="flex items-center justify-between px-4 py-[18.5px] border-b flex-shrink-0"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {content.name}
          </span>
          {content.language && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-secondary)',
              }}
            >
              {content.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {formatFileSize(content.size)}
          </span>
          {content.htmlUrl && (
            <a
              href={content.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 transition-all duration-200"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-brand-400)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
          )}
        </div>
      </div>

      {/* Code content - container provides themed background */}
      <div className="flex-1 overflow-auto thin-scrollbar" style={{ backgroundColor: 'var(--surface-card)' }}>
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            textAlign: 'right',
            userSelect: 'none',
            color: 'var(--text-tertiary)',
          }}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '13px',
            lineHeight: '1.5',
            background: 'transparent', // Let container background show through
            minHeight: '100%',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            },
          }}
        >
          {content.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}
