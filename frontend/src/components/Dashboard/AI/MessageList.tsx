import React from 'react';
import { AIMessage } from './AIMessage';
import { EmptyState } from './EmptyState';
import { Message } from '../../../types/message';
import { AIModel } from '../../../types/ai';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  themeColor: string;
  selectedModel: AIModel | null;
}

export function MessageList({
  messages,
  isLoading,
  messagesEndRef,
  themeColor,
  selectedModel,
}: MessageListProps) {
  return (
    <div className="h-full relative">
      {messages.length === 0 ? (
        <EmptyState 
          selectedModel={selectedModel} 
          themeColor={themeColor} 
        />
      ) : (
        <div className="h-full overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <AIMessage
              key={message.id}
              message={message}
              themeColor={themeColor}
              isStreaming={isLoading && message.role === 'assistant'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}