import React from 'react';
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

    return (
      <div className={`group flex items-start gap-4 ${isFirstInGroup ? 'mt-4' : 'mt-2'}`}>
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1`}>
          {isFirstInGroup && <MessageHeader message={message} isUser={isUser} />}
          
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
                background: `linear-gradient(135deg, ${message.model?.color || themeColor}70, ${message.model?.color || themeColor}80)`
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