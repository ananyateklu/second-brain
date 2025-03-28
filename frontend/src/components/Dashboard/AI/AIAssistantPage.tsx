import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Settings } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';
import { Message } from '../../../types/message'; // Import Message interface
import { ModelSelector } from './ModelSelector';
import { ChatInterface } from './ChatInterface';
import { MessageList } from './MessageList';
import { AudioInterface } from './AudioInterface';
import { ImageInterface } from './ImageInterface';
import { FunctionInterface } from './FunctionInterface';
import { RAGInterface } from './RAGInterface';
import { useTheme } from '../../../contexts/themeContextUtils';

export function AIAssistantPage() {
  const navigate = useNavigate();
  const { theme } = useTheme(); // Get current theme
  const { isOpenAIConfigured, isGeminiConfigured, isAnthropicConfigured, isLlamaConfigured, availableModels, sendMessage } = useAI();
  const [selectedCategory, setSelectedCategory] = useState<string>('chat');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(true);

  // Filter out agent models
  const nonAgentModels = useMemo(() =>
    availableModels.filter(model => model.category !== 'agent'),
    [availableModels]
  );

  const themeColor = selectedModel?.color || '#3b82f6'; // Default to blue

  // Theme helper functions
  const getContainerBackground = () => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-white/5';
    return 'bg-white/30';
  };

  const getBorderColor = () => {
    if (theme === 'midnight') return 'border-[#334155]';
    if (theme === 'dark') return 'border-[#1e293b]';
    return 'border-[rgb(229_231_235/0.3)]';
  };

  const getShadowClass = () => {
    if (theme === 'dark' || theme === 'midnight') {
      return 'shadow-[0_8px_16px_rgba(0,0,0,0.3)]';
    }
    return 'shadow-[0_8px_16px_rgba(0,0,0,0.08)]';
  };

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
    setMessages((prev) => [...prev, message]);
  };

  const updateMessage = (messageId: string, updatedMessage: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, ...updatedMessage } : msg
      )
    );
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
      // Handle all models with sendMessage
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
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error in handleUserInput:', err);
      setError(err.message || 'Failed to communicate with the AI assistant.');
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailsToggle = (isOpen: boolean) => {
    setShowModelDetails(isOpen);
  };

  const handleAudioMessage = (messageData: {
    id?: string;
    role: "user" | "assistant";
    content: string | File;
    type: "audio" | "image" | "text";
    timestamp?: string;
    model?: AIModel;
    isLoading?: boolean;
  }) => {
    const message: Message = {
      ...messageData,
      id: messageData.id || `${messageData.role}-${Date.now()}`,
      timestamp: messageData.timestamp || new Date().toISOString(),
      model: messageData.model || selectedModel!,
      isLoading: messageData.isLoading ?? false
    };

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
        <Bot className="w-16 h-16 text-[var(--color-textSecondary)]" />
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          AI Assistant Not Configured
        </h2>
        <p className="text-[var(--color-textSecondary)] text-center max-w-md">
          Please configure your API keys in settings to use the AI assistant.
        </p>
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Configure Settings</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-9rem)] flex flex-col relative">
      <div className="flex-1 flex flex-col gap-4 pb-[110px] overflow-hidden">
        {/* Model Selection */}
        <div className={`
            ${getContainerBackground()}
            backdrop-blur-xl 
            ${getBorderColor()} 
            border 
            ${getShadowClass()}
            rounded-xl
            transition-all duration-200 ease-in-out
            flex items-center justify-center
            ${showModelDetails
            ? 'max-h-[45vh]'
            : selectedModel && !showModelSelector
              ? 'max-h-[80px]'
              : 'max-h-[25vh]'
          }`}
          style={{
            boxShadow: selectedModel
              ? `0 4px 6px -1px ${selectedModel.color}10, 0 2px 4px -2px ${selectedModel.color}10`
              : undefined
          }}
        >
          <ModelSelector
            models={nonAgentModels}
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
        <div
          className={`
            flex-1 overflow-hidden
            ${getContainerBackground()} 
            backdrop-blur-xl 
            border 
            ${getBorderColor()} 
            ${getShadowClass()}
            rounded-xl`}
          style={{
            boxShadow: selectedModel
              ? `0 4px 6px -1px ${selectedModel.color}10, 0 2px 4px -2px ${selectedModel.color}10`
              : undefined
          }}
        >
          <MessageList
            messages={messages}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
            themeColor={themeColor}
            selectedModel={selectedModel}
          />
        </div>
      </div>

      {/* Error and Input - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 mb-4 z-10">
        {error && (
          <div className="mb-4 p-4 backdrop-blur-sm rounded-xl border
            bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400
            border-red-200/30 dark:border-red-700/30">
            <p>{error}</p>
          </div>
        )}

        <div className={`
            ${getContainerBackground()} 
            backdrop-blur-xl
            border
            ${getBorderColor()}
            ${getShadowClass()}
            p-4 rounded-xl`}
          style={{
            boxShadow: selectedModel
              ? `0 4px 6px -1px ${selectedModel.color}10, 0 2px 4px -2px ${selectedModel.color}10`
              : undefined
          }}
        >
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
              ) : selectedModel.category === 'rag' ? (
                <RAGInterface
                  addMessage={addMessage}
                  updateMessage={updateMessage}
                  themeColor={themeColor}
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
            <div className="text-center text-[var(--color-textSecondary)] py-4">
              Select a model to start
            </div>
          )}
        </div>
      </div>
    </div>
  );
}