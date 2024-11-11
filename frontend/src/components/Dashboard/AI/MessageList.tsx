import React, { useMemo } from 'react';
import { AIMessage } from './AIMessage';
import { EmptyState } from './EmptyState';
import { AIModel, ExecutionStep } from '../../../types/ai';

// Define a complete Message interface here
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | Blob;
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code' | 'function';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
  language?: string;
  transcription?: string;
  progress?: number;
}

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
  // Group messages by date and consecutive sender
  const groupedMessages = useMemo(() => {
    const groups: Message[][] = [];
    let currentGroup: Message[] = [];
    let currentGroupId = '';
    
    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1];
      
      if (
        !prevMessage ||
        prevMessage.role !== message.role ||
        new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() > 5 * 60 * 1000 ||
        new Date(message.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString()
      ) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroupId = `group-${message.id}`;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, [messages]);

  return (
    <div className="h-full relative">
      {messages.length === 0 ? (
        <EmptyState 
          selectedModel={selectedModel} 
          themeColor={themeColor} 
        />
      ) : (
        <div className="h-full overflow-y-auto overflow-x-hidden px-2 py-2 space-y-4">
          {groupedMessages.map((group, groupIndex) => {
            const date = new Date(group[0].timestamp);
            const showDateDivider = groupIndex === 0 || 
              new Date(groupedMessages[groupIndex - 1][0].timestamp).toDateString() !== date.toDateString();
            const groupKey = `group-${group[0].id}-${groupIndex}`;

            return (
              <div key={groupKey} className="space-y-1 max-w-full">
                {showDateDivider && (
                  <div className="flex items-center justify-center my-1">
                    <div className="px-3 py-0.5 rounded-full text-xs font-medium 
                      bg-gray-100/50 dark:bg-gray-800/50 
                      text-gray-500 dark:text-gray-400
                      backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30">
                      {formatDate(date)}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {group.map((message, index) => (
                    <AIMessage
                      key={`${message.id}-${index}`}
                      message={message}
                      themeColor={themeColor}
                      isStreaming={isLoading && message.role === 'assistant'}
                      isFirstInGroup={index === 0}
                      isLastInGroup={index === group.length - 1}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  }
}