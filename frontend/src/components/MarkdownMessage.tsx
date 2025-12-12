import { useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Element type is used in type assertions below
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

interface MarkdownMessageProps {
  content: string;
  /** Show a blinking cursor at the end of the content (for streaming) */
  showCursor?: boolean;
}

export function MarkdownMessage({ content, showCursor = false }: MarkdownMessageProps) {
  const theme = useBoundStore((state) => state.theme);
  const isDark = theme === 'dark' || theme === 'blue';
  const { data: notes } = useNotes();
  const openEditModal = useBoundStore((state) => state.openEditModal);

  const processedContent = useMemo(() => {
    // Decode Unicode escape sequences (e.g., \uD83D\uDC4B -> 👋)
    // Replace all \uXXXX patterns with their actual Unicode characters
    const decoded = content.replace(/\\u([0-9A-Fa-f]{4})/g, (_match: string, code: string) => {
      return String.fromCharCode(parseInt(code, 16));
    });

    // Replace [Note Name] with custom link, avoiding checkboxes [x] [ ] and existing links
    return decoded.replace(/\[([^\]]+)\](?!\()/g, (match: string, name: string) => {
      const trimmed = name.trim();
      // Avoid matching checkboxes
      if (trimmed === 'x' || trimmed === 'X' || trimmed === '') return match;
      return `[${name}](#note?name=${encodeURIComponent(name)})`;
    });
  }, [content]);

  return (
    <div className={`markdown-content${showCursor ? ' streaming-cursor' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ... existing components ...
          // Headers
          h1: ({ node: _node, ...props }) => (
            <h1
              className="text-2xl font-bold mt-6 mb-4"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2
              className="text-xl font-bold mt-5 mb-3"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3
              className="text-lg font-semibold mt-4 mb-2"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h4: ({ node: _node, ...props }) => (
            <h4
              className="text-base font-semibold mt-3 mb-2"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h5: ({ node: _node, ...props }) => (
            <h5
              className="text-sm font-semibold mt-2 mb-1"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h6: ({ node: _node, ...props }) => (
            <h6
              className="text-xs font-semibold mt-2 mb-1"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Paragraphs
          p: ({ node: _node, ...props }) => (
            <p
              className="mb-4 last:mb-0 leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Lists
          ul: ({ node: _node, ...props }) => (
            <ul
              className="list-disc mb-4 space-y-2 ml-6"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol
              className="list-decimal mb-4 space-y-2 ml-6"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          li: ({ node: _node, ...props }) => (
            <li
              className="mb-1"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Strong/Bold
          strong: ({ node: _node, ...props }) => (
            <strong
              className="font-bold"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Emphasis/Italic
          em: ({ node: _node, ...props }) => (
            <em
              className="italic"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Code blocks
          code: (({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className ?? '');
            const language = match?.[1] !== undefined ? match[1] : '';
            // Check if inline based on whether parent is a pre element (heuristic)
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

            // Convert children to string safely
            const childrenStr = Array.isArray(children)
              ? children.map((child) => {
                if (typeof child === 'string') return child;
                if (typeof child === 'number' || typeof child === 'boolean') return String(child);
                return '';
              }).join('')
              : typeof children === 'string'
                ? children
                : typeof children === 'number' || typeof children === 'boolean'
                  ? String(children)
                  : '';

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
                {childrenStr.replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }) as Components['code'],
          pre: (({ node, children, ...props }) => {
            // If it contains a code element with syntax highlighting, don't wrap it
            const hasCodeBlock = node !== undefined && node !== null && 'children' in node && Array.isArray(node.children) && node.children.some(
              (child: unknown) => {
                if (typeof child === 'object' && child !== null && 'type' in child) {
                  const typedChild = child as { type: string; tagName?: string; properties?: { className?: unknown } };
                  return typedChild.type === 'element' &&
                    typedChild.tagName === 'code' &&
                    typedChild.properties?.className !== undefined;
                }
                return false;
              }
            );

            if (hasCodeBlock) {
              return <>{children}</>;
            }

            return (
              <pre
                className="p-4 rounded-lg mb-4 overflow-x-auto"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
                {...props}
              >
                {children}
              </pre>
            );
          }) as Components['pre'],
          // Blockquotes
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="border-l-4 pl-4 my-4 italic"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
              {...props}
            />
          ),
          // Links
          a: ({ node: _node, ...props }) => {
            if (props.href?.startsWith('#note?name=')) {
              const noteName = decodeURIComponent(props.href.replace('#note?name=', ''));
              const note = notes?.find(n => n.title === noteName);

              if (!note) {
                return <span style={{ color: 'var(--text-primary)' }}>[{props.children}]</span>;
              }

              return (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (note) {
                      openEditModal(note);
                    }
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mx-1 cursor-pointer transition-all duration-200 hover:opacity-80 hover:shadow-sm"
                  style={{
                    backgroundColor: isDark
                      ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                      : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                    color: isDark ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                    opacity: isDark ? 1 : 0.7,
                    userSelect: 'none'
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
          // Horizontal rule
          hr: ({ node: _node, ...props }) => (
            <hr
              className="my-6"
              style={{ borderColor: 'var(--border)' }}
              {...props}
            />
          ),
          // Tables
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border-collapse"
                style={{ borderColor: 'var(--border)' }}
                {...props}
              />
            </div>
          ),
          thead: ({ node: _node, ...props }) => (
            <thead
              style={{ backgroundColor: 'var(--surface-card)' }}
              {...props}
            />
          ),
          tbody: ({ node: _node, ...props }) => <tbody {...props} />,
          tr: ({ node: _node, ...props }) => (
            <tr
              className="border-b"
              style={{ borderColor: 'var(--border)' }}
              {...props}
            />
          ),
          th: ({ node: _node, ...props }) => (
            <th
              className="px-4 py-2 text-left font-semibold"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          td: ({ node: _node, ...props }) => (
            <td
              className="px-4 py-2"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

