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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={`Message ${model.name}...`}
        disabled={isLoading}
        className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="flex items-center justify-center w-12 h-12 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{
          backgroundColor: themeColor,
        }}
        aria-label="Send Message"
      >
        {isLoading ? (
          <Loader className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Send className="w-6 h-6 text-white" />
        )}
      </button>
    </form>
  );
}