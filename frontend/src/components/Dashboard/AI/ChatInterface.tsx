import React, { useState } from 'react';
import { Send, Loader, MessageSquare, Hash, Mic, Sparkles, Zap, Image, Settings2 } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { RecordButton } from '../../shared/RecordButton';

interface ChatInterfaceProps {
  model: AIModel;
  onUserInput: (input: string) => void;
  isLoading: boolean;
  themeColor: string;
  placeholder?: string;
}

export function ChatInterface({
  model,
  onUserInput,
  isLoading,
  themeColor,
  placeholder,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');

  const getModelIcon = () => {
    switch (model.category) {
      case 'embedding':
        return <Hash className="w-4 h-4" style={{ color: model.color }} />;
      case 'audio':
        return <Mic className="w-4 h-4" style={{ color: model.color }} />;
      case 'image':
        return <Image className="w-4 h-4" style={{ color: model.color }} />;
      case 'function':
        return <Settings2 className="w-4 h-4" style={{ color: model.color }} />;
      case 'chat':
        return model.provider === 'anthropic' ? (
          <Sparkles className="w-4 h-4" style={{ color: model.color }} />
        ) : (
          <Zap className="w-4 h-4" style={{ color: model.color }} />
        );
      default:
        return <MessageSquare className="w-4 h-4" style={{ color: model.color }} />;
    }
  };

  const getPlaceholder = () => {
    switch (model.category) {
      case 'embedding':
        return "Enter text to generate embeddings...";
      case 'audio':
        return model.id === 'whisper-1' 
          ? "Select an audio file to transcribe..." 
          : "Enter text to convert to speech...";
      case 'image':
        return "Describe the image you want to generate...";
      case 'function':
        return "Describe what you want to do...";
      default:
        return placeholder || "Message...";
    }
  };

  const getButtonConfig = () => {
    switch (model.category) {
      case 'image':
        return {
          icon: <Image className="w-4 h-4" />,
          text: 'Generate',
          loadingText: 'Generating...'
        };
      case 'function':
        return {
          icon: <Settings2 className="w-4 h-4" />,
          text: 'Execute',
          loadingText: 'Processing...'
        };
      case 'embedding':
        return {
          icon: <Hash className="w-4 h-4" />,
          text: 'Generate',
          loadingText: 'Processing...'
        };
      default:
        return {
          icon: <Send className="w-4 h-4" />,
          text: 'Send',
          loadingText: 'Wait...'
        };
    }
  };

  const buttonConfig = getButtonConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!input.trim() || isLoading) return;

    onUserInput(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleTranscription = (text: string) => {
    setInput(text);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={isLoading}
          className="w-full px-4 py-2.5 pr-24
            bg-white/50 dark:bg-gray-800/50
            border border-gray-200/30 dark:border-gray-700/30
            rounded-lg
            text-gray-900 dark:text-white
            placeholder-gray-500 dark:placeholder-gray-400
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary-500/50
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <RecordButton 
            onTranscription={handleTranscription} 
            disabled={isLoading}
          />
          
          <div className="p-1.5 rounded-md"
            style={{ backgroundColor: `${model.color}10` }}>
            {getModelIcon()}
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-white text-sm font-medium
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: `${themeColor}cc`,
            }}
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>{buttonConfig.loadingText}</span>
              </>
            ) : (
              <>
                {buttonConfig.icon}
                <span>{buttonConfig.text}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}