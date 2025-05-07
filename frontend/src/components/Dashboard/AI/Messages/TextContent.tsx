import { Message } from '../../../../types/message';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';
import remarkGfm from 'remark-gfm';
import { type ComponentPropsWithoutRef } from 'react';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface TextContentProps {
  message: Message;
  themeColor: string;
}

export function TextContent({ message, themeColor }: TextContentProps) {
  const { theme } = useTheme();

  // Ensure content is a string and handle potential nested structures
  const messageContent = message.content as { content?: string } | string;
  const content = typeof messageContent === 'string'
    ? messageContent
    : messageContent?.content || '';

  if (message.model?.isReasoner &&
    content &&
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
                <div className={`flex-shrink-0 w-6 h-6 rounded-full
                  flex items-center justify-center text-xs font-medium
                  ${theme === 'midnight' || theme === 'full-dark'
                    ? 'bg-gray-800 text-gray-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className={`${theme === 'midnight' || theme === 'full-dark'
                      ? 'text-gray-300'
                      : 'text-gray-700 dark:text-gray-300'}`}
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
          code(props: ComponentPropsWithoutRef<'code'>) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';

            return match ? (
              <CodeBlock
                code={String(children)}
                language={language}
                themeColor={themeColor}
                {...rest}
              />
            ) : (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          }
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