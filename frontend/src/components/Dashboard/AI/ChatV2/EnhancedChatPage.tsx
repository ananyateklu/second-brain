import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Message } from '../../../../types/message';
import { AIModel } from '../../../../types/ai';
import { useAI } from '../../../../contexts/AIContext';
import { useTheme } from '../../../../contexts/themeContextUtils';
import { ModernMessageList } from './ModernMessageList';
import { Settings, Bot, MessageSquare, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UnifiedInputBar } from './UnifiedInputBar';
import api from '../../../../services/api/api';

// Define interface for chat and message from backend
interface AgentChat {
    id: string;
    modelId: string;
    title: string;
    lastUpdated: string;
    isActive: boolean;
    messages: AgentMessage[];
    chatSource: string;
}

interface AgentMessage {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    status: string;
    reactions: string[];
    metadata: Record<string, unknown>;
}

// Chat history sidebar component
const ChatHistorySidebar: React.FC<{
    chats: AgentChat[];
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
    isLoading: boolean;
}> = ({ chats, currentChatId, onSelectChat, onNewChat, onDeleteChat, isLoading }) => {
    const { theme } = useTheme();

    const getBackground = () => {
        if (theme === 'dark') return 'bg-gray-800';
        if (theme === 'midnight') return 'bg-gray-900';
        if (theme === 'full-dark') return 'bg-zinc-900';
        return 'bg-gray-100';
    };

    return (
        <div className={`w-64 flex-shrink-0 border-r ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark' ? 'border-gray-700' : 'border-gray-200'} ${getBackground()} h-full overflow-y-auto custom-scrollbar`}>
            <div className="p-3">
                <button
                    onClick={onNewChat}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg mb-3
                        ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-500 hover:bg-blue-600'} 
                        text-white transition-colors`}
                >
                    <Plus size={16} />
                    <span>New Chat</span>
                </button>

                <div className="space-y-1">
                    {isLoading ? (
                        <div className="text-center py-3 text-sm text-gray-500">Loading chats...</div>
                    ) : chats.length === 0 ? (
                        <div className="text-center py-3 text-sm text-gray-500">No chats yet</div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                className={`group relative flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors
                                    ${currentChatId === chat.id
                                        ? (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                            ? 'bg-gray-700'
                                            : 'bg-gray-200')
                                        : (theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                            ? 'hover:bg-gray-700/70'
                                            : 'hover:bg-gray-200/70')
                                    }
                                `}
                                onClick={() => onSelectChat(chat.id)}
                            >
                                <MessageSquare size={16} className="flex-shrink-0 mr-2 text-gray-500" />
                                <div className="flex-1 truncate text-sm">
                                    {chat.title}
                                </div>
                                <button
                                    className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity
                                        ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                                            ? 'hover:bg-gray-600 text-gray-400 hover:text-gray-200'
                                            : 'hover:bg-gray-300 text-gray-500 hover:text-gray-700'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteChat(chat.id);
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

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

    // New state for chat management
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [chats, setChats] = useState<AgentChat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Fetch chats on component mount
    useEffect(() => {
        fetchChats();
    }, []);

    // Fetch all chats from the backend
    const fetchChats = async () => {
        try {
            setIsLoadingChats(true);
            const response = await api.get('/api/AgentChats');
            // Filter to only include chats created in Enhanced Chat or without a source (backward compatibility)
            const filteredChats = response.data.filter(
                (chat: AgentChat) => chat.chatSource === 'enhanced' || !chat.chatSource
            );
            setChats(filteredChats);
        } catch (err) {
            console.error('Failed to fetch chats:', err);
        } finally {
            setIsLoadingChats(false);
        }
    };

    // Create a new chat
    const createChat = async (modelId: string) => {
        try {
            const response = await api.post('/api/AgentChats', {
                modelId,
                title: 'New Chat', // We can update this later with first message content
                chatSource: 'enhanced' // Set the chat source
            });
            const newChat = response.data;
            setCurrentChatId(newChat.id);
            setChats(prev => [newChat, ...prev]);
            return newChat.id;
        } catch (err) {
            console.error('Failed to create chat:', err);
            throw err;
        }
    };

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

    // Update chat title based on first message
    const updateChatTitle = async (chatId: string | null, title: string) => {
        if (!chatId) return; // Early return if chatId is null

        try {
            // Note: Your API doesn't seem to have an endpoint to update chat title
            // You might need to add this endpoint to your backend
            // For now, we just update the local state
            setChats(prev =>
                prev.map(chat =>
                    chat.id === chatId
                        ? { ...chat, title: title.substring(0, 50) }
                        : chat
                )
            );
        } catch (error) {
            console.error('Failed to update chat title:', error);
        }
    };

    const handleNewChat = () => {
        setSelectedModel(initialModel);
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

        // Create a new chat if we don't have one
        let chatId = currentChatId;
        if (!chatId) {
            try {
                chatId = await createChat(selectedModel.id);
                // At this point, chatId is guaranteed to be a string from createChat
                // If this is the first message, use it to update the chat title
                await updateChatTitle(chatId, input);
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
        <div className={`w-full h-[calc(100vh-10rem)] flex rounded-xl ${getContainerBackground()} border ${getBorderColor()} shadow-lg overflow-hidden`}>
            {/* Chat Sidebar */}
            {showSidebar && (
                <ChatHistorySidebar
                    chats={chats}
                    currentChatId={currentChatId}
                    onSelectChat={loadChat}
                    onNewChat={handleNewChat}
                    onDeleteChat={deleteChat}
                    isLoading={isLoadingChats}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 p-3">
                {mainContent}
            </div>

            {/* Toggle sidebar button */}
            <button
                onClick={() => setShowSidebar(prev => !prev)}
                className={`absolute left-2 top-2 p-2 rounded-full transition-colors duration-150 
                    ${theme === 'dark' || theme === 'midnight' || theme === 'full-dark'
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-300'}`}
            >
                <MessageSquare size={18} />
            </button>
        </div>
    );
} 