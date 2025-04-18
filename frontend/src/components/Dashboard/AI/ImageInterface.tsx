import React, { useState } from 'react';
import { Loader, Image, Wand2 } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';
import { Message } from '../../../types/message';
import { RecordButton } from '../../shared/RecordButton';
import { promptEnhancementService } from '../../../services/ai/promptEnhancementService';

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
  const [isEnhancing, setIsEnhancing] = useState(false);

  const getErrorMessage = (error: unknown) => {
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error && 'message' in error) return error.message;
    return 'Failed to generate image';
  };

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
    let progress = 0;
    let progressSpeed = 2; // Start slow

    // Add placeholder assistant message with the inputText
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      type: 'image',
      timestamp: new Date().toISOString(),
      model,
      isLoading: true,
      progress: 0,
      inputText: userPrompt,
    };
    addMessage(assistantMessage);

    setIsLoading(true);
    setError(null);

    // Start progress updates with dynamic speed
    const progressInterval = setInterval(() => {
      if (progress < 30) progressSpeed = 2;
      else if (progress < 60) progressSpeed = 1;
      else if (progress < 85) progressSpeed = 0.5;
      else progressSpeed = 0.2;

      progress = Math.min(progress + progressSpeed, 95);
      updateMessage(assistantMessageId, {
        progress: progress,
      });
    }, 1000);

    try {
      const response = await sendMessage(userPrompt, model.id);
      
      // Set to 99% while image loads
      updateMessage(assistantMessageId, {
        progress: 99,
      });

      // Update with final image
      updateMessage(assistantMessageId, {
        content: response.content,
        isLoading: false,
        progress: 100,
        metadata: response.metadata
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      updateMessage(assistantMessageId, {
        content: 'Failed to generate image',
        type: 'text',
        isLoading: false,
      });
      setError(errorMessage as string);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleTranscription = (text: string) => {
    setPrompt(text);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const enhanced = await promptEnhancementService.enhancePrompt(prompt, 'This is for image generation. Make it more descriptive and visual.');
      setPrompt(enhanced);
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          disabled={isLoading}
          className="w-full px-4 py-2.5 pr-40
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
          {/* Enhance Button */}
          {prompt.trim() && (
            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || isLoading}
              className={`p-2 rounded-full transition-all duration-200
                hover:bg-gray-100 dark:hover:bg-gray-700 
                text-gray-600 dark:text-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Record Button */}
          <RecordButton 
            onTranscription={handleTranscription}
            className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50"
          />

          {/* Model Icon */}
          <div className="p-1.5 rounded-md"
            style={{ backgroundColor: `${model.color}10` }}>
            <Image className="w-4 h-4" style={{ color: model.color }} />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md
              text-white text-sm font-medium
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: `${model.color}cc`,
            }}
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
        </div>
      </div>
    </form>
  );
}