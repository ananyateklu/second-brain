import React, { useState } from 'react';
import { Send, Loader } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';

interface DefaultInterfaceProps {
  model: AIModel;
  onMessageSend: (message: { 
    role: 'user' | 'assistant'; 
    content: string; 
    type: 'text' | 'image' | 'audio' | 'embedding' 
  }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function DefaultInterface({
  model,
  onMessageSend,
  isLoading,
  setIsLoading,
  setError
}: DefaultInterfaceProps) {
  const { sendMessage } = useAI();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    
    // Add user message
    onMessageSend({
      role: 'user',
      content: userInput,
      type: 'text'
    });

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(userInput, model.id);
      
      // Add AI response
      onMessageSend({
        role: 'assistant',
        content: response.content,
        type: response.type
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={`Message ${model.name}...`}
        disabled={isLoading}
        className="flex-1 px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Sending...</span>
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