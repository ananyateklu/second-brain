import React from 'react';
import { Bot } from 'lucide-react';
import { AIModel } from '../../../types/ai';

interface EmptyStateProps {
  selectedModel: AIModel | null;
  themeColor: string;
}

export function EmptyState({ selectedModel, themeColor }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative">
        {/* Pulse Effect */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ 
            backgroundColor: `${selectedModel?.color || themeColor}10`,
          }} 
        />
        
        {/* Icon */}
        <div 
          className="relative p-6 rounded-full animate-float"
          style={{ 
            backgroundColor: `${selectedModel?.color || themeColor}20`,
          }}
        >
          <Bot 
            className="w-12 h-12" 
            style={{ 
              color: selectedModel?.color || themeColor 
            }} 
          />
        </div>
      </div>

      {/* Text */}
      <div className="mt-6 text-center space-y-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {selectedModel ? (
            <>Start chatting with {selectedModel.name}</>
          ) : (
            <>Select a model to begin</>
          )}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {selectedModel ? (
            <>Type your message below to start the conversation</>
          ) : (
            <>Choose an AI model from above to start your conversation</>
          )}
        </p>
      </div>
    </div>
  );
} 