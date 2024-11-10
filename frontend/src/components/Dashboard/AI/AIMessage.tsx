import React, { useState, useEffect } from 'react';
import { Bot, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { AIModel, ExecutionStep } from '../../../types/ai';
import { TypewriterEffect } from './TypewriterEffect';
import { ImageGenerationLoading } from './ImageGenerationLoading';
import { ThoughtProcess } from './ThoughtProcess';
import { useAI } from '../../../contexts/AIContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio' | 'embedding';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
}

interface AIMessageProps {
  message: Message;
  themeColor: string;
  isStreaming?: boolean;
}

export function AIMessage({ message, themeColor, isStreaming }: AIMessageProps) {
  const isUser = message.role === 'user';
  const { user } = useAuth();
  const assistantThemeColor = message.model?.color || '#6B7280';
  const [progress, setProgress] = useState(0);
  const { executionSteps } = useAI();
  const messageSteps = executionSteps[message.id] || [];

  // Show thought process only for function category and when steps exist
  const shouldShowThoughtProcess = !isUser &&
    message.model?.category === 'function' &&
    messageSteps.length > 0;

  // Image generation progress effect
  useEffect(() => {
    if (message.type === 'image' && message.isLoading) {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 99) {
            clearInterval(interval);
            return 99;
          }
          return prevProgress + Math.random() * 5;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [message.isLoading, message.type]);

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        if (message.isLoading) {
          return <ImageGenerationLoading progress={progress} />;
        }
        return (
          <img
            src={message.content}
            alt="AI Generated"
            className="max-w-lg rounded-lg shadow-lg animate-fade-in"
            loading="lazy"
          />
        );
      case 'audio':
        return (
          <audio controls className="max-w-md animate-fade-in">
            <source src={message.content} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        );
      case 'embedding':
        return (
          <pre className="whitespace-pre-wrap break-all animate-fade-in text-sm">
            {message.content}
          </pre>
        );
      default:
        if (message.model?.category === 'function' && messageSteps.length > 0) {
          return (
            <p className="whitespace-pre-wrap break-all animate-fade-in">
              {message.isLoading ? 'Processing...' : 'Operation completed'}
            </p>
          );
        }
        return isUser || !isStreaming ? (
          <p className="whitespace-pre-wrap break-all animate-fade-in">
            {message.content || 'Thinking...'}
          </p>
        ) : (
          <TypewriterEffect text={message.content || 'Thinking...'} />
        );
    }
  };

  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-message-slide-in`}>
      <div className={`flex flex-col max-w-xs mx-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* User/Bot Header */}
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
            {!shouldShowThoughtProcess && (
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
            </>
          )}
        </div>

        {!shouldShowThoughtProcess && (
          <>
            {/* Message Content */}
            <div
              className={`px-4 py-2 rounded-lg backdrop-blur-sm ${
                isUser
                  ? `bg-[${themeColor}]/90 text-white`
                  : 'bg-white/50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200'
              } ${isUser ? 'rounded-br-none' : 'rounded-bl-none'} border border-gray-200/30 dark:border-gray-700/30`}
              style={{ backgroundColor: isUser ? `${themeColor}90` : undefined }}
            >
              {renderContent()}
            </div>

            {/* Timestamp */}
            <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </>
        )}
      </div>

      {/* Show thought process only for function-calling messages */}
      {shouldShowThoughtProcess && (
        <div className="ml-4 flex-1 max-w-2xl">
          <div className="flex items-center mb-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {message.model?.name || 'Assistant'}
            </span>
            <Bot
              className="w-6 h-6 ml-2"
              style={{ color: assistantThemeColor }}
            />
          </div>
          <ThoughtProcess
            steps={messageSteps}
            isComplete={!isStreaming}
            themeColor={themeColor}
          />
        </div>
      )}
    </div>
  );
}