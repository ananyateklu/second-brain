import React, { useState } from 'react';
import { Send, Loader, Hash } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';

interface EmbeddingInterfaceProps {
  model: AIModel;
  onMessageSend: (message: { role: 'user' | 'assistant'; content: string; type: 'text' | 'image' | 'audio' }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function EmbeddingInterface({
  model,
  onMessageSend,
  isLoading,
  setIsLoading,
  setError
}: EmbeddingInterfaceProps) {
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
      
      // Add AI response with embeddings
      onMessageSend({
        role: 'assistant',
        content: JSON.stringify(response.content, null, 2),
        type: 'text'
      });
    } catch (error: any) {
      setError(error.message || 'Failed to generate embeddings');
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
        placeholder="Enter text to generate embeddings..."
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
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Hash className="w-4 h-4" />
            <span>Generate</span>
          </>
        )}
      </button>
    </form>
  );
}