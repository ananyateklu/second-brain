import React from 'react';
import { Bot, MessageSquare, X } from 'lucide-react';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { ConversationHistory } from './ConversationHistory';
import { useTheme } from '../../../../../contexts/themeContextUtils';

interface ChatInterfaceProps {
    selectedAgent: AIModel | null;
    cardClasses: string;
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    isSending: boolean;
    conversations: AgentConversation[];
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    onNewChat: () => void;
    onClose: () => void;
    getCurrentConversation: () => AgentConversation | null | undefined;
    onSendMessage: (e: React.FormEvent) => void;
    onDeleteConversation: (id: string) => void;
}

const getContainerBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-900/30';
    if (theme === 'midnight') return 'bg-[#1e293b]/30';
    if (theme === 'full-dark') return 'bg-[rgba(var(--color-surface-rgb),0.8)]';
    return 'bg-[color-mix(in_srgb,var(--color-background)_80%,var(--color-surface))]';
};

export const ChatInterface = ({
    selectedAgent,
    cardClasses,
    currentMessage,
    setCurrentMessage,
    isSending,
    conversations,
    setConversations,
    messagesEndRef,
    onNewChat,
    onClose,
    getCurrentConversation,
    onSendMessage,
    onDeleteConversation
}: ChatInterfaceProps) => {
    const { theme } = useTheme();

    if (!selectedAgent) {
        return (
            <div className={`h-full flex items-center justify-center ${cardClasses} border border-[var(--color-border)]`}>
                <div className="text-center">
                    <MessageSquare className="w-10 h-10 text-[var(--color-textSecondary)] mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">
                        Select an Agent
                    </h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                        Choose an AI agent from the left to start a conversation
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${cardClasses} border border-[var(--color-border)]`}>
            {/* Chat Header */}
            <div className={`
                shrink-0 p-3 border-b border-[var(--color-border)] flex items-center justify-between
                ${getContainerBackground(theme)}
                backdrop-blur-xl
                relative z-[10]
            `}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg border border-[var(--color-border)]" style={{ backgroundColor: `${selectedAgent.color}20` }}>
                        <Bot className="w-4 h-4" style={{ color: selectedAgent.color }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-[var(--color-text)]">{selectedAgent.name}</h3>
                        <p className="text-xs text-[var(--color-textSecondary)]">{selectedAgent.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onNewChat}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-[var(--color-surface)]/50 backdrop-blur-sm text-[var(--color-textSecondary)] border border-[var(--color-border)] hover:bg-[var(--color-surfaceHover)] hover:border-[var(--color-textSecondary)] transition-colors"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>New Chat</span>
                    </button>
                    <div className="relative" style={{ zIndex: 50 }}>
                        <ConversationHistory
                            conversations={conversations}
                            selectedAgent={selectedAgent}
                            onSelect={(conv) => {
                                setConversations(prev => prev.map(c =>
                                    c.id === conv.id ? { ...c, isActive: true } : { ...c, isActive: false }
                                ));
                            }}
                            onDelete={onDeleteConversation}
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md bg-[var(--color-surface)]/50 backdrop-blur-sm hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] border border-[var(--color-border)] hover:border-[var(--color-textSecondary)] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 flex flex-col">
                <ChatMessages
                    conversation={typeof getCurrentConversation === 'function' ? getCurrentConversation() : undefined}
                    isSending={isSending}
                    selectedAgent={selectedAgent}
                    setConversations={setConversations}
                    messagesEndRef={messagesEndRef}
                />
            </div>

            {/* Input */}
            <MessageInput
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                isSending={isSending}
                onSubmit={onSendMessage}
            />
        </div>
    );
};