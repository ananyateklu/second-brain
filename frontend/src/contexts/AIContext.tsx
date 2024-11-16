import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AIService } from '../services/ai';
import { AIModel, AIResponse, ExecutionStep, Message } from '../types/ai';
import { LlamaService } from '../services/ai/llama';
import { signalRService } from '../services/signalR';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [executionSteps, setExecutionSteps] = useState<Record<string, ExecutionStep[]>>({});
  const latestMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Initialize SignalR connection
    signalRService.start();

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
        const currentSteps = [...(prev[messageId] || []), step];
        console.log('[AIContext] Updating steps for message:', {
          messageId,
          steps: currentSteps
        });
        return {
          ...prev,
          [messageId]: currentSteps
        };
      });
    });

    return () => {
      signalRService.stop();
      unsubscribe();
    };
  }, []);

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
    console.log('Available models:', aiService.getAvailableModels());
  }, [isGeminiConfigured]);

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

  const transcribeAudio = useCallback(async (audioFile: File): Promise<AIResponse> => {
    try {
      return await aiService.transcribeAudio(audioFile);
    } catch (error) {
      console.error('Error in transcribeAudio:', error);
      throw error;
    }
  }, []);

  const sendMessage = useCallback(async (input: string, modelId: string): Promise<AIResponse> => {
    try {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) throw new Error('Model not found');

      const messageId = Date.now().toString();

      // Create user message
      const userMessage: Message = {
        id: `user-${messageId}`,
        role: 'user',
        content: input,
        type: 'text',
        timestamp: new Date().toISOString(),
        model: model
      };

      // Create assistant message for function models
      if (model.category === 'function') {
        const assistantMessageId = `assistant-${messageId}`;
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          type: 'function',
          timestamp: new Date().toISOString(),
          model: model,
          executionSteps: [],
          isStreaming: true
        };

        // Add both messages
        setMessages(prev => [...prev, userMessage, assistantMessage]);

        // Initialize steps array for this message
        setExecutionSteps(prev => ({
          ...prev,
          [assistantMessageId]: []
        }));

        // Start the function call
        return await aiService.sendMessage(input, modelId);
      }

      // For non-function models...
      setMessages(prev => [...prev, userMessage]);
      return await aiService.sendMessage(input, modelId);
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
        isComplete: step.type === 'result'
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
        isStreaming: step.type !== 'result' // Set streaming false when we get result
      };

      return [
        ...prev.slice(0, index),
        updatedMessage,
        ...prev.slice(index + 1)
      ];
    });
  }, []);

  // Initialize assistant message for function calls
  const addMessage = useCallback((message: Message) => {
    if (message.role === 'user') {
      setMessages(prev => {
        const userMessage = { ...message };

        // For function models, immediately create assistant message
        if (message.model?.category === 'function') {
          const assistantId = `assistant-${Date.now()}`;
          const assistantMessage: Message = {
            id: assistantId,
            role: 'assistant',
            content: '',
            type: 'function',
            timestamp: new Date().toISOString(),
            model: message.model,
            executionSteps: [], // Initialize empty array
            isStreaming: true
          };

          // Initialize steps array for new message
          setExecutionSteps(prev => ({
            ...prev,
            [assistantId]: []
          }));

          latestMessageIdRef.current = assistantId;
          return [...prev, userMessage, assistantMessage];
        }

        return [...prev, userMessage];
      });
    } else {
      setMessages(prev => [...prev, message]);
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
    configureGemini,
    availableModels,
    llamaService: aiService.llama,
    executionSteps,
    handleExecutionStep,
    transcribeAudio
  }), [isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isLlamaConfigured, isGrokConfigured, error, sendMessage, configureGemini, availableModels, executionSteps, handleExecutionStep, transcribeAudio]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}