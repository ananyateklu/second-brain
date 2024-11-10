import React, { useState } from 'react';
import { Send, Loader, MessageSquare } from 'lucide-react';
import { AIModel } from '../../../types/ai';
import { textStyles } from '../../../utils/textUtils';
import { Input } from '../../shared/Input';

interface ChatInterfaceProps {
  model: AIModel;
  onUserInput: (input: string) => void;
  isLoading: boolean;
  themeColor: string;
}

export function ChatInterface({
  model,
  onUserInput,
  isLoading,
  themeColor,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onUserInput(input.trim());
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={`Message ${model.name}...`}
        disabled={isLoading}
        icon={MessageSquare}
        label="" // Empty label to hide it but maintain spacing
      />
      
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className={`absolute right-2 top-1/2 -translate-y-1/2 
          px-3 py-1.5 rounded-lg
          text-white backdrop-blur-xl
          transition-all duration-200 flex items-center gap-2
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:shadow-md active:scale-95
          border border-white/30`}
        style={{ 
          backgroundColor: `${themeColor}cc`,
        }}
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span className={textStyles.button}>Wait</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span className={textStyles.button}>Send</span>
          </>
        )}
      </button>
    </form>
  );
}