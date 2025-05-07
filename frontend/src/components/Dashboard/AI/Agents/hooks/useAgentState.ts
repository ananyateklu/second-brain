import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import {
    loadConversationsFromStorage,
    loadSelectedAgentFromStorage,
    loadSelectedProviderFromStorage,
    saveConversationsToStorage
} from '../utils/storage';
import { agentService } from '../../../../../services/ai/agent';

export const useAgentState = (availableModels: AIModel[]) => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Filter only agent models
    const agentModels = availableModels.filter(model => model.category === 'agent');

    // Group models by provider
    const groupedModels = agentModels.reduce((acc, model) => {
        const provider = model.provider.charAt(0).toUpperCase() + model.provider.slice(1);
        if (!acc[provider]) {
            acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
    }, {} as Record<string, AIModel[]>);

    // Initialize states that depend on groupedModels
    const [selectedProvider, setSelectedProvider] = useState<string | null>(() => {
        const providers = Object.keys(groupedModels);
        return loadSelectedProviderFromStorage(providers);
    });

    const [selectedAgent, setSelectedAgent] = useState<AIModel | null>(() =>
        loadSelectedAgentFromStorage(availableModels)
    );

    const [conversations, setConversations] = useState<AgentConversation[]>(() =>
        loadConversationsFromStorage()
    );

    useEffect(() => {
        // Simulate loading state
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversations]);

    // Save conversations whenever they change
    useEffect(() => {
        saveConversationsToStorage(conversations);
    }, [conversations]);

    // Save selected agent
    useEffect(() => {
        if (selectedAgent) {
            localStorage.setItem('ai_selected_agent', selectedAgent.id);
        } else {
            localStorage.removeItem('ai_selected_agent');
        }
    }, [selectedAgent]);

    // Save selected provider
    useEffect(() => {
        if (selectedProvider) {
            localStorage.setItem('ai_selected_provider', selectedProvider);
        } else {
            localStorage.removeItem('ai_selected_provider');
        }
    }, [selectedProvider]);

    // Clear selected agent when provider changes
    useEffect(() => {
        setSelectedAgent(null);
    }, [selectedProvider]);

    // Filter agents based on search
    const filteredAgents = selectedProvider && groupedModels[selectedProvider]
        ? groupedModels[selectedProvider].filter(model =>
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            model.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    // Replace localStorage loading with API calls
    useEffect(() => {
        const loadChats = async () => {
            try {
                setIsLoading(true);
                const chats = await agentService.loadChats();

                // Filter chats to only include those created from Agents page or those without chatSource (for backward compatibility)
                const filteredChats = chats.filter(chat =>
                    chat.chatSource === 'agents' || !chat.chatSource);

                // Map database chats to AgentConversation type
                const conversations = filteredChats.map(chat => ({
                    id: chat.id,
                    messages: chat.messages.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    })),
                    model: availableModels.find(m => m.id === chat.modelId)!,
                    isActive: chat.isActive,
                    lastUpdated: new Date(chat.lastUpdated),
                    title: chat.title,
                    chatSource: chat.chatSource
                }));

                setConversations(conversations);
            } catch (error) {
                console.error('Error loading chats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadChats();
    }, [availableModels]);

    // Create a welcome message to add to new agent conversations
    const handleWelcomeMessage = async (chatId: string, agent: AIModel) => {
        try {
            // Create a welcome message based on the agent
            const welcomeMessage = {
                role: 'assistant' as const,
                content: `Hello! I'm ${agent.name}. How can I assist you today?`,
                status: 'sent' as const
            };

            // Add the message to the conversation
            const addedMessage = await agentService.addMessage(chatId, welcomeMessage);

            // Update the conversation in state
            setConversations(prevConversations =>
                prevConversations.map(conv => {
                    if (conv.id === chatId) {
                        return {
                            ...conv,
                            messages: [...conv.messages, {
                                ...addedMessage,
                                timestamp: new Date(addedMessage.timestamp)
                            }]
                        };
                    }
                    return conv;
                })
            );
        } catch (error) {
            console.error('Error adding welcome message:', error);
        }
    };

    const handleNewConversation = useCallback(async (selectedAgent: AIModel) => {
        try {
            const isAgentCategory = selectedAgent.category === 'agent';
            const title = `${selectedAgent.name} Chat`;

            const newChat = await agentService.createChat(
                selectedAgent.id,
                title,
                'agents' // Set the chat source to 'agents'
            );

            const newConversation: AgentConversation = {
                id: newChat.id,
                messages: [],
                model: selectedAgent,
                isActive: true,
                lastUpdated: new Date(),
                title,
                chatSource: 'agents'
            };

            setConversations(prevConversations => [
                newConversation,
                ...prevConversations.map(conv => ({ ...conv, isActive: false }))
            ]);

            // If agent type, send a welcome message
            if (isAgentCategory) {
                await handleWelcomeMessage(newChat.id, selectedAgent);
            }
        } catch (error) {
            console.error('Error creating new conversation:', error);
        }
    }, []);

    return {
        isLoading,
        currentMessage,
        setCurrentMessage,
        isSending,
        setIsSending,
        searchQuery,
        setSearchQuery,
        messagesEndRef,
        selectedProvider,
        setSelectedProvider,
        selectedAgent,
        setSelectedAgent,
        conversations,
        setConversations,
        groupedModels,
        filteredAgents,
        navigate,
        handleNewConversation
    };
}; 