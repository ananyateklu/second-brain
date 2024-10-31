import React, { useState } from 'react';
import { Send, Loader } from 'lucide-react';
import { AIModel } from '../../../types/ai';

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
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      {/* Input Field */}
      <div className="flex-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${model.name}...`}
          disabled={isLoading}
          className="w-full px-4 h-9 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
      </div>

      {/* Send Button */}
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        style={{ backgroundColor: themeColor }}
        className="flex items-center justify-center gap-2 w-24 h-9 px-3 rounded-lg hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="Send Message"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Wait</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Send</span>
          </>
        )}
      </button>
    </form>
  );
}