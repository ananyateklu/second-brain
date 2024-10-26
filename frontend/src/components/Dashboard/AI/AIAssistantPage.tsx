import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Settings } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';
import { ModelSelector } from './ModelSelector';
import { ChatInterface } from './ChatInterface';
import { ImageInterface } from './ImageInterface';
import { AudioInterface } from './AudioInterface';
import { EmbeddingInterface } from './EmbeddingInterface';
import { DefaultInterface } from './DefaultInterface';
import { MessageList } from './MessageList';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  model?: string;
}

export function AIAssistantPage() {
  const navigate = useNavigate();
  const { isOpenAIConfigured, availableModels } = useAI();
  const [selectedCategory, setSelectedCategory] = useState<string>('chat');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect to settings if OpenAI is not configured
  React.useEffect(() => {
    if (!isOpenAIConfigured) {
      navigate('/dashboard/settings');
    }
  }, [isOpenAIConfigured, navigate]);

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
    setError(null);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedModel(null);
    setError(null);
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  if (!isOpenAIConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-4">
        <Bot className="w-16 h-16 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          AI Assistant Not Configured
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          Please configure your OpenAI API key in settings to use the AI assistant.
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
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Model Selection */}
      <div className="glass-morphism p-4 rounded-xl mb-4">
        <ModelSelector
          models={availableModels}
          selectedModel={selectedModel}
          selectedCategory={selectedCategory}
          onModelSelect={handleModelSelect}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Messages List */}
      <div className="flex-1 glass-morphism rounded-xl mb-4 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2">
          <p>{error}</p>
        </div>
      )}

      {/* Input Interface */}
      <div className="glass-morphism p-4 rounded-xl">
        {selectedModel ? (
          <>
            {selectedModel.category === 'chat' && (
              <ChatInterface
                model={selectedModel}
                onMessageSend={addMessage}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            )}
            {selectedModel.category === 'image' && (
              <ImageInterface
                model={selectedModel}
                onMessageSend={addMessage}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            )}
            {selectedModel.category === 'audio' && (
              <AudioInterface
                model={selectedModel}
                onMessageSend={addMessage}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            )}
            {selectedModel.category === 'embedding' && (
              <EmbeddingInterface
                model={selectedModel}
                onMessageSend={addMessage}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            )}
            {!['chat', 'image', 'audio', 'embedding'].includes(selectedModel.category) && (
              <DefaultInterface
                model={selectedModel}
                onMessageSend={addMessage}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
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