import React, { useEffect } from 'react';
import { AIMessage } from './AIMessage';
import { AIModel } from '../../../types/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  model?: AIModel;
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
        <AIMessage key={message.id} message={message} themeColor={themeColor} />
      ))}
      {isLoading && (
        <div className="mb-4 text-center text-gray-500 dark:text-gray-400">
          The assistant is typing...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}