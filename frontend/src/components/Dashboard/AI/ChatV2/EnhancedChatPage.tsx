import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Message } from '../../../../types/message';
import { AIModel } from '../../../../types/ai';
import { useAI } from '../../../../contexts/AIContext';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { ModernMessageList } from './ModernMessageList';
import { Settings, Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UnifiedInputBar } from './UnifiedInputBar';
import api from '../../../../services/api/api';
import { ChatHistorySidebar, AgentChat, AgentMessage } from './ChatHistorySidebar';

// Local storage key for the selected model
const SELECTED_MODEL_KEY = 'enhanced_chat_selected_model';

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

        // Try to get the saved model ID from localStorage
        const savedModelId = localStorage.getItem(SELECTED_MODEL_KEY);
        if (savedModelId) {
            // Find the model with the saved ID
            const savedModel = nonAgentModels.find(m => m.id === savedModelId);
            if (savedModel) return savedModel;
        }

        // Fall back to the first available model
        return nonAgentModels.length > 0 ? nonAgentModels[0] : null;
    }, [availableModels]);

    const [selectedModel, setSelectedModel] = useState<AIModel | null>(initialModel);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // New state for chat management
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [chats, setChats] = useState<AgentChat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Save selected model to localStorage when it changes
    useEffect(() => {
        if (selectedModel) {
            localStorage.setItem(SELECTED_MODEL_KEY, selectedModel.id);
        }
    }, [selectedModel]);

    // Fetch chats on component mount
    const fetchChats = useCallback(async () => {
        try {
            setIsLoadingChats(true);
            const response = await api.get('/api/AgentChats');
            // Filter to only include chats created in Enhanced Chat or without a source (backward compatibility)
            const filteredChats = response.data.filter(
                (chat: AgentChat) => chat.chatSource === 'enhanced' || !chat.chatSource
            );

            // Map the chats to include model color
            const chatsWithModelColor = filteredChats.map((chat: AgentChat) => {
                const model = availableModels.find(m => m.id === chat.modelId);
                return {
                    ...chat,
                    modelColor: model?.color || '#888888'
                };
            });

            setChats(chatsWithModelColor);
        } catch (err) {
            console.error('Failed to fetch chats:', err);
        } finally {
            setIsLoadingChats(false);
        }
    }, [availableModels]);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    // Save a message to the current chat
    const saveMessage = async (chatId: string, role: string, content: string, metadata?: Record<string, unknown>) => {
        try {
            const response = await api.post(`/api/AgentChats/${chatId}/messages`, {
                role,
                content,
                status: 'sent',
                metadata
            });
            return response.data;
        } catch (err) {
            console.error('Failed to save message:', err);
            throw err;
        }
    };

    // Load messages for a specific chat
    const loadChat = async (chatId: string) => {
        try {
            setIsLoading(true);
            setMessages([]);
            const response = await api.get(`/api/AgentChats/${chatId}`);
            const chat = response.data;

            // Find the model associated with this chat
            const model = availableModels.find(m => m.id === chat.modelId);
            if (model) {
                setSelectedModel(model);
            } else if (initialModel) {
                // If model not found but we have initialModel, use that with the chat's color
                const fallbackModel = {
                    ...initialModel,
                    id: chat.modelId,
                    name: 'Unknown Model',
                    color: chat.modelColor || '#888888'
                };
                setSelectedModel(fallbackModel);
            }

            // Convert backend messages to our frontend Message format
            const convertedMessages = chat.messages.map((msg: AgentMessage) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                type: 'text',
                timestamp: msg.timestamp,
                model: model || selectedModel,
                metadata: msg.metadata
            }));

            setMessages(convertedMessages);
            setCurrentChatId(chatId);
        } catch (err) {
            console.error('Failed to load chat:', err);
            setError('Failed to load chat history');
        } finally {
            setIsLoading(false);
        }
    };

    // Delete a chat
    const deleteChat = async (chatId: string) => {
        try {
            await api.delete(`/api/AgentChats/${chatId}`);
            setChats(prev => prev.filter(chat => chat.id !== chatId));

            // If the deleted chat was the current one, reset state
            if (currentChatId === chatId) {
                setCurrentChatId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to delete chat:', err);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setCurrentChatId(null);
        setError(null);
    };

    const handleModelSelect = (model: AIModel) => {
        setSelectedModel(model);
        setMessages([]);
        setError(null);
        setCurrentChatId(null); // Reset current chat when model changes
    };

    const getContainerBackground = useCallback(() => {
        if (theme === 'dark') return 'bg-gray-900/50';
        if (theme === 'midnight') return 'bg-gray-900';
        if (theme === 'full-dark') return 'bg-black/50';
        return 'bg-white/50';
    }, [theme]);

    const getBorderColor = useCallback(() => {
        if (theme === 'midnight') return 'border-gray-700/50';
        if (theme === 'dark') return 'border-gray-700';
        if (theme === 'full-dark') return 'border-gray-800';
        return 'border-gray-300/70';
    }, [theme]);

    // Create a chat title from the first message
    const generateTitleFromMessage = (message: string): string => {
        // Truncate to first 50 characters, but try to break at the end of a sentence
        // or at a word boundary if possible
        const maxLength = 50;

        if (message.length <= maxLength) {
            return message;
        }

        // Try to find a sentence ending within the first maxLength characters
        const sentenceEnd = message.substring(0, maxLength).lastIndexOf('.');
        if (sentenceEnd > 10) { // At least 10 chars to ensure we get a decent title
            return message.substring(0, sentenceEnd + 1);
        }

        // If no sentence end, try to break at a word boundary
        const wordBreak = message.substring(0, maxLength).lastIndexOf(' ');
        if (wordBreak > 0) {
            return message.substring(0, wordBreak) + '...';
        }

        // Last resort: just truncate
        return message.substring(0, maxLength) + '...';
    };

    // Handle user input
    const handleUserInput = async (input: string) => {
        if (!selectedModel) {
            setError('Please select a model first.');
            return;
        }
        setIsLoading(true);
        setError(null);

        // Create a new chat if we don't have one
        let chatId = currentChatId;
        if (!chatId) {
            try {
                // Generate a title from the first message
                const title = generateTitleFromMessage(input);

                // Create chat with a meaningful title right away
                const response = await api.post('/api/AgentChats', {
                    modelId: selectedModel.id,
                    title: title,
                    chatSource: 'enhanced'
                });

                chatId = response.data.id;

                // Add the new chat to the chat list with model color
                setChats(prev => [
                    {
                        ...response.data,
                        modelColor: selectedModel.color || '#888888',
                        messages: []
                    },
                    ...prev
                ]);

                setCurrentChatId(chatId);
            } catch (e) {
                console.error('Failed to create a new chat:', e);
                setError('Failed to create a new chat');
                setIsLoading(false);
                return;
            }
        }

        // At this point, chatId is guaranteed to be a string (not null)
        // as we either had a valid one or created a new one
        const validChatId = chatId as string;

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
            // Save user message to backend
            await saveMessage(validChatId, 'user', input);

            // Get AI response
            const aiResponse = await sendMessage(input, selectedModel.id);

            // Update assistant message in UI
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                    ? { ...msg, ...aiResponse, isLoading: false }
                    : msg
            ));

            // Save assistant response to backend
            await saveMessage(
                validChatId,
                'assistant',
                typeof aiResponse.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse.content),
                aiResponse.metadata
            );
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

    const mainContent = (
        <div className="flex-1 flex flex-col h-full">
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

    return (
        <div className={`w-full h-[calc(100vh-10rem)] flex rounded-xl ${getContainerBackground()} border ${getBorderColor()} shadow-lg overflow-hidden relative`}>
            {/* Chat Sidebar */}
            {showSidebar && (
                <div className={`w-64 flex-shrink-0 border-r ${getBorderColor()} ${getContainerBackground()}`}>
                    <ChatHistorySidebar
                        chats={chats}
                        currentChatId={currentChatId}
                        onSelectChat={loadChat}
                        onNewChat={handleNewChat}
                        onDeleteChat={deleteChat}
                        onClose={() => setShowSidebar(false)}
                        isLoading={isLoadingChats}
                        selectedModel={selectedModel}
                    />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 p-3">
                {mainContent}
            </div>

            {/* Enhanced toggle sidebar button with hover animations */}
            <button
                onClick={() => setShowSidebar(prev => !prev)}
                className={`absolute ${showSidebar ? '-left-16' : 'left-3'} top-3 
                    ${showSidebar ? 'p-2 rounded-full' : 'px-4 py-2 rounded-lg flex items-center gap-2'} 
                    transition-all duration-300 shadow-sm hover:shadow-md
                    transform hover:scale-105 hover:-translate-y-0.5 group
                    ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'bg-gray-800/90 hover:bg-gray-800 text-gray-200'
                        : 'bg-white/90 hover:bg-white text-gray-700'}`}
                style={selectedModel ? {
                    border: showSidebar ? 'none' : `1px solid ${selectedModel.color}4D`,
                    color: !showSidebar ? `${selectedModel.color}99` : 'white',
                    background: showSidebar ? `${selectedModel.color}80` : 'transparent',
                    boxShadow: !showSidebar ? `0 2px 8px -2px ${selectedModel.color}40` : 'none',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                } : {
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                aria-label={showSidebar ? "Close sidebar" : "Open sidebar"}
            >
                {showSidebar ?
                    <PanelLeftClose className="transform transition-transform duration-300 hover:scale-110" size={20} /> :
                    <>
                        <PanelLeftOpen className="transform transition-transform group-hover:rotate-[-5deg] duration-300" size={20} />
                        <span className="text-sm font-medium group-hover:tracking-wide transition-all duration-300">Conversations</span>
                    </>
                }
            </button>
        </div>
    );
} 