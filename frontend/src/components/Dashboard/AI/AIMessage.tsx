import { AnimatePresence } from 'framer-motion';
import { MessageHeader } from './Messages/MessageHeader';
import { MessageContent } from './Messages/MessageContent';
import { CopyButton } from './Messages/CopyButton';
import { ThoughtProcess } from './ThoughtProcess';
import { useAI } from '../../../contexts/AIContext';
import { Message } from '../../../types/message';
import { AudioContent } from './Messages/AudioContent';
import { ToolExecution } from './ToolExecution';
import { AgentTool } from '../../../services/ai/agent';
import { Wrench } from 'lucide-react';
import React from 'react';
import { useTheme } from '../../../contexts/themeContextUtils';

interface ToolMetadata {
  tools_used: Array<{
    name: string;
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    required_permissions?: string[];
    status?: string;
    result?: string;
    error?: string;
    execution_time?: number;
  }>;
  execution_time?: number;
  agent_type?: string;
  base_agent?: string;
  research_parameters?: {
    topic: string;
    tools_used: string[];
  };
}

interface AIMessageProps {
  message: Message & { metadata?: ToolMetadata };
  themeColor: string;
  isStreaming?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

interface ToolExecutionState {
  tool: AgentTool;
  status: 'pending' | 'success' | 'error';
  result?: string;
  error?: string;
  execution_time?: number;
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
  const { theme } = useTheme();
  const messageSteps = message.executionSteps || executionSteps[message.id] || [];

  // Extract tool executions from metadata
  const toolExecutions: ToolExecutionState[] = React.useMemo(() => {
    if (!message.metadata?.tools_used) return [];

    return message.metadata.tools_used.map((tool: ToolMetadata['tools_used'][0]) => ({
      tool: {
        name: tool.name,
        type: tool.type,
        description: tool.description,
        parameters: tool.parameters,
        required_permissions: tool.required_permissions
      },
      status: (tool.status ?? 'success') as 'pending' | 'success' | 'error',
      result: tool.result,
      error: tool.error,
      execution_time: tool.execution_time
    }));
  }, [message.metadata?.tools_used]);

  const shouldShowThoughtProcess = !isUser &&
    message.model?.category === 'function' &&
    messageSteps.length > 0;

  const shouldShowToolExecutions = !isUser &&
    message.model?.category === 'agent' &&
    toolExecutions.length > 0;

  const shouldShowCopyButton = message.content &&
    typeof message.content === 'string' &&
    message.type !== 'function';

  const content = typeof message.content === 'string' ? message.content : '';
  const hasThoughtProcess = message.model?.isReasoner &&
    content &&
    content.includes('<Thought>') &&
    content.includes('</Thought>');

  const getAssistantBubbleStyle = () => {
    if (theme === 'midnight') {
      return 'bg-gradient-to-br from-gray-900/80 to-gray-900/60 text-gray-100 border-gray-800/30';
    }
    return 'bg-gradient-to-br from-white/70 to-white/40 dark:from-gray-800/70 dark:to-gray-800/40 text-gray-900 dark:text-gray-100';
  };

  const renderToolExecutions = () => {
    if (!shouldShowToolExecutions) return null;

    return (
      <div className="mt-4 space-y-3 max-w-full md:max-w-3xl lg:max-w-4xl">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tool Executions
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({toolExecutions.length})
          </span>
        </div>
        {toolExecutions.map((execution, index) => (
          <ToolExecution
            key={`${execution.tool.name}-${index}`}
            tool={execution.tool}
            status={execution.status}
            result={execution.result}
            error={execution.error}
            themeColor={themeColor}
          />
        ))}
        {message.metadata?.execution_time && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Total execution time: {message.metadata.execution_time.toFixed(2)}s
          </div>
        )}
      </div>
    );
  };

  const renderExecutionStatus = () => {
    if (!message.metadata || isUser) return null;

    const toolsUsed = message.metadata.research_parameters?.tools_used || [];

    return (
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {message.metadata.agent_type && (
          <span className="mr-2">
            Agent: {message.metadata.agent_type} ({message.metadata.base_agent})
          </span>
        )}
        {message.metadata.execution_time && (
          <span className="mr-2">
            Time: {message.metadata.execution_time.toFixed(2)}s
          </span>
        )}
        {toolsUsed.length > 0 && (
          <span>
            Tools: {toolsUsed.join(', ')}
          </span>
        )}
      </div>
    );
  };

  const renderAudioContent = () => (
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

  const renderMessageBubble = () => (
    <div className="relative">
      <div className={`px-4 py-2.5 rounded-2xl
        backdrop-blur-md shadow-lg
        border ${theme === 'midnight' ? 'border-gray-800/30' : 'border-gray-200/30 dark:border-gray-700/30'}
        ${isUser
          ? 'bg-gradient-to-br from-primary-500/70 to-primary-600/70 text-white'
          : getAssistantBubbleStyle()
        }
        ${!isLastInGroup && isUser ? 'rounded-br-md rounded-bl-2xl' : ''}
        ${!isLastInGroup && !isUser ? 'rounded-bl-md rounded-br-2xl' : ''}
        hover:shadow-xl transition-shadow duration-200
        text-sm
        max-w-full md:max-w-3xl lg:max-w-4xl overflow-hidden`}
        style={isUser ? {
          background: `linear-gradient(135deg, ${message.model?.color ?? themeColor}70, ${message.model?.color ?? themeColor}80)`
        } : undefined}
      >
        <div className="overflow-x-auto custom-scrollbar">
          <MessageContent message={message} themeColor={themeColor} isStreaming={isStreaming} />
        </div>
      </div>
      {shouldShowCopyButton && (
        <AnimatePresence>
          <CopyButton content={message.content as string} isUser={isUser} />
        </AnimatePresence>
      )}
    </div>
  );

  const renderContent = () => {
    if (message.type === 'audio' && message.role === 'assistant') {
      return renderAudioContent();
    }

    const thoughtSteps = hasThoughtProcess ? formatThoughtSteps(extractThought(content)) : [];

    return (
      <div className={`group flex items-start gap-4 ${isFirstInGroup ? 'mt-4' : 'mt-2'}`}>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1`}>
          {isFirstInGroup && <MessageHeader message={message} isUser={isUser} />}

          {hasThoughtProcess ? (
            <ThoughtProcessBubble thoughtSteps={thoughtSteps} content={content} />
          ) : renderMessageBubble()}

          {renderToolExecutions()}
          {renderExecutionStatus()}

          {isLastInGroup && (
            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {shouldShowThoughtProcess && (
          <div className="ml-4 flex-1 max-w-full md:max-w-3xl lg:max-w-4xl">
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
  const thoughtRegex = /<Thought>(.*?)<\/Thought>/s;
  const match = thoughtRegex.exec(content ?? '');
  return match ? match[1].trim() : '';
}

function extractOutput(content: string): string {
  const outputRegex = /<Output>(.*?)<\/Output>/s;
  const match = outputRegex.exec(content ?? '');
  return match ? match[1].trim() : '';
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

const ThoughtProcessBubble = React.memo(({ thoughtSteps, content }: { thoughtSteps: string[], content: string }) => {
  const { theme } = useTheme();

  const getThoughtBubbleStyle = () => {
    if (theme === 'midnight') {
      return 'bg-gradient-to-br from-gray-900/80 to-gray-900/60 text-gray-300';
    }
    return 'bg-gradient-to-br from-gray-100/70 to-gray-50/40 dark:from-gray-700/70 dark:to-gray-800/40 text-gray-700 dark:text-gray-300';
  };

  return (
    <div className="space-y-3 w-full max-w-full md:max-w-3xl lg:max-w-4xl">
      {/* Thought Process Bubble */}
      <div className="relative">
        <div className={`px-4 py-2.5 rounded-2xl
          backdrop-blur-md shadow-lg
          ${getThoughtBubbleStyle()}
          ${theme === 'midnight' ? '' : 'border border-gray-200/30 dark:border-gray-700/30'}
          text-sm`}
        >
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-[var(--color-textSecondary)]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span>Reasoning Steps</span>
          </div>
          <div className="space-y-3">
            {thoughtSteps.map((step, index) => (
              <div key={`thought-${index}-${step.slice(0, 20)}`} className="flex gap-3 items-start group">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full 
                  ${theme === 'midnight' ? 'bg-gray-800' : 'bg-gray-100 dark:bg-gray-700'} 
                  flex items-center justify-center text-xs font-medium 
                  text-[var(--color-textSecondary)]
                  ${theme === 'midnight' ? 'group-hover:bg-gray-700' : 'group-hover:bg-gray-200 dark:group-hover:bg-gray-600'} 
                  transition-colors`}>
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
          ${theme === 'midnight' ? '' : 'border border-gray-200/30 dark:border-gray-700/30'}
          text-gray-900 dark:text-gray-100
          text-sm`}
        >
          <div className="prose prose-sm dark:prose-invert">
            {extractOutput(content)}
          </div>
        </div>
      </div>
    </div>
  );
});