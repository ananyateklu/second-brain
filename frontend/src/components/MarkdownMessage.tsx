import { useMemo, useCallback } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Import only the languages you need (reduces bundle size significantly)
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import { useBoundStore } from '../store/bound-store';
import { useNotes } from '../features/notes/hooks/use-notes-query';
import type { Note, NoteListItem } from '../types/notes';

// Pre-compiled regex patterns (module level for performance)
const UNICODE_ESCAPE_REGEX = /\\u([0-9A-Fa-f]{4})/g;
const NOTE_REF_REGEX = /\[\[([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\|([^\]]+)\]\]/gi;
const NOTE_NAME_REGEX = /\[([^\]]+)\](?!\()/g;
const LANGUAGE_REGEX = /language-(\w+)/;

// Register languages
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('js', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('zsh', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('html', markup);
SyntaxHighlighter.registerLanguage('xml', markup);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cs', csharp);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('diff', diff);

// Static components that don't depend on any props (memoized at module level)
const staticComponents: Partial<Components> = {
  h1: ({ node: _node, ...props }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="text-xl font-bold mt-5 mb-3" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  h4: ({ node: _node, ...props }) => (
    <h4 className="text-base font-semibold mt-3 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  h5: ({ node: _node, ...props }) => (
    <h5 className="text-sm font-semibold mt-2 mb-1" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  h6: ({ node: _node, ...props }) => (
    <h6 className="text-xs font-semibold mt-2 mb-1" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  p: ({ node: _node, ...props }) => (
    <p className="mb-4 last:mb-0 leading-relaxed" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul className="list-disc mb-4 space-y-2 ml-6" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="list-decimal mb-4 space-y-2 ml-6" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  li: ({ node: _node, ...props }) => (
    <li className="mb-1" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  strong: ({ node: _node, ...props }) => (
    <strong className="font-bold" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  em: ({ node: _node, ...props }) => (
    <em className="italic" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="border-l-4 pl-4 my-4 italic"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => (
    <hr className="my-6" style={{ borderColor: 'var(--border)' }} {...props} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto thin-scrollbar my-4">
      <table className="min-w-full border-collapse" style={{ borderColor: 'var(--border)' }} {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => (
    <thead style={{ backgroundColor: 'var(--surface-card)' }} {...props} />
  ),
  tbody: ({ node: _node, ...props }) => <tbody {...props} />,
  tr: ({ node: _node, ...props }) => (
    <tr className="border-b" style={{ borderColor: 'var(--border)' }} {...props} />
  ),
  th: ({ node: _node, ...props }) => (
    <th className="px-4 py-2 text-left font-semibold" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }} {...props} />
  ),
};

interface MarkdownMessageProps {
  content: string;
  /** Show a blinking cursor at the end of the content (for streaming) */
  showCursor?: boolean;
}

// Helper to convert children to string safely (used by code component)
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

export function MarkdownMessage({ content, showCursor = false }: MarkdownMessageProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDark = theme === 'dark' || theme === 'blue';
  const { data: notes } = useNotes();
  const openEditModal = useBoundStore((state) => state.openEditModal);

  // Memoized click handler for note references
  const handleNoteClick = useCallback(
    (noteOrId: string | Note | NoteListItem) => {
      openEditModal(noteOrId);
    },
    [openEditModal]
  );

  // Optimized content processing with pre-compiled regex
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

  // Memoized dynamic components (depend on isDark, notes, handleNoteClick)
  const dynamicComponents = useMemo((): Partial<Components> => ({
    // Code blocks - depends on isDark for syntax highlighting theme
    code: (({ className, children, ...props }) => {
      const match = LANGUAGE_REGEX.exec(className ?? '');
      const language = match?.[1] ?? '';
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

      return (
        <SyntaxHighlighter
          language={language || 'text'}
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
    }) as Components['code'],

    // Pre element
    pre: (({ node, children, ...props }) => {
      const hasCodeBlock =
        node !== undefined &&
        node !== null &&
        'children' in node &&
        Array.isArray(node.children) &&
        node.children.some((child: unknown) => {
          if (typeof child === 'object' && child !== null && 'type' in child) {
            const typedChild = child as { type: string; tagName?: string; properties?: { className?: unknown } };
            return typedChild.type === 'element' && typedChild.tagName === 'code' && typedChild.properties?.className !== undefined;
          }
          return false;
        });

      if (hasCodeBlock) {
        return <>{children}</>;
      }

      return (
        <pre
          className="p-4 rounded-lg mb-4 overflow-x-auto thin-scrollbar"
          style={{ backgroundColor: 'var(--surface-card)', border: '1px solid var(--border)' }}
          {...props}
        >
          {children}
        </pre>
      );
    }) as Components['pre'],

    // Links - handles note references
    a: ({ node: _node, ...props }) => {
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
  }), [isDark, notes, handleNoteClick]);

  // Combined components: static + dynamic (memoized)
  const components = useMemo(
    () => ({ ...staticComponents, ...dynamicComponents }),
    [dynamicComponents]
  );

  return (
    <div className={`markdown-content${showCursor ? ' streaming-cursor' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

