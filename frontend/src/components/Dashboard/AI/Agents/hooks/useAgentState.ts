import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import {
    loadConversationsFromStorage,
    loadSelectedAgentFromStorage,
    loadSelectedProviderFromStorage,
    saveConversationsToStorage
} from '../utils/storage';

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
        navigate
    };
}; 