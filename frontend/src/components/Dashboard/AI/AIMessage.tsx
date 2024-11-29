import { AnimatePresence } from 'framer-motion';
import { MessageHeader } from './Messages/MessageHeader';
import { MessageContent } from './Messages/MessageContent';
import { CopyButton } from './Messages/CopyButton';
import { ThoughtProcess } from './ThoughtProcess';
import { useAI } from '../../../contexts/AIContext';
import { Message } from '../../../types/message';
import { AudioContent } from './Messages/AudioContent';

interface AIMessageProps {
  message: Message;
  themeColor: string;
  isStreaming?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function AIMessage({
  message,
  themeColor,
  isStreaming,
  isFirstInGroup,
  isLastInGroup
}: AIMessageProps) {
  const isUser = message.role === 'user';
  const { executionSteps } = useAI();
  const messageSteps = message.executionSteps || executionSteps[message.id] || [];
  
  const shouldShowThoughtProcess = !isUser &&
    message.model?.category === 'function' &&
    messageSteps.length > 0;

  const shouldShowCopyButton = message.content && 
    typeof message.content === 'string' &&
    message.type !== 'function';

  const renderContent = () => {
    if (message.type === 'audio' && message.role === 'assistant') {
      return (
        <div className="w-full space-y-2">
          {message.isLoading ? (
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 relative">
                <div
                  className="absolute inset-0 border-2 border-current rounded-full animate-spin"
                  style={{ borderTopColor: 'transparent' }}
                />
              </div>
              <span>Generating audio...</span>
            </div>
          ) : (
            <AudioContent message={message} />
          )}

          {/* Show input text if available */}
          {message.inputText && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              <span className="font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Text:
              </span>
              <p className="mt-1">{message.inputText}</p>
            </div>
          )}
        </div>
      );
    }

    const content = message.content as string;
    const hasThoughtProcess = message.model?.isReasoner && 
      content.includes('<Thought>') && 
      content.includes('</Thought>');

    // Extract and format thought steps if we have a thought process
    const thoughtSteps = hasThoughtProcess ? formatThoughtSteps(extractThought(content)) : [];

    return (
      <div className={`group flex items-start gap-4 ${isFirstInGroup ? 'mt-4' : 'mt-2'}`}>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1`}>
          {isFirstInGroup && <MessageHeader message={message} isUser={isUser} />}
          
          {hasThoughtProcess ? (
            <div className="space-y-3 w-full max-w-[800px]">
              {/* Thought Process Bubble */}
              <div className="relative">
                <div className={`px-4 py-2.5 rounded-2xl
                  backdrop-blur-md shadow-lg
                  bg-gradient-to-br from-gray-100/70 to-gray-50/40 
                  dark:from-gray-700/70 dark:to-gray-800/40
                  border border-gray-200/30 dark:border-gray-700/30
                  text-gray-700 dark:text-gray-300
                  text-sm`}
                >
                  <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                      />
                    </svg>
                    <span>Reasoning Steps</span>
                  </div>
                  <div className="space-y-3">
                    {thoughtSteps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start group">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 
                          flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300
                          group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                          {index + 1}
                        </div>
                        <div className="flex-1 leading-relaxed">
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Response Bubble */}
              <div className="relative">
                <div className={`px-4 py-2.5 rounded-2xl
                  backdrop-blur-md shadow-lg
                  bg-gradient-to-br from-white/70 to-white/40 
                  dark:from-gray-800/70 dark:to-gray-800/40
                  border border-gray-200/30 dark:border-gray-700/30
                  text-gray-900 dark:text-gray-100
                  text-sm`}
                >
                  <div className="prose prose-sm dark:prose-invert">
                    {extractOutput(content)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Regular message bubble (existing code)
            <div className="relative">
              <div className={`px-4 py-2.5 rounded-2xl
                backdrop-blur-md shadow-lg
                border border-gray-200/30 dark:border-gray-700/30
                ${isUser
                  ? 'bg-gradient-to-br from-primary-500/70 to-primary-600/70 text-white'
                  : 'bg-gradient-to-br from-white/70 to-white/40 dark:from-gray-800/70 dark:to-gray-800/40 text-gray-900 dark:text-gray-100'
                }
                ${!isLastInGroup && isUser ? 'rounded-br-md rounded-bl-2xl' : ''}
                ${!isLastInGroup && !isUser ? 'rounded-bl-md rounded-br-2xl' : ''}
                hover:shadow-xl transition-shadow duration-200
                text-sm
                max-w-[600px] overflow-hidden`}
                style={isUser ? {
                  background: `linear-gradient(135deg, ${message.model?.color ?? themeColor}70, ${message.model?.color ?? themeColor}80)`
                } : undefined}
              >
                <div className="overflow-x-auto custom-scrollbar">
                  <MessageContent 
                    message={message} 
                    themeColor={themeColor}
                    isStreaming={isStreaming}
                  />
                </div>
              </div>

              {shouldShowCopyButton && (
                <AnimatePresence>
                  <CopyButton 
                    content={message.content as string} 
                    isUser={isUser} 
                  />
                </AnimatePresence>
              )}
            </div>
          )}

          {isLastInGroup && (
            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {shouldShowThoughtProcess && (
          <div className="ml-4 flex-1 max-w-lg">
            <ThoughtProcess
              steps={messageSteps}
              isComplete={!isStreaming}
              themeColor={themeColor}
            />
          </div>
        )}
      </div>
    );
  };

  return renderContent();
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