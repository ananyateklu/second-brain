import { useState, useEffect, useCallback } from 'react';
import perplexityService, { PerplexityMessage } from '../../../services/ai/perplexityService';
import { PERPLEXITY_MODELS } from '../../../services/ai/perplexityModels';
import { AgentChat, AgentMessage } from '../../../types/agent';

// Component imports
import { ConversationsList } from './ConversationsList';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

export function PerplexityPage() {
    const [currentMessage, setCurrentMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [conversations, setConversations] = useState<AgentChat[]>([]);
    const [selectedModel, setSelectedModel] = useState(PERPLEXITY_MODELS[0]);

    // Function to handle prompt selection
    const handlePromptSelect = (prompt: string) => {
        setCurrentMessage(prompt);
    };

    const handleNewChat = useCallback(async () => {
        try {
            const newChat = await perplexityService.createChat(
                selectedModel.id,
                `Perplexity ${selectedModel.name} Chat`
            );

            setConversations(prev => [
                { ...newChat, isActive: true },
                ...prev.map(chat => ({ ...chat, isActive: false }))
            ]);

            setCurrentMessage('');
        } catch (error) {
            console.error('Error creating new chat:', error);
        }
    }, [selectedModel]);

    // Get container background based on unified theme
    const getContainerBackground = () => {
        return 'bg-[var(--chatInterfaceBackground)] backdrop-blur-xl';
    };

    // Get border color based on unified theme
    const getBorderColor = () => {
        return 'border-white/10 dark:border-white/10 midnight:border-white/10 border-[0.5px]';
    };

    // Load conversations on initial render
    useEffect(() => {
        const loadChats = async () => {
            try {
                const chats = await perplexityService.loadChats();
                if (chats.length > 0) {
                    // Set all chats to inactive first
                    const inactiveChats = chats.map(chat => ({ ...chat, isActive: false }));
                    // Set the first chat as active
                    inactiveChats[0].isActive = true;
                    setConversations(inactiveChats);
                } else {
                    // Create a new chat if no chats exist
                    await handleNewChat();
                }
            } catch (error) {
                console.error('Error loading chats:', error);
            }
        };

        // Check connection status
        const checkConnection = async () => {
            const connected = await perplexityService.testConnection();
            setIsConnected(connected);
        };

        loadChats();
        checkConnection();
    }, [handleNewChat]);

    const getCurrentConversation = () => {
        return conversations.find(conv => conv.isActive);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentMessage.trim() || isSending) return;

        const activeConversation = getCurrentConversation();
        if (!activeConversation) {
            await handleNewChat();
            return;
        }

        // Add user message to chat
        const userMessage: Omit<AgentMessage, 'id' | 'timestamp'> = {
            role: 'user',
            content: currentMessage,
            status: 'sent'
        };

        try {
            setIsSending(true);

            // Save user message to DB
            const savedUserMessage = await perplexityService.addMessage(
                activeConversation.id,
                userMessage
            );

            // Update UI with user message
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id === activeConversation.id) {
                        return {
                            ...conv,
                            messages: [...conv.messages, savedUserMessage],
                            lastUpdated: new Date().toISOString()
                        };
                    }
                    return conv;
                })
            );

            // Clear message input
            setCurrentMessage('');

            // Build the previous messages array for context
            const previousMessages: PerplexityMessage[] = activeConversation.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Get AI response
            const aiResponse = await perplexityService.sendMessage(
                currentMessage,
                selectedModel.id,
                previousMessages
            );

            // Create AI message to save
            const assistantMessage: Omit<AgentMessage, 'id' | 'timestamp'> = {
                role: 'assistant',
                content: aiResponse.content,
                status: 'sent',
                metadata: aiResponse.metadata
            };

            // Save AI message to DB
            const savedAssistantMessage = await perplexityService.addMessage(
                activeConversation.id,
                assistantMessage
            );

            // Update UI with AI message
            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id === activeConversation.id) {
                        return {
                            ...conv,
                            messages: [...conv.messages, savedAssistantMessage],
                            lastUpdated: new Date().toISOString()
                        };
                    }
                    return conv;
                })
            );
        } catch (error) {
            console.error('Error sending message:', error);

            // Show error in UI
            const errorMessage: AgentMessage = {
                id: 'temp-error',
                timestamp: new Date().toISOString(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.',
                status: 'error'
            };

            setConversations(prev =>
                prev.map(conv => {
                    if (conv.id === activeConversation.id) {
                        return {
                            ...conv,
                            messages: [...conv.messages, errorMessage],
                            lastUpdated: new Date().toISOString()
                        };
                    }
                    return conv;
                })
            );
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteConversation = async (id: string) => {
        try {
            // Copy current conversations to track if we're deleting the last one
            const isLastConversation = conversations.length === 1;

            // Delete the chat from the backend
            await perplexityService.deleteChat(id);

            // If it's the last conversation, we need to create a new one first
            // before removing the old one to avoid UI flicker
            if (isLastConversation) {
                await handleNewChat();
                // Now remove the deleted conversation from state
                setConversations(prev => prev.filter(conv => conv.id !== id));
            } else {
                const remainingConversations = conversations.filter(conv => conv.id !== id);
                // If deleted conversation was active, set first conversation as active
                if (conversations.find(conv => conv.id === id)?.isActive) {
                    remainingConversations[0].isActive = true;
                }
                setConversations(remainingConversations);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    };

    const handleSelectConversation = (id: string) => {
        setConversations(prev => prev.map(conv => ({
            ...conv,
            isActive: conv.id === id
        })));
    };

    const handleSelectModel = (modelId: string) => {
        const model = PERPLEXITY_MODELS.find(m => m.id === modelId);
        if (model) {
            setSelectedModel(model);
        }
    };

    return (
        <div className="w-full h-[calc(100vh-9rem)] flex flex-col overflow-hidden p-2">
            {/* Main Chat UI */}
            <div className={`flex-1 flex h-full max-h-full min-h-0 overflow-hidden rounded-xl shadow-md border ${getBorderColor()} backdrop-blur-xl`}>
                {/* Sidebar - No separate border or rounded corners */}
                <div className={`w-60 flex-shrink-0 border-r ${getBorderColor()} overflow-hidden`}>
                    <ConversationsList
                        conversations={conversations}
                        onNewChat={handleNewChat}
                        onSelectConversation={handleSelectConversation}
                        onDeleteConversation={handleDeleteConversation}
                        isConnected={isConnected}
                    />
                </div>

                {/* Main Chat - No separate border */}
                <div className={`
                    flex-1
                    flex 
                    flex-col 
                    h-full 
                    max-h-full
                    overflow-hidden
                    ${getContainerBackground()} 
                `}>
                    {/* Chat Header & Messages */}
                    <ChatMessages
                        activeConversation={getCurrentConversation()}
                        selectedModel={selectedModel}
                        isSending={isSending}
                        onPromptSelect={handlePromptSelect}
                    />

                    {/* Input */}
                    <ChatInput
                        currentMessage={currentMessage}
                        setCurrentMessage={setCurrentMessage}
                        onSendMessage={handleSendMessage}
                        isSending={isSending}
                        selectedModelId={selectedModel.id}
                        onSelectModel={handleSelectModel}
                    />
                </div>
            </div>
        </div>
    );
}