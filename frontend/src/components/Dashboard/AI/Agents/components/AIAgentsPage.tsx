import React from 'react';
import { Bot, Settings, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAI } from '../../../../../contexts/AIContext';
import { useTheme } from '../../../../../contexts/themeContextUtils';
import { AIModel } from '../../../../../types/ai';
import { useAgentState } from '../hooks/useAgentState';
import { AgentSelection } from './AgentSelection';
import { ChatInterface } from './ChatInterface';
import { handleAgentSelect, handleNewConversation, getCurrentConversation, handleSendMessage, handleDeleteConversation } from '../utils/handlers';

export function AIAgentsPage() {
    const { theme } = useTheme();
    const { availableModels, isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured, isLlamaConfigured, sendMessage } = useAI();
    const {
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
    } = useAgentState(availableModels);

    const handleAgentSelectWrapper = (model: AIModel) => {
        handleAgentSelect(model, conversations, setConversations, setSelectedAgent, navigate);
    };

    const handleNewConversationWrapper = () => {
        handleNewConversation(selectedAgent, setConversations);
    };

    const getCurrentConversationWrapper = () => {
        return getCurrentConversation(selectedAgent, conversations);
    };

    const handleSendMessageWrapper = async (e: React.FormEvent) => {
        await handleSendMessage({
            e,
            selectedAgent,
            currentMessage,
            setCurrentMessage,
            setIsSending,
            setConversations,
            sendMessage,
            isSending
        });
    };

    const handleDeleteConversationWrapper = (conversationId: string) => {
        handleDeleteConversation(conversationId, selectedAgent, setConversations);
    };

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-[#1e293b]/30';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const cardClasses = `
        relative 
        overflow-hidden 
        rounded-2xl 
        ${getContainerBackground()}
        backdrop-blur-xl 
        border-[0.5px] 
        border-white/10
        shadow-[4px_0_24px_-2px_rgba(0,0,0,0.12),8px_0_16px_-4px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3),8px_0_16px_-4px_rgba(0,0,0,0.2)]
        ring-1
        ring-white/5
        transition-all 
        duration-300
    `;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
                <div className="flex items-center gap-2">
                    <Loader className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
                    <span className="text-[var(--color-textSecondary)]">Loading agents...</span>
                </div>
            </div>
        );
    }

    if (!isOpenAIConfigured && !isGeminiConfigured && !isAnthropicConfigured && !isLlamaConfigured) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] gap-4">
                <Bot className="w-16 h-16 text-[var(--color-textSecondary)]" />
                <h2 className="text-xl font-semibold text-[var(--color-text)]">
                    AI Agents Not Configured
                </h2>
                <p className="text-[var(--color-textSecondary)] text-center max-w-md">
                    Please configure your API keys in settings to use AI agents.
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
        <div className="w-full px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-extrabold text-[var(--color-text)] mb-4">
                    AI Agents
                </h1>
                <p className="text-lg text-[var(--color-textSecondary)] mb-6">
                    Select an AI agent to help you with specific tasks
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <AgentSelection
                    selectedProvider={selectedProvider}
                    setSelectedProvider={setSelectedProvider}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    groupedModels={groupedModels}
                    filteredAgents={filteredAgents}
                    selectedAgent={selectedAgent}
                    onAgentSelect={handleAgentSelectWrapper}
                    cardClasses={cardClasses}
                />

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-4"
                >
                    <ChatInterface
                        selectedAgent={selectedAgent}
                        cardClasses={cardClasses}
                        currentMessage={currentMessage}
                        setCurrentMessage={setCurrentMessage}
                        isSending={isSending}
                        conversations={conversations}
                        setConversations={setConversations}
                        messagesEndRef={messagesEndRef}
                        onNewChat={handleNewConversationWrapper}
                        onClose={() => setSelectedAgent(null)}
                        getCurrentConversation={getCurrentConversationWrapper}
                        onSendMessage={handleSendMessageWrapper}
                        onDeleteConversation={handleDeleteConversationWrapper}
                    />
                </motion.div>
            </div>
        </div>
    );
} 