import { Bot } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { AIModel, ExecutionStep } from '../../../types/ai';
import { ThoughtProcess } from './ThoughtProcess';
import { useAI } from '../../../contexts/AIContext';

interface FunctionCallMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type: 'text';
    timestamp: string;
    model?: AIModel;
    isLoading?: boolean;
    executionSteps?: ExecutionStep[];
  };
  themeColor: string;
  isStreaming?: boolean;
}

export function FunctionCallMessage({ message, themeColor }: FunctionCallMessageProps) {
  const isUser = message.role === 'user';
  const { user } = useAuth();
  const { executionSteps } = useAI();
  const messageSteps = executionSteps[message.id] || [];
  const assistantThemeColor = message.model?.color || '#6B7280';

  return (
    <div className="flex items-start gap-4 mb-4 animate-message-slide-in">
      {/* Message Container */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full md:max-w-xl lg:max-w-2xl`}>
        {/* Header with user/bot info */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          {isUser ? (
            <>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.name}
              </span>
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border border-gray-200/50 dark:border-gray-700/50"
                />
              )}
            </>
          ) : (
            <>
              <Bot
                className="w-6 h-6"
                style={{ color: assistantThemeColor }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {message.model?.name || 'Assistant'}
              </span>
            </>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl
            backdrop-blur-md shadow-sm hover:shadow-md
            transition-all duration-200
            ${isUser
              ? 'bg-gradient-to-br from-primary-500/80 to-primary-600/80 text-white'
              : 'bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100'
            }
            ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}
            border border-gray-200/30 dark:border-gray-700/30
          `}
          style={isUser ? {
            background: `linear-gradient(135deg, ${themeColor}80, ${themeColor}90)`
          } : undefined}
        >
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Thought Process Section */}
      {!isUser && (messageSteps.length > 0 || message.isLoading) && (
        <div className="flex-1 max-w-full md:max-w-2xl lg:max-w-3xl">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30 shadow-sm">
            <ThoughtProcess
              steps={messageSteps}
              isComplete={!message.isLoading}
              themeColor={themeColor}
            />
          </div>
        </div>
      )}
    </div>
  );
} 