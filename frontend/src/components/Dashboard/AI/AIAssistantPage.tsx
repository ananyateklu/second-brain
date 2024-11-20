import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Settings } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel, ExecutionStep } from '../../../types/ai';
import { ModelSelector } from './ModelSelector';
import { ChatInterface } from './ChatInterface';
import { MessageList } from './MessageList';
import { AudioInterface } from './AudioInterface';
import { ImageInterface } from './ImageInterface';
import { FunctionInterface } from './FunctionInterface';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | Blob;
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
  language?: string;
  transcription?: string;
}

export function AIAssistantPage() {
  const navigate = useNavigate();
  const { isOpenAIConfigured, isGeminiConfigured, isAnthropicConfigured, isLlamaConfigured, availableModels, sendMessage, llamaService } = useAI();
  const [selectedCategory, setSelectedCategory] = useState<string>('chat');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(true);

  const themeColor = selectedModel?.color || '#3b82f6'; // Default to blue

  const handleModelSelect = (model: AIModel | null) => {
    setSelectedModel(model);
    setError(null);
    if (model) {
      setShowModelSelector(false); // Auto-collapse when model is selected
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedModel(null);
    setError(null);
    setMessages([]);
  };

  const addMessage = (message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const handleUserInput = async (input: string) => {
    if (!selectedModel) {
      setError('Please select a model before sending a message.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const messageId = Date.now().toString();

    const userMessage: Message = {
      id: `user-${messageId}`,
      role: 'user',
      content: input,
      type: 'text',
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };

    const assistantMessageId = `assistant-${messageId}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      type: selectedModel.category === 'function' ? 'function' : 'text',
      timestamp: new Date().toISOString(),
      model: selectedModel,
      isLoading: true,
      executionSteps: [],
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);

    try {
      if (selectedModel.category === 'function') {
        await llamaService.executeDatabaseOperation(input, assistantMessageId, selectedModel.id);
      } else {
        const aiResponse = await sendMessage(input, selectedModel.id);
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              content: aiResponse.content,
              type: aiResponse.type,
              isLoading: false,
              executionSteps: aiResponse.executionSteps
            }
            : msg
        ));
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error in handleUserInput:', err);
      setError(err.message || 'Failed to communicate with the AI assistant.');
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  };

  const handleDetailsToggle = (isOpen: boolean) => {
    setShowModelDetails(isOpen);
  };

  const handleAudioMessage = (message: Message) => {
    if (message.role === 'assistant' && !message.isLoading) {
      setMessages(prevMessages => {
        const existingMessageIndex = prevMessages.findIndex(
          msg => msg.role === 'assistant' && msg.isLoading
        );

        if (existingMessageIndex !== -1) {
          const newMessages = [...prevMessages];
          newMessages[existingMessageIndex] = message;
          return newMessages;
        }

        return [...prevMessages, message];
      });
    } else {
      setMessages(prev => [...prev, message]);
    }
  };

  if (!isOpenAIConfigured && !isGeminiConfigured && !isAnthropicConfigured && !isLlamaConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-4">
        <Bot className="w-16 h-16 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Assistant Not Configured
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          Please configure your API keys in settings to use the AI assistant.
        </p>
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Configure Settings</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 left-0 lg:left-60 right-0 bottom-0 overflow-hidden px-4 pt-4 pb-4">
      <div className="h-full grid grid-rows-[minmax(0,auto),1fr,auto] max-w-full overflow-hidden">
        {/* Model Selection */}
        <div className={`backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 
          border border-gray-200/30 dark:border-gray-700/30 
          shadow-lg rounded-xl mb-4
          transition-all duration-200 ease-in-out
          flex items-center justify-center
          ${showModelDetails
            ? 'max-h-[45vh]'
            : selectedModel && !showModelSelector
              ? 'max-h-[80px]'
              : 'max-h-[25vh]'
          }`}
        >

          <ModelSelector
            models={availableModels}
            selectedModel={selectedModel}
            selectedCategory={selectedCategory}
            onModelSelect={handleModelSelect}
            onCategoryChange={handleCategoryChange}
            onDetailsToggle={handleDetailsToggle}
            showModelSelector={showModelSelector}
            setShowModelSelector={setShowModelSelector}
          />

        </div>

        {/* Messages Container */}
        <div className="min-h-0 backdrop-blur-sm bg-white/30 
          dark:bg-gray-800/30 border border-gray-200/30 
          dark:border-gray-700/30 shadow-lg rounded-xl mb-4">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
            themeColor={themeColor}
            selectedModel={selectedModel}
          />
        </div>

        {/* Error and Input */}
        <div>
          {error && (
            <div className="mb-4 p-4 backdrop-blur-sm bg-red-50/50 
              dark:bg-red-900/30 border border-red-200/30 
              dark:border-red-700/30 text-red-600 
              dark:text-red-400 rounded-xl">
              <p>{error}</p>
            </div>
          )}

          <div className="backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 
            border border-gray-200/30 dark:border-gray-700/30 
            shadow-lg p-4 rounded-xl">
            {selectedModel ? (
              <>
                {selectedModel.category === 'function' ? (
                  <FunctionInterface
                    model={selectedModel}
                    onUserInput={handleUserInput}
                    isLoading={isLoading}
                    themeColor={themeColor}
                  />
                ) : selectedModel.id === 'whisper-1' ? (
                  <AudioInterface
                    model={selectedModel}
                    onMessageSend={handleAudioMessage}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    setError={setError}
                  />
                ) : selectedModel.category === 'audio' ? (
                  <ChatInterface
                    model={selectedModel}
                    onUserInput={handleUserInput}
                    isLoading={isLoading}
                    themeColor={themeColor}
                  />
                ) : selectedModel.category === 'image' ? (
                  <ImageInterface
                    model={selectedModel}
                    addMessage={addMessage}
                    updateMessage={updateMessage}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    setError={setError}
                  />
                ) : (
                  <ChatInterface
                    model={selectedModel}
                    onUserInput={handleUserInput}
                    isLoading={isLoading}
                    themeColor={themeColor}
                  />
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                Select a model to start
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}