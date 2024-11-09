import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Settings } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';
import { ModelSelector } from './ModelSelector';
import { ChatInterface } from './ChatInterface';
import { MessageList } from './MessageList';
import { AudioInterface } from './AudioInterface';
import { ImageInterface } from './ImageInterface';
import { FunctionInterface } from './FunctionInterface';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio' | 'embedding';
  timestamp: string;
  model?: AIModel;
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

  const themeColor = selectedModel?.color || '#3b82f6'; // Default to blue

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
    setError(null);
    setMessages([]);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      type: 'text',
      timestamp: new Date().toISOString(),
      model: selectedModel,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const aiResponse = selectedModel.category === 'function'
        ? await llamaService.executeDatabaseOperation(input)
        : await sendMessage(input, selectedModel.id);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.content,
        type: aiResponse.type,
        timestamp: new Date().toISOString(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (e: any) {
      setError(e.message || 'Failed to communicate with the AI assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMessage = (messageId: string, updatedMessage: Partial<Message>) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId
          ? { ...msg, ...updatedMessage }
          : msg
      )
    );
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
    <div className="h-full flex flex-col">
      {/* Model Selection - Fixed height */}
      <div className="backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 shadow-lg p-4 rounded-xl mb-4">
        <ModelSelector
          models={availableModels}
          selectedModel={selectedModel}
          selectedCategory={selectedCategory}
          onModelSelect={handleModelSelect}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Messages Container - Flexible height with overflow */}
      <div className="flex-1 overflow-y-auto backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 shadow-lg rounded-xl mb-4">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
          themeColor={themeColor}
        />
      </div>

      {/* Error Display - Fixed position above input */}
      {error && (
        <div className="mb-4 p-4 backdrop-blur-sm bg-red-50/50 dark:bg-red-900/30 border border-red-200/30 dark:border-red-700/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2">
          <p>{error}</p>
        </div>
      )}

      {/* Input Interface - Fixed at bottom */}
      <div className="sticky bottom-0 backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-gray-200/30 dark:border-gray-700/30 shadow-lg p-4 rounded-xl">
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
                onMessageSend={(message) => {
                  const newMessage: Message = {
                    ...message,
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    model: selectedModel,
                  };
                  addMessage(newMessage);
                }}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            ) : selectedModel.category === 'image' ? (
              <ImageInterface
                model={selectedModel}
                addMessage={(message) => {
                  const newMessage: Message = {
                    ...message,
                    id: message.id || Date.now().toString(),
                    timestamp: message.timestamp || new Date().toISOString(),
                    model: selectedModel,
                  };
                  addMessage(newMessage);
                }}
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
  );
}