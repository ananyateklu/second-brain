import React, { useState, useEffect } from 'react';
import { Bot, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { AIModel } from '../../../types/ai';
import { TypewriterEffect } from './TypewriterEffect';
import { ImageGenerationLoading } from './ImageGenerationLoading';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio' | 'embedding';
  timestamp: string;
  model?: AIModel;
}

interface AIMessageProps {
  message: Message;
  themeColor: string;
  isStreaming?: boolean;
}

export function AIMessage({ message, themeColor, isStreaming }: AIMessageProps) {
  const isUser = message.role === 'user';
  const { user } = useAuth();

  const assistantThemeColor = message.model?.color || '#6B7280'; // Default to gray if no color

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (message.type === 'image' && message.isLoading) {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 99) {
            clearInterval(interval);
            return 99;
          }
          return prevProgress + Math.random() * 5; // Increment progress
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(100); // When not loading, progress is complete
    }
  }, [message.isLoading, message.type]);

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        if (message.isLoading) {
          return <ImageGenerationLoading progress={progress} />;
        } else {
          return (
            <img
              src={message.content}
              alt="AI Generated"
              className="max-w-lg rounded-lg shadow-lg animate-fade-in"
              loading="lazy"
            />
          );
        }
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
        return isUser || !isStreaming ? (
          <p className="whitespace-pre-wrap break-all animate-fade-in">{message.content}</p>
        ) : (
          <TypewriterEffect text={message.content} />
        );
    }
  };

  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-message-slide-in`}>
      <div
        className={`flex flex-col max-w-xs mx-2 ${isUser ? 'items-end' : 'items-start'
          }`}
      >
        <div
          className={`flex items-center ${isUser ? 'flex-row-reverse' : ''
            } mb-1`}
        >
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
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}