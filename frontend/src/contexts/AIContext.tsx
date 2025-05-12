import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { AIModel, AIResponse, ExecutionStep } from '../types/ai';
import { Message } from '../types/message';
import { OllamaService } from '../services/ai/ollama';
import { signalRService } from '../services/signalR';
import { agentService } from '../services/ai/agent';
import { modelService } from '../services/ai/modelService';
import { messageService } from '../services/ai/messageService';

interface AIContextType {
  isOpenAIConfigured: boolean;
  isAnthropicConfigured: boolean;
  isGeminiConfigured: boolean;
  isOllamaConfigured: boolean;
  isGrokConfigured: boolean;
  error: string | null;
  sendMessage: (
    input: string,
    modelId: string,
    options?: {
      onStreamUpdate?: (
        content: string,
        stats?: {
          tokenCount: number,
          tokensPerSecond: string,
          elapsedSeconds: number
        }
      ) => void;
    }
  ) => Promise<AIResponse>;
  configureGemini: () => Promise<void>;
  availableModels: AIModel[];
  ollamaService: OllamaService;
  executionSteps: Record<string, ExecutionStep[]>;
  handleExecutionStep: (step: ExecutionStep) => void;
  transcribeAudio: (audioFile: File) => Promise<AIResponse>;
  checkConfigurations: (forceRefresh?: boolean) => Promise<void>;
  refreshModels: () => Promise<void>;
  isLoadingModels: boolean;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [isOpenAIConfigured, setIsOpenAIConfigured] = useState<boolean>(false);
  const [isAnthropicConfigured, setIsAnthropicConfigured] = useState<boolean>(false);
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(false);
  const [isOllamaConfigured, setIsOllamaConfigured] = useState<boolean>(false);
  const [isGrokConfigured, setIsGrokConfigured] = useState<boolean>(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [executionSteps, setExecutionSteps] = useState<Record<string, ExecutionStep[]>>({});
  const latestMessageIdRef = useRef<string | null>(null);
  const initialCheckDoneRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  // Function to fetch available models
  const refreshModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      // Use the new async method to get models
      const models = await modelService.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Error fetching models:', error);
      // If we have no models, populate with static models as fallback
      if (availableModels.length === 0) {
        setAvailableModels(modelService.getAllModels());
      }
    } finally {
      setIsLoadingModels(false);
    }
  }, [availableModels.length]);

  // Add new function to check configurations
  const checkConfigurations = useCallback(async (forceRefresh = false) => {
    if (isCheckingRef.current) return; // Prevent concurrent checks

    try {
      isCheckingRef.current = true;

      const configs = await agentService.getProviderConfigurations(forceRefresh);

      setIsOpenAIConfigured(configs.openai);
      setIsAnthropicConfigured(configs.anthropic);
      setIsGrokConfigured(configs.grok);
      setIsGeminiConfigured(configs.gemini);
      setIsOllamaConfigured(configs.ollama);

      // After checking configurations, refresh the models list
      await refreshModels();
    } catch (error) {
      console.error('❌ Error checking configurations:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    } finally {
      isCheckingRef.current = false;
      console.groupEnd();
    }
  }, [refreshModels]); // Add refreshModels to dependencies

  // Use layout effect for initialization
  useLayoutEffect(() => {
    if (!initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      checkConfigurations();
    }
  }, [checkConfigurations]);

  useEffect(() => {
    // Initialize SignalR connection
    const initializeSignalR = async () => {
      try {
        await signalRService.stop(); // Ensure we're starting from a clean state
        await signalRService.start();
      } catch (error) {
        console.error('[AIContext] Failed to initialize SignalR:', error);
      }
    };

    initializeSignalR();

    // Subscribe to execution steps
    const unsubscribe = signalRService.onExecutionStep((step) => {

      // Get message ID from metadata
      const messageId = step.metadata?.messageId;
      if (!messageId) {
        console.warn('[AIContext] Step received without messageId:', step);
        return;
      }

      setExecutionSteps(prev => {
        const currentSteps = [...(prev[messageId as keyof typeof prev] || []), step];
        return {
          ...prev,
          [messageId as string]: currentSteps
        };
      });
    });

    return () => {
      unsubscribe();
      signalRService.stop();
    };
  }, []);

  const configureGemini = useCallback(async () => {
    try {
      setError(null);
      const success = await agentService.isGeminiConfigured(true);
      if (success) {
        setIsGeminiConfigured(true);
      } else {
        throw new Error('Failed to configure Gemini');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to configure Gemini';
      console.error('Failed to configure Gemini:', errorMessage);
      setError(errorMessage);
      setIsGeminiConfigured(false);
      throw error;
    }
  }, []);

  const transcribeAudio = useCallback(async (audioFile: File): Promise<AIResponse> => {
    try {
      return await agentService.transcribeAudio(audioFile);
    } catch (error) {
      console.error('Error in transcribeAudio:', error);
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (
    input: string,
    modelId: string,
    options?: {
      onStreamUpdate?: (
        content: string,
        stats?: {
          tokenCount: number,
          tokensPerSecond: string,
          elapsedSeconds: number
        }
      ) => void;
    }
  ): Promise<AIResponse> => {
    try {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      if (model.category === 'agent') {
        return await agentService.sendMessage(input, modelId);
      }

      // Special handling for streaming
      if (model.provider === 'ollama' && options?.onStreamUpdate) {
        return await agentService.ollama.sendMessage(input, modelId, options);
      }

      return await messageService.sendMessage(input, model);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [availableModels]);

  // Track the latest assistant message ID
  useEffect(() => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      latestMessageIdRef.current = lastAssistantMessage.id;
    }
  }, [messages]);

  const handleExecutionStep = useCallback((step: ExecutionStep) => {
    const messageId = latestMessageIdRef.current;
    if (!messageId) {
      return;
    }

    setExecutionSteps(prev => {
      const currentSteps = [...(prev[messageId] || []), step];

      return {
        ...prev,
        [messageId]: currentSteps
      };
    });

    // Update message with new step and streaming state
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === messageId);
      if (index === -1) return prev;

      const updatedMessage = {
        ...prev[index],
        executionSteps: [...(prev[index].executionSteps || []), step],
        isStreaming: step.type !== 4  // 4 is Result in ExecutionStepType
      };

      return [
        ...prev.slice(0, index),
        updatedMessage,
        ...prev.slice(index + 1)
      ];
    });
  }, []);

  const value = useMemo(() => ({
    isOpenAIConfigured,
    isAnthropicConfigured,
    isGeminiConfigured,
    isOllamaConfigured,
    isGrokConfigured,
    error,
    sendMessage,
    configureGemini,
    availableModels,
    ollamaService: agentService.ollama,
    executionSteps,
    handleExecutionStep,
    transcribeAudio,
    checkConfigurations,
    refreshModels,
    isLoadingModels
  }), [isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isOllamaConfigured, isGrokConfigured, error, sendMessage, configureGemini, availableModels, executionSteps, handleExecutionStep, transcribeAudio, checkConfigurations, refreshModels, isLoadingModels]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}