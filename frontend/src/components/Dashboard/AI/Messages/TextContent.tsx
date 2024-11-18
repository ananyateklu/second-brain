import React from 'react';
import { Message } from '../../../../types/message';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from '../CodeBlock';
import remarkGfm from 'remark-gfm';

interface TextContentProps {
  message: Message;
  themeColor: string;
}

export function TextContent({ message, themeColor }: TextContentProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            
            // Handle inline code differently from code blocks
            if (!inline && match) {
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, '')}
                  language={match[1]}
                  themeColor={themeColor}
                />
              );
            }
            
            // For inline code
            return (
              <code 
                className="px-1.5 py-0.5 rounded-md 
                  bg-black/10 dark:bg-white/10 
                  text-gray-800 dark:text-gray-200
                  text-xs font-mono" 
                {...props}
              >
                {children}
              </code>
            );
          },
          // Add other component overrides as needed
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 text-gray-900 dark:text-gray-100">{children}</p>
          ),
          // ... other component overrides
        }}
      >
        {message.content as string}
      </ReactMarkdown>
    </div>
  );
} 