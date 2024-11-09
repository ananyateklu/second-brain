import React, { useEffect } from 'react';
import { AIMessage } from './AIMessage';
import { AIModel, ExecutionStep } from '../../../types/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  themeColor: string;
}

export function MessageList({
  messages,
  isLoading,
  messagesEndRef,
  themeColor,
}: MessageListProps) {
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="p-4 overflow-y-auto h-full custom-scrollbar">
      {messages.map((message) => (
        <AIMessage 
          key={message.id}
          message={message}
          themeColor={themeColor}
          isStreaming={message.isLoading}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}