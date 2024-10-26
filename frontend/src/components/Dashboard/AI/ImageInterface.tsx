import React, { useState } from 'react';
import { Send, Loader, Image } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';

interface ImageInterfaceProps {
  model: AIModel;
  onMessageSend: (message: { role: 'user' | 'assistant'; content: string; type: 'text' | 'image' | 'audio' }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function ImageInterface({
  model,
  onMessageSend,
  isLoading,
  setIsLoading,
  setError
}: ImageInterfaceProps) {
  const { sendMessage } = useAI();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userPrompt = prompt.trim();
    setPrompt('');
    
    // Add user message
    onMessageSend({
      role: 'user',
      content: userPrompt,
      type: 'text'
    });

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(userPrompt, model.id);
      
      // Add AI response with generated image
      onMessageSend({
        role: 'assistant',
        content: response.content,
        type: 'image'
      });
    } catch (error: any) {
      setError(error.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        disabled={isLoading}
        className="flex-1 px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Image className="w-4 h-4" />
            <span>Generate</span>
          </>
        )}
      </button>
    </form>
  );
}