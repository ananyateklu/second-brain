import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AIModel, AIResponse, ExecutionStep } from '../types/ai';
import { Message } from '../types/message';
import { LlamaService } from '../services/ai/llama';
import { signalRService } from '../services/signalR';
import { agentService } from '../services/ai/agent';

interface AIContextType {
  isOpenAIConfigured: boolean;
  isAnthropicConfigured: boolean;
  isGeminiConfigured: boolean;
  isLlamaConfigured: boolean;
  isGrokConfigured: boolean;
  error: string | null;
  sendMessage: (input: string, modelId: string) => Promise<AIResponse>;
  configureGemini: (apiKey: string) => Promise<void>;
  availableModels: AIModel[];
  llamaService: LlamaService;
  executionSteps: Record<string, ExecutionStep[]>;
  handleExecutionStep: (step: ExecutionStep) => void;
  transcribeAudio: (audioFile: File) => Promise<AIResponse>;
  checkConfigurations: () => Promise<void>;
}

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [isOpenAIConfigured, setIsOpenAIConfigured] = useState<boolean>(false);
  const [isAnthropicConfigured, setIsAnthropicConfigured] = useState<boolean>(false);
  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean>(agentService.isGeminiConfigured());
  const [isLlamaConfigured, setIsLlamaConfigured] = useState<boolean>(agentService.llama.isConfigured());
  const [isGrokConfigured, setIsGrokConfigured] = useState<boolean>(false);
  const [availableModels] = useState<AIModel[]>(agentService.getAvailableModels());
  const [messages, setMessages] = useState<Message[]>([]);
  const [executionSteps, setExecutionSteps] = useState<Record<string, ExecutionStep[]>>({});
  const latestMessageIdRef = useRef<string | null>(null);

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
      console.log('[AIContext] Received step:', step);

      // Get message ID from metadata
      const messageId = step.metadata?.messageId;
      if (!messageId) {
        console.warn('[AIContext] Step received without messageId:', step);
        return;
      }

      setExecutionSteps(prev => {
        const currentSteps = [...(prev[messageId as keyof typeof prev] || []), step];
        console.log('[AIContext] Updating steps for message:', {
          messageId,
          steps: currentSteps
        });
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

  // Add new function to check configurations
  const checkConfigurations = useCallback(async () => {
    console.group('🤖 AI Model Configurations Check');

    try {
      const [openai, anthropic, grok] = await Promise.all([
        agentService.isOpenAIConfigured(),
        agentService.isAnthropicConfigured(),
        agentService.grokService.checkConfiguration()
      ]);

      // Log each configuration status
      console.log('📊 Configuration Status:');
      console.log('OpenAI:', openai ? '✅ Configured' : '❌ Not Configured');
      console.log('Anthropic:', anthropic ? '✅ Configured' : '❌ Not Configured');
      console.log('Grok:', grok ? '✅ Configured' : '❌ Not Configured');

      // These don't need async calls
      const gemini = agentService.isGeminiConfigured();
      const llama = agentService.llama.isConfigured();
      console.log('Gemini:', gemini ? '✅ Configured' : '❌ Not Configured');
      console.log('Llama:', llama ? '✅ Configured' : '❌ Not Configured');

      setIsOpenAIConfigured(openai);
      setIsAnthropicConfigured(anthropic);
      setIsGrokConfigured(grok);
      setIsGeminiConfigured(gemini);
      setIsLlamaConfigured(llama);

      console.log('🔄 State Updated:', {
        isOpenAIConfigured: openai,
        isAnthropicConfigured: anthropic,
        isGrokConfigured: grok,
        isGeminiConfigured: gemini,
        isLlamaConfigured: llama
      });

    } catch (error) {
      console.error('❌ Error checking configurations:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    }

    console.groupEnd();
  }, []);

  const configureGemini = useCallback(async () => {
    try {
      setError(null);
      const success = await agentService.isGeminiConfigured();
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

  const sendMessage = useCallback(async (input: string, modelId: string): Promise<AIResponse> => {
    try {
      return await agentService.sendMessage(input, modelId);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }, []);

  // Track the latest assistant message ID
  useEffect(() => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      latestMessageIdRef.current = lastAssistantMessage.id;
      console.log('[AIContext] Updated latest message ID:', lastAssistantMessage.id);
    }
  }, [messages]);

  const handleExecutionStep = useCallback((step: ExecutionStep) => {
    console.log('[AIContext] Received new step:', step);

    const messageId = latestMessageIdRef.current;
    if (!messageId) {
      console.log('[AIContext] No message ID available for step:', step);
      return;
    }

    setExecutionSteps(prev => {
      const currentSteps = [...(prev[messageId] || []), step];
      console.log('[AIContext] Updating steps for message:', {
        messageId,
        steps: currentSteps,
        isComplete: step.type === 4  // 4 is Result in ExecutionStepType
      });

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
    isLlamaConfigured,
    isGrokConfigured,
    error,
    sendMessage,
    configureGemini,
    availableModels,
    llamaService: agentService.llama,
    executionSteps,
    handleExecutionStep,
    transcribeAudio,
    checkConfigurations
  }), [isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isLlamaConfigured, isGrokConfigured, error, sendMessage, configureGemini, availableModels, executionSteps, handleExecutionStep, transcribeAudio, checkConfigurations]);

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