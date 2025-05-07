import { useState, useRef, useMemo, useCallback } from 'react';
import { Message } from '../../../../types/message';
import { AIModel } from '../../../../types/ai';
import { useAI } from '../../../../contexts/AIContext';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { ModernMessageList } from './ModernMessageList';
import { Settings, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UnifiedInputBar } from './UnifiedInputBar';

export function EnhancedChatPage() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const {
        isOpenAIConfigured,
        isGeminiConfigured,
        isAnthropicConfigured,
        isOllamaConfigured,
        availableModels,
        sendMessage
    } = useAI();

    const initialModel = useMemo(() => {
        const nonAgentModels = availableModels.filter((m: AIModel) => m.category !== 'agent');
        return nonAgentModels.length > 0 ? nonAgentModels[0] : null;
    }, [availableModels]);

    const [selectedModel, setSelectedModel] = useState<AIModel | null>(initialModel);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleModelSelect = (model: AIModel) => {
        setSelectedModel(model);
        setMessages([]);
        setError(null);
    };

    const getContainerBackground = useCallback(() => {
        if (theme === 'dark') return 'bg-gray-900/50';
        if (theme === 'midnight') return 'bg-black/30';
        if (theme === 'full-dark') return 'bg-black/50';
        return 'bg-white/50';
    }, [theme]);

    const getBorderColor = useCallback(() => {
        if (theme === 'midnight') return 'border-gray-700/50';
        if (theme === 'dark') return 'border-gray-700';
        if (theme === 'full-dark') return 'border-gray-800';
        return 'border-gray-300/70';
    }, [theme]);

    const handleUserInput = async (input: string) => {
        if (!selectedModel) {
            setError('Please select a model first.');
            return;
        }
        setIsLoading(true);
        setError(null);

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input,
            type: 'text',
            timestamp: new Date().toISOString(),
            model: selectedModel,
        };

        const assistantMessageId = `assistant-${Date.now()}`;
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            type: 'text',
            timestamp: new Date().toISOString(),
            model: selectedModel,
            isLoading: true,
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);

        try {
            const aiResponse = await sendMessage(input, selectedModel.id);
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                    ? { ...msg, ...aiResponse, isLoading: false }
                    : msg
            ));
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Failed to get response from AI.');
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                    ? { ...msg, content: `Error: ${error.message || 'Failed to load response'}`, isLoading: false, type: 'text' }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const unifiedInputBarProps = {
        availableModels: availableModels.filter(m => m.category !== 'agent'),
        selectedModel: selectedModel,
        onModelSelected: handleModelSelect,
        onUserInput: handleUserInput,
        isLoading: isLoading,
    };

    if (!isOpenAIConfigured && !isGeminiConfigured && !isAnthropicConfigured && !isOllamaConfigured) {
        return (
            <div className={`flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-4 p-4 ${getContainerBackground()} ${getBorderColor()} border rounded-xl`}>
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
        <div className={`w-full h-[calc(100vh-10rem)] flex flex-col p-3 rounded-xl ${getContainerBackground()} border ${getBorderColor()} shadow-lg`}>
            {messages.length === 0 ? (
                // Case 1: No messages, centered input bar
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Bot className="w-16 h-16 text-[var(--color-textSecondary)] mb-6" />
                    <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-2">
                        Start a new chat
                    </h2>
                    <p className="text-[var(--color-textSecondary)] mb-8 text-center max-w-md px-4">
                        Select a model and type your first message below to begin your conversation.
                    </p>
                    <div className="w-full max-w-2xl px-1">
                        <UnifiedInputBar {...unifiedInputBarProps} />
                    </div>
                </div>
            ) : (
                // Case 2: Messages exist, standard layout
                <>
                    <div className="flex-1 overflow-y-auto mb-3 custom-scrollbar pr-1">
                        <ModernMessageList
                            messages={messages}
                            isLoading={isLoading}
                            messagesEndRef={messagesEndRef}
                            themeColor={selectedModel?.color || '#3b82f6'}
                            selectedModel={selectedModel}
                        />
                    </div>

                    {error && (
                        <div className="mb-2 p-3 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-sm mx-1">
                            {error}
                        </div>
                    )}

                    <div className="mt-auto px-1 pb-1">
                        <UnifiedInputBar {...unifiedInputBarProps} />
                    </div>
                </>
            )}
        </div>
    );
} 