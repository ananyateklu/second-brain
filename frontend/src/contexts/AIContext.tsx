import React, { createContext, useContext, useState, useCallback } from 'react';
import { AIService } from '../services/ai';
import { AIModel, AIResponse } from '../types/ai';

interface AIContextType {
  isOpenAIConfigured: boolean;
  error: string | null;
  sendMessage: (input: string | File, modelId: string) => Promise<AIResponse>;
  configureOpenAI: (apiKey: string) => Promise<void>;
  availableModels: AIModel[];
}

const AIContext = createContext<AIContextType | null>(null);

const aiService = new AIService();

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [isOpenAIConfigured, setIsOpenAIConfigured] = useState<boolean>(aiService.isOpenAIConfigured());

  const configureOpenAI = useCallback(async (apiKey: string) => {
    try {
      setError(null);
      const success = await aiService.setOpenAIKey(apiKey);
      if (success) {
        setIsOpenAIConfigured(true);
      } else {
        throw new Error('Failed to configure OpenAI');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to configure OpenAI';
      console.error('Failed to configure OpenAI:', errorMessage);
      setError(errorMessage);
      setIsOpenAIConfigured(false);
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (input: string | File, modelId: string): Promise<AIResponse> => {
    try {
      setError(null);
      const model = aiService.getAvailableModels().find(m => m.id === modelId);
      
      if (!model) {
        throw new Error(`Model ${modelId} not found or not supported`);
      }

      if (!model.isConfigured) {
        throw new Error(`${model.provider.toUpperCase()} is not configured. Please add your API key in settings.`);
      }

      // Handle different types of inputs based on model
      if (model.id === 'whisper-1') {
        if (!(input instanceof File)) {
          throw new Error('Audio transcription requires an audio file');
        }
        return await aiService.transcribeAudio(input);
      }
      
      if (model.id === 'tts-1') {
        if (typeof input !== 'string') {
          throw new Error('Text-to-speech requires text input');
        }
        return await aiService.textToSpeech(input);
      }
      
      if (typeof input !== 'string') {
        throw new Error('Invalid input type for selected model');
      }

      return await aiService.sendMessage(input, modelId);
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred';
      console.error('Failed to send message:', {
        error: errorMessage,
        modelId,
        inputType: input instanceof File ? 'File' : typeof input
      });
      setError(errorMessage);
      throw error;
    }
  }, []);

  const value = {
    isOpenAIConfigured,
    error,
    sendMessage,
    configureOpenAI,
    availableModels: aiService.getAvailableModels()
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}