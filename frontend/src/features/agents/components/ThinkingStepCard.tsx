import { useState, useEffect, useMemo, memo, ComponentPropsWithoutRef, Fragment } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThinkingStep } from '../types/agent-types';
import { InlineNoteReference } from '../../chat/components/InlineNoteReference';
import { splitTextWithNoteReferences } from '../../../utils/note-reference-utils';

interface ThinkingStepCardProps {
  step: ThinkingStep;
  isLast?: boolean;
  /** When true, the card will be expanded by default to show streaming content */
  isStreaming?: boolean;
}

// Lightweight markdown components for thinking content
const thinkingMarkdownComponents: Components = {
  // Paragraphs - more compact for thinking
  p: ({ node: _node, ...props }: ComponentPropsWithoutRef<'p'> & { node?: unknown }) => (
    <p
      className="leading-relaxed [&:not(:last-child)]:mb-2"
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  ),
  // Strong/Bold
  strong: ({ node: _node, ...props }: ComponentPropsWithoutRef<'strong'> & { node?: unknown }) => (
    <strong
      className="font-semibold"
      style={{ color: 'var(--text-primary)' }}
      {...props}
    />
  ),
  // Emphasis/Italic
  em: ({ node: _node, ...props }: ComponentPropsWithoutRef<'em'> & { node?: unknown }) => (
    <em
      className="italic"
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  ),
  // Lists - ordered
  ol: ({ node: _node, ...props }: ComponentPropsWithoutRef<'ol'> & { node?: unknown }) => (
    <ol
      className="list-decimal space-y-1 ml-5 [&:not(:last-child)]:mb-2"
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  ),
  // Lists - unordered
  ul: ({ node: _node, ...props }: ComponentPropsWithoutRef<'ul'> & { node?: unknown }) => (
    <ul
      className="list-disc space-y-1 ml-5 [&:not(:last-child)]:mb-2"
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  ),
  // List items
  li: ({ node: _node, ...props }: ComponentPropsWithoutRef<'li'> & { node?: unknown }) => (
    <li
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  ),
  // Inline code
  code: ({ node: _node, className, ...props }: ComponentPropsWithoutRef<'code'> & { node?: unknown }) => {
    // Check if it's a code block (has language class) vs inline code
    const isCodeBlock = className?.includes('language-');
    if (isCodeBlock) {
      return (
        <code
          className="block p-2 rounded text-xs overflow-x-auto thin-scrollbar"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
          }}
          {...props}
        />
      );
    }
    return (
      <code
        className="px-1 py-0.5 rounded text-xs"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
        }}
        {...props}
      />
    );
  },
  // Pre blocks
  pre: ({ node: _node, ...props }: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) => (
    <pre
      className="p-2 rounded overflow-x-auto thin-scrollbar text-xs [&:not(:last-child)]:mb-2"
      style={{
        backgroundColor: 'var(--surface-elevated)',
      }}
      {...props}
    />
  ),
  // Blockquotes
  blockquote: ({ node: _node, ...props }: ComponentPropsWithoutRef<'blockquote'> & { node?: unknown }) => (
    <blockquote
      className="border-l-2 pl-3 italic [&:not(:first-child)]:mt-2 [&:not(:last-child)]:mb-2"
      style={{
        borderColor: 'var(--border)',
        color: 'var(--text-tertiary)',
      }}
      {...props}
    />
  ),
  // Links
  a: ({ node: _node, ...props }: ComponentPropsWithoutRef<'a'> & { node?: unknown }) => (
    <a
      className="underline hover:no-underline"
      style={{ color: 'var(--color-brand-500)' }}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
};

/**
 * Renders content with note references parsed out and displayed as interactive components.
 * Falls back to plain markdown if no note references are found.
 */
function ThinkingContentWithNoteReferences({ content }: { content: string }) {
  const segments = splitTextWithNoteReferences(content);

  // If no note references, just render regular markdown
  if (segments.length === 1 && segments[0].type === 'text') {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={thinkingMarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    );
  }

  // Render mixed content with note references
  return (
    <div className="space-y-1">
      {segments.map((segment, index) => {
        if (segment.type === 'note-reference' && segment.noteId) {
          return (
            <div key={`${segment.noteId}-${index}`} className="inline-block">
              <InlineNoteReference
                noteId={segment.noteId}
                noteTitle={segment.noteTitle}
                variant="subtle"
              />
            </div>
          );
        }

        // For text segments, render markdown
        return (
          <Fragment key={`text-${index}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={thinkingMarkdownComponents}
            >
              {segment.content}
            </ReactMarkdown>
          </Fragment>
        );
      })}
    </div>
  );
}

export const ThinkingStepCard = memo(function ThinkingStepCard({ step, isStreaming = false }: ThinkingStepCardProps) {
  // Start expanded when streaming, collapsed otherwise
  // Use functional update to auto-expand when streaming starts
  const [isExpanded, setIsExpanded] = useState(isStreaming);

  // Auto-expand when streaming starts - valid prop sync for UI state
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Process content - trim and prepare for markdown rendering
  const processedContent = useMemo(() => {
    return step.content.trim();
  }, [step.content]);

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
            className="mt-2 p-3 rounded-lg text-xs font-mono overflow-x-auto thinking-content"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            <div className="[&>*:last-child]:!mb-0 [&>*:last-child>*:last-child]:!mb-0">
              <ThinkingContentWithNoteReferences content={processedContent} />
            </div>
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
});
