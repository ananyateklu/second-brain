import { useMemo, useCallback } from 'react';
import { useLLMOutput } from '@llm-ui/react';
import { markdownLookBack } from '@llm-ui/markdown';
import {
  codeBlockLookBack,
  findCompleteCodeBlock,
  findPartialCodeBlock,
} from '@llm-ui/code';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useBoundStore } from '../store/bound-store';
import { useNotes } from '../features/notes/hooks/use-notes-query';
import type { Note, NoteListItem } from '../types/notes';

// Pre-compiled regex patterns for note reference processing
const NOTE_REF_REGEX = /\[\[([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\|([^\]]+)\]\]/gi;
const NOTE_NAME_REGEX = /\[([^\]]+)\](?!\()/g;
const UNICODE_ESCAPE_REGEX = /\\u([0-9A-Fa-f]{4})/g;
const LANGUAGE_REGEX = /language-(\w+)/;

interface LlmUiMessageProps {
  content: string;
  showCursor?: boolean;
  isStreaming?: boolean;
}

// Helper to convert children to string safely
function childrenToString(children: React.ReactNode): string {
  if (Array.isArray(children)) {
    return children
      .map((child) => {
        if (typeof child === 'string') return child;
        if (typeof child === 'number' || typeof child === 'boolean') return String(child);
        return '';
      })
      .join('');
  }
  if (typeof children === 'string') return children;
  if (typeof children === 'number' || typeof children === 'boolean') return String(children);
  return '';
}

export function LlmUiMessage({
  content,
  showCursor = false,
  isStreaming = false,
}: LlmUiMessageProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDark = theme === 'dark' || theme === 'blue';
  const { data: notes } = useNotes();
  const openEditModal = useBoundStore((state) => state.openEditModal);

  // Pre-process content to convert note references to link format
  const processedContent = useMemo(() => {
    // Single pass for Unicode decoding
    let result = content.replace(UNICODE_ESCAPE_REGEX, (_match: string, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    );

    // Replace [[noteId|title]] with link format
    result = result.replace(NOTE_REF_REGEX, (_match: string, noteId: string, title: string) =>
      `[${title}](#noteref?id=${noteId}&title=${encodeURIComponent(title)})`
    );

    // Replace [Note Name] with link, avoiding checkboxes
    result = result.replace(NOTE_NAME_REGEX, (match: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed === 'x' || trimmed === 'X' || trimmed === '') return match;
      return `[${name}](#note?name=${encodeURIComponent(name)})`;
    });

    return result;
  }, [content]);

  // Note click handler
  const handleNoteClick = useCallback(
    (noteOrId: string | Note | NoteListItem) => {
      openEditModal(noteOrId);
    },
    [openEditModal]
  );

  // Use llm-ui hook for streaming output handling
  const { blockMatches } = useLLMOutput({
    llmOutput: processedContent,
    fallbackBlock: {
      component: MarkdownBlock,
      lookBack: markdownLookBack(),
    },
    blocks: [
      {
        component: CodeBlock,
        findCompleteMatch: findCompleteCodeBlock(),
        findPartialMatch: findPartialCodeBlock(),
        lookBack: codeBlockLookBack(),
      },
    ],
    isStreamFinished: !isStreaming,
  });

  // Code block component
  function CodeBlock({ blockMatch }: { blockMatch: { output: string } }) {
    const codeContent = blockMatch.output;
    // Extract language from code fence
    const langMatch = codeContent.match(/^```(\w+)/);
    const language = langMatch?.[1] || 'text';
    // Remove code fence markers
    const code = codeContent
      .replace(/^```\w*\n?/, '')
      .replace(/\n?```$/, '');

    return (
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          fontSize: '0.875rem',
          marginBottom: '1rem',
        }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    );
  }

  // Markdown block component with note reference handling
  function MarkdownBlock({ blockMatch }: { blockMatch: { output: string } }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-4 last:mb-0 leading-relaxed" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc mb-4 space-y-2 ml-6" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal mb-4 space-y-2 ml-6" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          li: ({ ...props }) => (
            <li className="mb-1" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-bold" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic" style={{ color: 'var(--text-primary)' }} {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 pl-4 my-4 italic"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const match = LANGUAGE_REGEX.exec(className ?? '');
            const isInline = !className?.includes('language-');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-sm font-mono"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Block code is handled by CodeBlock component
            return (
              <SyntaxHighlighter
                language={match?.[1] || 'text'}
                style={isDark ? oneDark : oneLight}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
                PreTag="div"
              >
                {childrenToString(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          // Handle note reference links
          a: (props) => {
            // Handle [[noteId|title]] references
            if (props.href?.startsWith('#noteref?')) {
              const params = new URLSearchParams(props.href.replace('#noteref?', ''));
              const noteId = params.get('id');
              const noteTitle = params.get('title');

              if (!noteId) {
                return <span style={{ color: 'var(--text-primary)' }}>{props.children}</span>;
              }

              const opacity = '12%';
              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNoteClick(noteId);
                  }}
                  title={noteTitle || undefined}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 my-0.5 rounded-md text-xs font-medium transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] align-baseline"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-brand-500) ${opacity}, transparent)`,
                    border: `1px solid color-mix(in srgb, var(--color-brand-500) ${opacity}, transparent)`,
                    color: `color-mix(in srgb, var(--color-brand-500) 70%, var(--text-secondary))`,
                    cursor: 'pointer',
                    maxWidth: '200px',
                    verticalAlign: 'baseline',
                  }}
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="truncate">{noteTitle || 'Note'}</span>
                </button>
              );
            }

            // Handle [Note Name] references
            if (props.href?.startsWith('#note?name=')) {
              const noteName = decodeURIComponent(props.href.replace('#note?name=', ''));
              const note = notes?.find((n) => n.title === noteName);

              if (!note) {
                return <span style={{ color: 'var(--text-primary)' }}>[{props.children}]</span>;
              }

              return (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNoteClick(note);
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mx-1 cursor-pointer transition-all duration-200 hover:opacity-80 hover:shadow-sm"
                  style={{
                    backgroundColor: isDark
                      ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                      : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                    color: isDark ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                    opacity: isDark ? 1 : 0.7,
                    userSelect: 'none',
                  }}
                  title={`Edit "${note.title}"`}
                >
                  {props.children}
                </span>
              );
            }

            return (
              <a
                className="underline hover:no-underline"
                style={{ color: 'var(--btn-primary-bg)' }}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            );
          },
        }}
      >
        {blockMatch.output}
      </ReactMarkdown>
    );
  }

  return (
    <div className={`markdown-content${showCursor ? ' streaming-cursor' : ''}`}>
      {blockMatches.map((blockMatch, index) => {
        const Component = blockMatch.block.component;
        return <Component key={index} blockMatch={blockMatch} />;
      })}
    </div>
  );
}
