import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useThemeStore } from '../store/theme-store';
import { useNotes } from '../features/notes/hooks/use-notes-query';
import { useUIStore } from '../store/ui-store';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark' || theme === 'blue';
  const { data: notes } = useNotes();
  const openEditModal = useUIStore((state) => state.openEditModal);

  const processedContent = useMemo(() => {
    // Replace [Note Name] with custom link, avoiding checkboxes [x] [ ] and existing links
    return content.replace(/\[([^\]]+)\](?!\()/g, (match, name) => {
      const trimmed = name.trim();
      // Avoid matching checkboxes
      if (trimmed === 'x' || trimmed === 'X' || trimmed === '') return match;
      return `[${name}](#note?name=${encodeURIComponent(name)})`;
    });
  }, [content]);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ... existing components ...
          // Headers
          h1: ({ node, ...props }) => (
            <h1
              className="text-2xl font-bold mt-6 mb-4"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-xl font-bold mt-5 mb-3"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-lg font-semibold mt-4 mb-2"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-base font-semibold mt-3 mb-2"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h5: ({ node, ...props }) => (
            <h5
              className="text-sm font-semibold mt-2 mb-1"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          h6: ({ node, ...props }) => (
            <h6
              className="text-xs font-semibold mt-2 mb-1"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Paragraphs
          p: ({ node, ...props }) => (
            <p
              className="mb-4 last:mb-0 leading-relaxed"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Lists
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc mb-4 space-y-2 ml-6"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal mb-4 space-y-2 ml-6"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li
              className="mb-1"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Strong/Bold
          strong: ({ node, ...props }) => (
            <strong
              className="font-bold"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Emphasis/Italic
          em: ({ node, ...props }) => (
            <em
              className="italic"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          // Code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            if (inline) {
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
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          pre: ({ node, ...props }: any) => {
            // If it contains a code element with syntax highlighting, don't wrap it
            const hasCodeBlock = node?.children?.some(
              (child: any) => child.type === 'element' && child.tagName === 'code' && child.properties?.className
            );

            if (hasCodeBlock) {
              return <>{props.children}</>;
            }

            return (
              <pre
                className="p-4 rounded-lg mb-4 overflow-x-auto"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                }}
                {...props}
              />
            );
          },
          // Blockquotes
          blockquote: ({ node, ...props }) => (
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
          a: ({ node, ...props }) => {
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
          hr: ({ node, ...props }) => (
            <hr
              className="my-6"
              style={{ borderColor: 'var(--border)' }}
              {...props}
            />
          ),
          // Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border-collapse"
                style={{ borderColor: 'var(--border)' }}
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              style={{ backgroundColor: 'var(--surface-card)' }}
              {...props}
            />
          ),
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => (
            <tr
              className="border-b"
              style={{ borderColor: 'var(--border)' }}
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-2 text-left font-semibold"
              style={{ color: 'var(--text-primary)' }}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
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

