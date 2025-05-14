import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { AIModel, AIResponse, ExecutionStep } from '../types/ai';
import { Message } from '../types/message';
import { OllamaService } from '../services/ai/ollama';
import { signalRService } from '../services/signalR';
import { agentService, AgentRequestParameters } from '../services/ai/agent';
import { modelService } from '../services/ai/modelService';
import { messageService } from '../services/ai/messageService';
import api from '../services/api/api';
import aiSettingsService from '../services/api/aiSettings.service';

interface AIContextType {
  // Agent statuses (unchanged)
  isOpenAIConfigured: boolean;
  isAnthropicConfigured: boolean;
  isGeminiConfigured: boolean;
  isOllamaConfigured: boolean;
  isGrokConfigured: boolean;

  // Chat statuses
  isChatOpenAIConfigured: boolean;
  isChatAnthropicConfigured: boolean;
  isChatGeminiConfigured: boolean;
  isChatOllamaConfigured: boolean;
  isChatGrokConfigured: boolean;

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
    } & AgentRequestParameters
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
  isLoadingConfigurations: boolean;
  refreshConfiguration: () => Promise<void>;
  settingsVersion: number;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  // Agent configuration states
  const [isOpenAIConfigured, setIsOpenAIConfigured] = useState<boolean>(false);
  const [isAnthropicConfigured, setIsAnthropicConfigured] = useState<boolean>(false);
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(false);
  const [isOllamaConfigured, setIsOllamaConfigured] = useState<boolean>(false);
  const [isGrokConfigured, setIsGrokConfigured] = useState<boolean>(false);

  // Chat configuration states
  const [isChatOpenAIConfigured, setIsChatOpenAIConfigured] = useState<boolean>(false);
  const [isChatAnthropicConfigured, setIsChatAnthropicConfigured] = useState<boolean>(false);
  const [isChatGeminiConfigured, setIsChatGeminiConfigured] = useState<boolean>(false);
  const [isChatOllamaConfigured, setIsChatOllamaConfigured] = useState<boolean>(false);
  const [isChatGrokConfigured, setIsChatGrokConfigured] = useState<boolean>(false);

  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [executionSteps, setExecutionSteps] = useState<Record<string, ExecutionStep[]>>({});
  const latestMessageIdRef = useRef<string | null>(null);
  const initialCheckDoneRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  // Add settings version counter that components can watch 
  // to know when settings have changed
  const [settingsVersion, setSettingsVersion] = useState<number>(0);

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

  // Function to check individual chat provider configurations
  const checkChatProviderConfigurations = useCallback(async () => {
    const checkGenericEndpoint = async (endpoint: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      try {
        console.log(`Checking endpoint: ${endpoint}`);
        const response = await api.get(endpoint);
        console.log('Response from endpoint:', endpoint, response.data);

        // Try to extract configuration status from various response formats
        let isConfigured = false;

        if (response.data && typeof response.data === 'object') {
          // Try standard property names
          if ('isConnected' in response.data) isConfigured = !!response.data.isConnected;
          else if ('isConfigured' in response.data) isConfigured = !!response.data.isConfigured;
          else if ('connected' in response.data) isConfigured = !!response.data.connected;
          else if ('configured' in response.data) isConfigured = !!response.data.configured;
          else if ('success' in response.data) isConfigured = !!response.data.success;
          // More flexible check - look for any Boolean property that indicates status
          else {
            for (const key in response.data) {
              if (typeof response.data[key] === 'boolean' && response.data[key] === true) {
                console.log(`Found boolean true value in property "${key}"`);
                isConfigured = true;
                break;
              }
            }
          }
        } else if (typeof response.data === 'boolean') {
          // Direct boolean response
          isConfigured = response.data;
        } else if (response.status === 200) {
          // Fallback - if we got a 200 OK, consider it configured
          isConfigured = true;
        }

        console.log(`Status for ${endpoint}: ${isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
        setter(isConfigured);
        return isConfigured;
      } catch (error) {
        console.warn(`Error checking endpoint:`, endpoint, error);
        setter(false);
        return false;
      }
    };

    const checkOpenAIStatus = async (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      try {
        const response = await api.get('/api/ai/openai/status');
        const isConfigured = response.data?.isConfigured ?? false; // Use isConfigured for OpenAI
        console.log('OpenAI chat status:', isConfigured);
        setter(isConfigured);
        return isConfigured;
      } catch (error) {
        console.warn('Error checking OpenAI status:', error);
        setter(false);
        return false;
      }
    };

    const checkOllamaModels = async (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      try {
        // Use Ollama models endpoint as a configuration check
        const response = await api.get('/api/ollama/models');
        // Check if the response is successful and contains a models array
        const isConfigured = response.status === 200 && Array.isArray(response.data?.models);
        console.log('Ollama chat status:', isConfigured);
        setter(isConfigured);
        return isConfigured;
      } catch (error) {
        console.warn('Error checking Ollama models endpoint:', error);
        setter(false);
        return false;
      }
    };

    await Promise.all([
      checkOpenAIStatus(setIsChatOpenAIConfigured), // Use specific check for OpenAI
      checkGenericEndpoint('/api/Claude/test-connection', setIsChatAnthropicConfigured),
      checkGenericEndpoint('/api/gemini/test-connection', setIsChatGeminiConfigured),
      checkOllamaModels(setIsChatOllamaConfigured), // Use models endpoint for Ollama chat check
      checkGenericEndpoint('/api/Grok/test-connection', setIsChatGrokConfigured),
    ]);
  }, []);

  // Updated function to check both agent and chat configurations
  const checkConfigurations = useCallback(async (forceRefresh = false) => {
    if (isCheckingRef.current) return; // Prevent concurrent checks

    try {
      isCheckingRef.current = true;
      setIsLoadingConfigurations(true); // Start loading

      // Check Chat configurations (C# Backend) first to ensure we have chat status
      // even if agent API check fails
      await checkChatProviderConfigurations();

      try {
        // Check Agent configurations (Python Backend)
        const agentConfigs = await agentService.getProviderConfigurations(forceRefresh);
        setIsOpenAIConfigured(agentConfigs.openai);
        setIsAnthropicConfigured(agentConfigs.anthropic);
        setIsGrokConfigured(agentConfigs.grok);
        setIsGeminiConfigured(agentConfigs.gemini);
        setIsOllamaConfigured(agentConfigs.ollama);
      } catch (agentError) {
        // If agent check fails, don't override the chat configurations we already checked
        console.error('Error checking agent configurations:', agentError);
        console.log('Agent check failed but chat configurations were already checked');

        // Set all agent configs to false
        setIsOpenAIConfigured(false);
        setIsAnthropicConfigured(false);
        setIsGrokConfigured(false);
        setIsGeminiConfigured(false);
        setIsOllamaConfigured(false);
      }

      // After checking configurations, refresh the models list
      await refreshModels();
    } catch (error) {
      console.error('❌ Error checking configurations:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    } finally {
      isCheckingRef.current = false;
      setIsLoadingConfigurations(false); // Stop loading
      console.groupEnd();
    }
  }, [refreshModels, checkChatProviderConfigurations]); // Add dependencies

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
    // This likely needs to be re-evaluated. Configuration should happen
    // via backend settings. We might only need to *check* the configuration here.
    try {
      setError(null);
      // Check both Agent and Chat Gemini status after trying backend config update (if applicable)
      // For now, just re-check status. Actual config changes are manual/backend.
      await checkConfigurations(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check Gemini configuration';
      console.error('Failed to check Gemini configuration:', errorMessage);
      setError(errorMessage);
      // Update both agent and chat states if check fails
      setIsGeminiConfigured(false);
      setIsChatGeminiConfigured(false);
      throw error;
    }
  }, [checkConfigurations]);

  const transcribeAudio = useCallback(async (audioFile: File): Promise<AIResponse> => {
    try {
      // Agent service likely handles this, confirm if chat needs a separate endpoint
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
    } & AgentRequestParameters
  ): Promise<AIResponse> => {
    try {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      if (model.category === 'agent') {
        // Ensure agent is configured
        const isAgentProviderConfigured =
          (model.provider === 'openai' && isOpenAIConfigured) ||
          (model.provider === 'anthropic' && isAnthropicConfigured) ||
          (model.provider === 'gemini' && isGeminiConfigured) ||
          (model.provider === 'ollama' && isOllamaConfigured) ||
          (model.provider === 'grok' && isGrokConfigured);

        if (!isAgentProviderConfigured) {
          throw new Error(`Agent for provider ${model.provider} is not configured.`);
        }
        return await agentService.sendMessage(input, modelId, undefined, options);
      }

      // Handle chat models - ensure chat provider is configured
      const isChatProviderConfigured =
        (model.provider === 'openai' && isChatOpenAIConfigured) ||
        (model.provider === 'anthropic' && isChatAnthropicConfigured) ||
        (model.provider === 'gemini' && isChatGeminiConfigured) ||
        (model.provider === 'ollama' && isChatOllamaConfigured) ||
        (model.provider === 'grok' && isChatGrokConfigured);

      if (!isChatProviderConfigured) {
        throw new Error(`Chat integration for provider ${model.provider} is not configured.`);
      }

      // Special handling for Ollama streaming via agentService.ollama (uses C# backend)
      if (model.provider === 'ollama' && options?.onStreamUpdate) {
        // Note: agentService.ollama directly interacts with the C# backend endpoint
        return await agentService.ollama.sendMessage(input, modelId, options);
      }

      // Use messageService for non-streaming chat or other providers
      return await messageService.sendMessage(input, model);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, [availableModels, isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isOllamaConfigured, isGrokConfigured, isChatOpenAIConfigured, isChatAnthropicConfigured, isChatGeminiConfigured, isChatOllamaConfigured, isChatGrokConfigured]); // Add chat statuses to dependency array


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

  // Add debugging for refresh configuration
  const refreshConfiguration = useCallback(async () => {
    console.log("Refreshing AI configuration...");
    setIsLoadingConfigurations(true);

    try {
      // First clear settings cache from aiSettingsService
      await aiSettingsService.clearCache();

      // Then check AI configurations
      await checkConfigurations();

      // Increment settings version to notify components that settings have changed
      setSettingsVersion(prev => prev + 1);

      console.log("AI configuration refreshed successfully");
    } catch (error) {
      console.error("Error refreshing AI configuration:", error);
    } finally {
      setIsLoadingConfigurations(false);
    }
  }, [checkConfigurations]);

  // UseEffect to load settings on init
  useEffect(() => {
    refreshConfiguration();
  }, [refreshConfiguration]);

  // Update the context value to include the refreshConfiguration function
  const value = useMemo(() => ({
    // Agent statuses
    isOpenAIConfigured,
    isAnthropicConfigured,
    isGeminiConfigured,
    isOllamaConfigured,
    isGrokConfigured,
    // Chat statuses
    isChatOpenAIConfigured,
    isChatAnthropicConfigured,
    isChatGeminiConfigured,
    isChatOllamaConfigured,
    isChatGrokConfigured,
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
    isLoadingModels,
    isLoadingConfigurations,
    refreshConfiguration,
    settingsVersion
  }), [
    isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isOllamaConfigured, isGrokConfigured,
    isChatOpenAIConfigured, isChatAnthropicConfigured, isChatGeminiConfigured, isChatOllamaConfigured, isChatGrokConfigured,
    error, sendMessage, configureGemini, availableModels, executionSteps, handleExecutionStep, transcribeAudio,
    checkConfigurations, refreshModels, isLoadingModels, isLoadingConfigurations, refreshConfiguration, settingsVersion
  ]);

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