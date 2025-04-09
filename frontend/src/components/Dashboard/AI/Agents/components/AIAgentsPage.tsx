import React from 'react';
import { Bot, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAI } from '../../../../../contexts/AIContext';
import { useTheme } from '../../../../../contexts/themeContextUtils';
import { AIModel } from '../../../../../types/ai';
import { useAgentState } from '../hooks/useAgentState';
import { AgentSelection } from './AgentSelection';
import { ChatInterface } from './ChatInterface';
import { handleAgentSelect, handleNewConversation, getCurrentConversation, handleSendMessage, handleDeleteConversation } from '../utils/handlers';
import { getBotIcon } from '../utils/iconUtils';
import { LoadingContent } from '../../Messages/LoadingContent';

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

    const handleAgentSelectWrapper = async (model: AIModel) => {
        try {
            await handleAgentSelect(model, conversations, setConversations, setSelectedAgent, navigate);
        } catch (error) {
            console.error('Error selecting agent:', error);
        }
    };

    const handleNewConversationWrapper = () => {
        handleNewConversation(selectedAgent, setConversations);
    };

    const getCurrentConversationWrapper = () => {
        return selectedAgent && selectedAgent.id
            ? getCurrentConversation(selectedAgent.id, conversations)
            : undefined;
    };

    const handleSendMessageWrapper = (e: React.FormEvent) => {
        handleSendMessage({
            e,
            selectedAgent,
            currentMessage,
            setCurrentMessage,
            setIsSending,
            setConversations,
            sendMessage,
            isSending,
            conversations
        });
    };

    const handleDeleteConversationWrapper = (conversationId: string) => {
        handleDeleteConversation(conversationId, selectedAgent, setConversations);
    };

    const getContainerBackground = () => {
        if (theme === 'dark') return 'bg-gray-900/30';
        if (theme === 'midnight') return 'bg-white/5';
        if (theme === 'full-dark') return 'bg-[rgba(var(--color-surface-rgb),0.8)]';
        return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
    };

    const getBorderColor = () => {
        if (theme === 'midnight') return 'border-[#334155]';
        if (theme === 'dark') return 'border-[#1e293b]';
        if (theme === 'full-dark') return 'border-[rgba(var(--color-border-rgb),0.5)]';
        return 'border-[var(--color-border)]';
    };

    const cardClasses = `
        relative 
        overflow-hidden 
        rounded-xl
        ${getContainerBackground()}
        backdrop-blur-xl 
        border
        ${getBorderColor()}
        shadow-[0_8px_16px_rgba(0,0,0,0.08)]
        dark:shadow-[0_8px_16px_rgba(0,0,0,0.3)]
        transition-all 
        duration-300
    `;

    const getTitleIcon = () => {
        if (!selectedProvider) return Bot;
        return getBotIcon(selectedProvider);
    };

    const getProviderColor = (provider: string) => {
        const providerLower = provider.toLowerCase();
        if (providerLower.includes('gemini') || providerLower.includes('google')) {
            return '#4285F4'; // Google Blue
        } else if (providerLower.includes('openai') || providerLower.includes('gpt')) {
            return '#3B7443'; // OpenAI Forest Green
        } else if (providerLower.includes('anthropic') || providerLower.includes('claude')) {
            return '#F97316'; // Anthropic Orange
        } else if (providerLower.includes('llama') || providerLower.includes('meta')) {
            return '#8B5CF6'; // Llama Purple
        } else if (providerLower.includes('grok') || providerLower.includes('x.ai')) {
            return '#1DA1F2'; // X/Twitter Blue
        }
        return 'var(--color-accent)';
    };

    const getTitleColor = () => {
        if (selectedAgent) {
            return selectedAgent.color;
        }
        if (selectedProvider) {
            return getProviderColor(selectedProvider);
        }
        return 'var(--color-accent)';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-13rem)]">
                <div className="w-80">
                    <LoadingContent type="text" themeColor="var(--color-accent)" />
                </div>
            </div>
        );
    }

    if (!isOpenAIConfigured && !isGeminiConfigured && !isAnthropicConfigured && !isLlamaConfigured) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-13rem)] gap-4">
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
        <div className="w-full h-[calc(100vh-9rem)] flex flex-col overflow-visible">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                variants={{
                    hidden: { opacity: 0, y: -20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
                }}
                className={`
                    relative 
                    overflow-hidden 
                    rounded-xl
                    ${getContainerBackground()}
                    backdrop-blur-xl 
                    border
                    ${getBorderColor()}
                    shadow-[0_8px_16px_rgba(0,0,0,0.08)]
                    dark:shadow-[0_8px_16px_rgba(0,0,0,0.3)]
                    transition-all 
                    duration-300 
                    p-4
                    mb-8
                    z-[1]
                `}
            >
                <div className="relative flex items-center gap-3">
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg backdrop-blur-sm border border-[var(--color-border)]"
                        style={{
                            backgroundColor: `${getTitleColor()}15`,
                        }}
                    >
                        {React.createElement(getTitleIcon(), {
                            className: "w-5 h-5",
                            style: { color: getTitleColor() }
                        })}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--color-text)]">AI Agents</h1>
                        <p className="mt-0.5 text-sm text-[var(--color-textSecondary)]">
                            Select an AI agent to help you with specific tasks
                        </p>
                    </div>
                </div>
            </motion.div>

            <div className="flex-1 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full relative">
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
                        getBorderColor={getBorderColor}
                    />

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-4 h-full relative"
                        style={{ zIndex: 2 }}
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
        </div>
    );
} 