import React from 'react';
import { Bot } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
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

export function FunctionCallMessage({ message, themeColor, isStreaming }: FunctionCallMessageProps) {
  const isUser = message.role === 'user';
  const { user } = useAuth();
  const { executionSteps } = useAI();
  const messageSteps = executionSteps[message.id] || [];
  const assistantThemeColor = message.model?.color || '#6B7280';

  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-message-slide-in`}>
      <div className={`flex flex-col max-w-xs mx-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header with user/bot info */}
        <div className={`flex items-center ${isUser ? 'flex-row-reverse' : ''} mb-1`}>
          {isUser ? (
            <>
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-6 h-6 rounded-full ml-2"
                />
              )}
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {user?.name}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {message.model?.name || 'Assistant'}
              </span>
              <Bot
                className="w-6 h-6 ml-2"
                style={{ color: assistantThemeColor }}
              />
            </>
          )}
        </div>

        {/* Message content */}
        <div
          className={`px-4 py-2 rounded-lg backdrop-blur-sm ${
            isUser
              ? `bg-[${themeColor}]/90 text-white`
              : 'bg-white/50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200'
          } ${isUser ? 'rounded-br-none' : 'rounded-bl-none'} border border-gray-200/30 dark:border-gray-700/30`}
          style={{ backgroundColor: isUser ? `${themeColor}90` : undefined }}
        >
          <p className="whitespace-pre-wrap break-all animate-fade-in">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Thought Process */}
      {!isUser && (messageSteps.length > 0 || message.isLoading) && (
        <div className="ml-4 flex-1 max-w-xl">
          <ThoughtProcess
            steps={messageSteps}
            isComplete={!message.isLoading}
            themeColor={themeColor}
          />
        </div>
      )}
    </div>
  );
} 