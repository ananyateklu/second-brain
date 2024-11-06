import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { AIService } from '../services/ai';
import { AIModel, AIResponse } from '../types/ai';
import { LlamaService } from '../services/ai/llama';

interface AIContextType {
  isOpenAIConfigured: boolean;
  isAnthropicConfigured: boolean;
  isGeminiConfigured: boolean;
  isLlamaConfigured: boolean;
  isGrokConfigured: boolean;
  error: string | null;
  sendMessage: (input: string | File, modelId: string) => Promise<AIResponse>;
  configureOpenAI: (apiKey: string) => Promise<void>;
  configureGemini: (apiKey: string) => Promise<void>;
  availableModels: AIModel[];
}

const AIContext = createContext<AIContextType | null>(null);

const aiService = new AIService();

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [isOpenAIConfigured, setIsOpenAIConfigured] = useState<boolean>(aiService.isOpenAIConfigured());
  const [isAnthropicConfigured, setIsAnthropicConfigured] = useState<boolean>(aiService.isAnthropicConfigured());
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(aiService.isGeminiConfigured());
  const [isLlamaConfigured, setIsLlamaConfigured] = useState<boolean>(aiService.llama.isConfigured());
  const [isGrokConfigured, setIsGrokConfigured] = useState<boolean>(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>(aiService.getAvailableModels());


  // Initialize Anthropic configuration status
  useEffect(() => {
    const checkAnthropicConfig = async () => {
      const isConfigured = await aiService.isAnthropicConfigured();
      setIsAnthropicConfigured(isConfigured);
    };
    checkAnthropicConfig();
  }, []);

  // Initialize Gemini configuration status
  useEffect(() => {
    const checkGeminiConfig = async () => {
      const isConfigured = aiService.isGeminiConfigured();
      setIsGeminiConfigured(isConfigured);
    };
    checkGeminiConfig();
  }, []);

  // Initialize Llama configuration status
  useEffect(() => {
    const checkLlamaConfig = async () => {
      const isConfigured = aiService.llama.isConfigured();
      setIsLlamaConfigured(isConfigured);
    };
    checkLlamaConfig();
  }, []);

  // Initialize Grok configuration status
  useEffect(() => {
    const checkGrokConfig = async () => {
      const isConfigured = await aiService.grokService.checkConfiguration();
      setIsGrokConfigured(isConfigured);
    };
    checkGrokConfig();
  }, []);

  // Update available models whenever configuration changes
  useEffect(() => {
    setAvailableModels(aiService.getAvailableModels());
  }, [isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isLlamaConfigured, isGrokConfigured]);

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

  const configureGemini = useCallback(async (apiKey: string) => {
    try {
      setError(null);
      const success = await aiService.setGeminiKey(apiKey);
      if (success) {
        setIsGeminiConfigured(true);
      } else {
        throw new Error('Failed to configure Gemini');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to configure Gemini';
      console.error('Failed to configure Gemini:', errorMessage);
      setError(errorMessage);
      setIsGeminiConfigured(false);
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

  const value = useMemo(() => ({
    isOpenAIConfigured,
    isAnthropicConfigured,
    isGeminiConfigured,
    isLlamaConfigured,
    isGrokConfigured,
    error,
    sendMessage,
    configureOpenAI,
    configureGemini,
    availableModels
  }), [isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isLlamaConfigured, isGrokConfigured, error, sendMessage, configureOpenAI, configureGemini, availableModels]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}