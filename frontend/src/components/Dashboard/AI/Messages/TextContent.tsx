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
  const content = message.content as string;
  
  if (message.model?.isReasoner && 
      content.includes('<Thought>') && 
      content.includes('</Thought>')) {
    const thought = extractThought(content);
    // Split thought into paragraphs and format as steps
    const thoughtSteps = formatThoughtSteps(thought);
    
    return (
      <div className="space-y-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="space-y-2">
            {thoughtSteps.map((step, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 
                  flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    {step}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {extractOutput(content)}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            
            if (!inline && match) {
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, '')}
                  language={match[1]}
                  themeColor={themeColor}
                />
              );
            }
            
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
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 text-gray-900 dark:text-gray-100">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 

function extractThought(content: string): string {
  const thoughtMatch = content.match(/<Thought>(.*?)<\/Thought>/s);
  return thoughtMatch ? thoughtMatch[1].trim() : '';
}

function extractOutput(content: string): string {
  const outputMatch = content.match(/<Output>(.*?)<\/Output>/s);
  return outputMatch ? outputMatch[1].trim() : '';
}

function formatThoughtSteps(thought: string): string[] {
  // First, try to split on line breaks or double line breaks
  let steps = thought.split(/\n\n+/);
  
  // If we only got one step, try to split on sentences
  if (steps.length === 1) {
    // Split on periods that are followed by a space and a capital letter
    steps = thought
      .split(/(?<=\.)\s+(?=[A-Z])/)
      .filter(step => step.trim().length > 0)
      .map(step => step.trim());
  }

  // Group very short steps together
  const groupedSteps: string[] = [];
  let currentStep = '';

  for (const step of steps) {
    // If it's a very short step (less than 50 chars), combine it with the previous one
    if (step.length < 50 && currentStep) {
      currentStep += ' ' + step;
    } else if (currentStep.length + step.length < 150) {
      // If combining wouldn't make it too long, add to current step
      currentStep += (currentStep ? ' ' : '') + step;
    } else {
      // If current step is not empty, push it and start a new one
      if (currentStep) {
        groupedSteps.push(currentStep);
      }
      currentStep = step;
    }
  }
  
  // Don't forget to add the last step
  if (currentStep) {
    groupedSteps.push(currentStep);
  }

  // Filter out any empty steps and ensure each step ends with a period
  return groupedSteps
    .filter(step => step.trim().length > 0)
    .map(step => step.trim() + (step.endsWith('.') ? '' : '.'));
}