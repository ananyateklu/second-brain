import React from 'react';
import { Bot, MessageSquare, X } from 'lucide-react';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import { ChatMessages } from './ChatMessages';
import { MessageInput } from './MessageInput';
import { ConversationHistory } from './ConversationHistory';

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
    if (!selectedAgent) {
        return (
            <div className={`h-[calc(100vh-20rem)] flex items-center justify-center ${cardClasses}`}>
                <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                        Select an Agent
                    </h3>
                    <p className="text-[var(--color-textSecondary)]">
                        Choose an AI agent from the left to start a conversation
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-[calc(100vh-20rem)] flex flex-col ${cardClasses}`}>
            {/* Chat Header */}
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${selectedAgent.color}20` }}>
                        <Bot className="w-5 h-5" style={{ color: selectedAgent.color }} />
                    </div>
                    <div>
                        <h3 className="font-medium text-[var(--color-text)]">{selectedAgent.name}</h3>
                        <p className="text-xs text-[var(--color-textSecondary)]">{selectedAgent.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onNewChat}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)] border border-[var(--color-border)]"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>New Chat</span>
                    </button>
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
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--color-surfaceHover)] text-[var(--color-textSecondary)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <ChatMessages
                conversation={getCurrentConversation()}
                isSending={isSending}
                selectedAgent={selectedAgent}
                setConversations={setConversations}
                messagesEndRef={messagesEndRef}
            />

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