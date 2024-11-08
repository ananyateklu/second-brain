import React, { useState } from 'react';
import { Send, Loader, Image } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';
import { Message } from '../../../types/message';

interface ImageInterfaceProps {
  model: AIModel;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updatedMessage: Partial<Message>) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function ImageInterface({
  model,
  addMessage,
  updateMessage,
  isLoading,
  setIsLoading,
  setError,
}: ImageInterfaceProps) {
  const { sendMessage } = useAI();
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userPrompt = prompt.trim();
    setPrompt('');

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
      type: 'text',
      timestamp: new Date().toISOString(),
      model,
    };
    addMessage(userMessage);

    const assistantMessageId = (Date.now() + 1).toString();

    // Add placeholder assistant message with isLoading
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      type: 'image',
      timestamp: new Date().toISOString(),
      model,
      isLoading: true,
    };
    addMessage(assistantMessage);

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(userPrompt, model.id);

      // Update the assistant message with the actual image content
      updateMessage(assistantMessageId, {
        content: response.content,
        isLoading: false,
      });
    } catch (error: any) {
      // Update the assistant message to show error
      updateMessage(assistantMessageId, {
        content: 'Failed to generate image',
        type: 'text',
        isLoading: false,
      });
      setError(error.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          disabled={isLoading}
          className="w-full px-4 h-11 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50 
          border border-gray-200/30 dark:border-gray-700/30 rounded-lg 
          focus:ring-2 focus:ring-primary-500 focus:border-transparent 
          transition-all duration-200 
          disabled:opacity-50 disabled:cursor-not-allowed
          text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="flex items-center gap-2 px-6 h-11 backdrop-blur-sm 
        bg-primary-600/90 hover:bg-primary-600 text-white rounded-lg 
        disabled:opacity-50 disabled:cursor-not-allowed 
        transition-all duration-200 shadow-sm hover:shadow-md"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span className="font-medium">Generating...</span>
          </>
        ) : (
          <>
            <Image className="w-4 h-4" />
            <span className="font-medium">Generate</span>
          </>
        )}
      </button>
    </form>
  );
}